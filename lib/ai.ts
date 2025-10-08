import OpenAI from 'openai';
import { z } from 'zod';

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL, // 支持自定义 endpoint
  timeout: 15 * 60 * 1000, // 15 minutes (DeepSeek can be slow)
  maxRetries: 2,
});

// Zod schemas for structured outputs
const TaskSchema = z.object({
  title: z.string(),
  description: z.string(),
  type: z.enum(['PRACTICE', 'PROJECT', 'STUDY', 'CHALLENGE', 'MILESTONE']),
  xpReward: z.number(),
  estimatedHours: z.number().optional(),
});

const SkillNodeSchema = z.object({
  name: z.string(),
  description: z.string(),
  category: z.string(),
  estimatedHours: z.number(),
  difficulty: z.number().min(1).max(10),
  prerequisites: z.array(z.string()),
  resources: z.array(z.string()).optional(),
  xpReward: z.number(),
  tasks: z.array(TaskSchema).optional(), // Tasks now optional - will be generated on-demand
});

const SkillTreeResponseSchema = z.object({
  treeName: z.string(),
  domain: z.string(),
  description: z.string(),
  estimatedDuration: z.string(),
  skills: z.array(SkillNodeSchema),
});

export type SkillNode = z.infer<typeof SkillNodeSchema>;
export type SkillTreeResponse = z.infer<typeof SkillTreeResponseSchema>;

export interface SkillTreeGenerationInput {
  goal: string;
  currentLevel: 'beginner' | 'intermediate' | 'advanced';
  weeklyHours: number;
  preferences?: string[]; // Legacy field, kept for backward compatibility

  // Personalization fields (natural language input)
  userBackground?: string;      // User's professional/educational background
  existingSkills?: string;      // Skills already mastered (free-form text)
  learningPreferences?: string; // Learning goals, style preferences, constraints
}

export async function generateSkillTreeStream(
  input: SkillTreeGenerationInput,
  onProgress: (chunk: string) => void
): Promise<SkillTreeResponse> {
  // Build personalized context sections
  const backgroundSection = input.userBackground
    ? `
【用户背景】
${input.userBackground}

📊 分析要点：
- 识别已有知识储备（如：计算机专业 → 有编程基础）
- 识别职业方向（如：前端工程师 → 熟悉 Web 技术栈）
- 识别经验水平（如：3年经验 → 可跳过入门内容）
`
    : '';

  const skillsSection = input.existingSkills
    ? `
【已掌握技能】
${input.existingSkills}

✨ 处理要求：
- 从技能列表中识别相关技术（如："会 React" → 跳过 React 基础）
- 识别技能水平（如："精通 JS" vs "了解 JS"）
- 基于已有技能调整起点难度
`
    : '';

  const preferencesSection = input.learningPreferences
    ? `
【学习偏好与约束】
${input.learningPreferences}

🎯 个性化要点：
- 学习风格（如："喜欢视频" → 推荐 YouTube/Udemy 资源）
- 预算限制（如："免费资源" → 避免推荐付费课程）
- 时间约束（如："晚上学习" → 推荐短视频而非长课程）
- 学习目的（如："转行" → 强调项目经验和作品集）
`
    : '';

  const prompt = `你是专业学习路径设计师。请基于以下**多维度信息**生成个性化学习路径。

═══════════════════════════════════════════
【核心目标】
${input.goal}

【基础信息】
- 当前水平: ${input.currentLevel}
- 每周时间: ${input.weeklyHours}小时
${backgroundSection}${skillsSection}${preferencesSection}
═══════════════════════════════════════════

【生成要求】

🎯 **个性化策略**：
1. **智能起点**：根据背景和已有技能，设置合适的起始难度
   - 如果用户已掌握相关技能，直接从进阶内容开始
   - 如果是转行新手，从基础概念讲起
2. **跳过冗余**：用户明确表示已掌握的技能不要重复教
3. **资源匹配**：根据偏好推荐对应类型的学习资源
   - 喜欢视频 → YouTube, Udemy, 中国大学MOOC
   - 喜欢文档 → 官方文档, MDN, 技术博客
   - 喜欢项目 → GitHub 项目, 实战教程
4. **目标导向**：根据学习目的优化路径
   - 转行 → 强调项目作品集
   - 晋升 → 强调深度和系统性
   - 兴趣 → 强调趣味性和成就感

📋 **技术要求**：
1. 将目标分解为 12-15 个技能节点
2. 每个技能 1-3 周可完成
3. 定义清晰的前置依赖关系（这是关键！）
4. 分配难度评级 (1-10) 和预估学时
5. 计算 XP 奖励: difficulty × estimatedHours × 10
6. 分类技能（如：前端、后端、工具链）
7. 每个技能推荐 2-3 个学习资源

⚠️ **约束条件**：
- 技能难度渐进（1-3 起步，7-10 收尾）
- 前置技能必须在依赖技能之前
- 前 2-3 个技能无前置依赖（入口点）
- **不要生成任务** - 任务稍后由用户点击时生成

═══════════════════════════════════════════
【返回格式】

返回纯 JSON（无 markdown，无额外文本）：

{
  "treeName": "学习路径名称",
  "domain": "领域（如：Web 开发、数据科学）",
  "description": "简要描述学习者将达成的目标",
  "estimatedDuration": "总时长估算（如：'6个月'、'1年'）",
  "skills": [
    {
      "name": "技能名称（2-4个词）",
      "description": "该技能教什么（1-2句话）",
      "category": "分类/组名",
      "estimatedHours": 学时数,
      "difficulty": 难度(1-10),
      "prerequisites": ["前置技能名称数组 - 必须精确"],
      "resources": ["2-3个具体学习资源（URL或书名）"],
      "xpReward": XP奖励值
    }
  ]
}

【示例】
{
  "name": "React 基础",
  "description": "学习 React 组件、状态管理和 Hooks，构建交互式界面。",
  "category": "前端",
  "estimatedHours": 20,
  "difficulty": 4,
  "prerequisites": ["JavaScript ES6+", "HTML & CSS 基础"],
  "resources": ["React 官方文档 (react.dev)", "Frontend Masters React 课程", "构建 Todo 应用教程"],
  "xpReward": 800
}`;

  console.log('\n=== AI STREAMING REQUEST START ===');
  console.log('Model:', process.env.OPENAI_MODEL || 'gpt-4o');
  console.log('Input:', JSON.stringify(input, null, 2));

  let fullContent = '';

  try {
    const startTime = Date.now();
    onProgress('🤖 Starting AI generation...\n');

    const stream = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are a learning path designer. Always respond with valid, complete JSON. Ensure all arrays and objects are properly closed.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: parseInt(process.env.OPENAI_MAX_TOKENS || '16384'), // High limit for long skill trees
      stream: true,
    });

    let lastProgressTime = Date.now();

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content || '';
      if (delta) {
        fullContent += delta;

        // Send progress every 500ms to avoid flooding
        const now = Date.now();
        if (now - lastProgressTime > 500) {
          const tokenCount = fullContent.length / 4; // Rough estimate
          onProgress(`📝 Generating... (~${Math.floor(tokenCount)} tokens)\n`);
          lastProgressTime = now;
        }
      }
    }

    const duration = Date.now() - startTime;
    onProgress(`✅ Generation complete (${duration}ms)\n`);
    onProgress('🔍 Parsing and validating...\n');

    // Extract JSON from markdown code blocks or raw content
    let jsonContent = fullContent.trim();

    // Method 1: Try to extract from markdown code blocks
    const codeBlockMatch = jsonContent.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (codeBlockMatch) {
      jsonContent = codeBlockMatch[1].trim();
      onProgress(`📦 Extracted from markdown code block\n`);
    }
    // Method 2: Find content between first { and last }
    else {
      const firstBrace = jsonContent.indexOf('{');
      const lastBrace = jsonContent.lastIndexOf('}');

      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        jsonContent = jsonContent.substring(firstBrace, lastBrace + 1);
        onProgress(`📦 Extracted JSON from position ${firstBrace} to ${lastBrace}\n`);
      }
    }

    onProgress(`📄 Final JSON length: ${jsonContent.length} chars\n`);

    // Try to fix common JSON issues before parsing
    let parsed;
    try {
      parsed = JSON.parse(jsonContent);
    } catch (parseError) {
      onProgress(`⚠️ Initial parse failed, attempting to fix JSON...\n`);

      // Common fixes for incomplete JSON
      let fixedJson = jsonContent;

      // Remove trailing comma in arrays/objects
      fixedJson = fixedJson.replace(/,(\s*[}\]])/g, '$1');

      // Count braces and brackets to determine what's missing
      const openBraces = (fixedJson.match(/{/g) || []).length;
      const closeBraces = (fixedJson.match(/}/g) || []).length;
      const openBrackets = (fixedJson.match(/\[/g) || []).length;
      const closeBrackets = (fixedJson.match(/]/g) || []).length;

      // Add missing closing brackets/braces
      if (openBrackets > closeBrackets) {
        fixedJson += ']'.repeat(openBrackets - closeBrackets);
        onProgress(`🔧 Added ${openBrackets - closeBrackets} missing ']'\n`);
      }
      if (openBraces > closeBraces) {
        fixedJson += '}'.repeat(openBraces - closeBraces);
        onProgress(`🔧 Added ${openBraces - closeBraces} missing '}'\n`);
      }

      // Try parsing again
      try {
        parsed = JSON.parse(fixedJson);
        onProgress(`✓ JSON fixed and parsed successfully\n`);
      } catch (secondError) {
        onProgress(`⚠️ Still invalid, trying aggressive repair...\n`);

        // Strategy: Find last comma before error and remove everything after
        // This removes incomplete trailing objects/arrays
        let repairAttempts = 0;
        let repairedJson = fixedJson;

        while (repairAttempts < 10) {
          const lastComma = repairedJson.lastIndexOf(',');
          if (lastComma === -1) {
            break; // No more commas to try
          }

          // Remove everything after last comma and close properly
          repairedJson = repairedJson.substring(0, lastComma);

          // Add closing brackets/braces based on what's open
          const openBraces = (repairedJson.match(/{/g) || []).length;
          const closeBraces = (repairedJson.match(/}/g) || []).length;
          const openBrackets = (repairedJson.match(/\[/g) || []).length;
          const closeBrackets = (repairedJson.match(/]/g) || []).length;

          if (openBrackets > closeBrackets) {
            repairedJson += ']'.repeat(openBrackets - closeBrackets);
          }
          if (openBraces > closeBraces) {
            repairedJson += '}'.repeat(openBraces - closeBraces);
          }

          // Try parsing
          try {
            parsed = JSON.parse(repairedJson);
            onProgress(`✓ Repaired by removing trailing elements (attempt ${repairAttempts + 1})\n`);
            break;
          } catch {
            repairAttempts++;
            continue;
          }
        }

        if (!parsed) {
          throw secondError;
        }
      }
    }
    const skillTree = SkillTreeResponseSchema.parse(parsed);

    onProgress(`✓ Validation passed - ${skillTree.skills.length} skills generated\n`);
    console.log('=== AI STREAMING REQUEST END ===\n');

    return skillTree;
  } catch (error) {
    console.error('\n❌ ERROR in generateSkillTreeStream:', error);

    if (error instanceof SyntaxError) {
      // Log the raw content for debugging
      console.error('Raw content that failed to parse:');
      console.error('---START---');
      console.error(fullContent || '(empty)');
      console.error('---END---');
    }

    onProgress(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}\n`);
    throw error;
  }
}

export async function generateSkillTree(
  input: SkillTreeGenerationInput
): Promise<SkillTreeResponse> {
  const prompt = `You are an expert learning path designer. Generate a comprehensive skill tree based on the user's goal.

User Goal: ${input.goal}
Current Level: ${input.currentLevel}
Weekly Time Available: ${input.weeklyHours} hours
Preferences: ${input.preferences?.join(', ') || 'None specified'}

Create a detailed skill tree with the following requirements:

1. Break down the main goal into 12-15 individual skills (keep it concise to avoid truncation)
2. Each skill should be achievable in 1-3 weeks
3. Define clear prerequisite relationships between skills
4. Assign difficulty ratings (1-10) and estimated hours
5. Calculate XP rewards based on difficulty and time investment (difficulty * estimatedHours * 10)
6. Include 4-6 major milestones (25%, 50%, 75%, 100% completion markers)
7. Categorize skills into logical groups (e.g., Frontend, Backend, DevOps for a full-stack goal)
8. Provide 2-3 learning resource recommendations for key skills

Important:
- Skills should progress from easier to harder
- Prerequisite skills must come before dependent skills in the array
- First 2-3 skills should have no prerequisites (entry points)
- Difficulty should gradually increase (start at 1-3, end at 7-10)
- Total estimated hours should align with the given weekly hours and duration

CRITICAL: Return ONLY valid JSON matching this EXACT structure (no markdown, no extra text):

{
  "treeName": "string - name of the learning path",
  "domain": "string - the domain (e.g., Web Development, Data Science)",
  "description": "string - brief description of what the learner will achieve",
  "estimatedDuration": "string - total time estimate (e.g., '6 months', '1 year')",
  "skills": [
    {
      "name": "string - skill name",
      "description": "string - what this skill teaches",
      "category": "string - category/group name",
      "estimatedHours": number,
      "difficulty": number (1-10),
      "prerequisites": ["array of skill names that must be completed first"],
      "resources": ["optional array of learning resources"],
      "xpReward": number (difficulty * estimatedHours * 10),
      "tasks": [
        {
          "title": "string - task title",
          "description": "string - what the user needs to do",
          "type": "PRACTICE | PROJECT | STUDY | CHALLENGE | MILESTONE",
          "xpReward": number (skill's total XP divided among tasks),
          "estimatedHours": number (optional)
        }
      ]
    }
  ]
}

Task Requirements:
- Each skill MUST have exactly 3 tasks (no more, no less)
- Tasks should be specific, actionable, and progressive
- Task types: STUDY (read/watch), PRACTICE (hands-on), PROJECT (build something), CHALLENGE (test knowledge), MILESTONE (major checkpoint)
- Distribute skill's total XP evenly among tasks (e.g., if skill has 120 XP, each task gets 40 XP)
- Task progression: STUDY → PRACTICE → PROJECT (easier to harder)`;

  // 调试日志 - 打印完整提示词
  console.log('\n=== AI REQUEST START ===');
  console.log('Model:', process.env.OPENAI_MODEL || 'gpt-4o');
  console.log('Base URL:', process.env.OPENAI_BASE_URL || 'default');
  console.log('\nInput:', JSON.stringify(input, null, 2));
  console.log('\nFull Prompt:');
  console.log('---');
  console.log(prompt);
  console.log('---\n');

  try {
    console.log('⏳ Sending request to AI...');
    const startTime = Date.now();

    const response = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are a learning path designer. Always respond with valid JSON only.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      // response_format: { type: 'json_object' }, // DeepSeek 不支持此参数，会导致请求挂起
      temperature: 0.7,
      max_tokens: parseInt(process.env.OPENAI_MAX_TOKENS || '16384'), // High limit for long skill trees
    });

    const duration = Date.now() - startTime;
    console.log(`✅ AI response received in ${duration}ms`);

    let content = response.choices[0].message.content;
    console.log('\nRaw AI Response:');
    console.log('---');
    console.log(content);
    console.log('---\n');

    if (!content) {
      throw new Error('Empty response from AI');
    }

    // 提取 markdown 代码块中的 JSON (如果有的话)
    const jsonBlockMatch = content.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (jsonBlockMatch) {
      console.log('⚠️  Detected markdown code block, extracting JSON...');
      content = jsonBlockMatch[1].trim();
    }

    // Parse and validate with Zod
    console.log('🔍 Parsing JSON...');
    const parsed = JSON.parse(content);

    console.log('✓ JSON parsed successfully');
    console.log('🔍 Validating with Zod schema...');

    const skillTree = SkillTreeResponseSchema.parse(parsed);

    console.log('✓ Validation passed');
    console.log('=== AI REQUEST END ===\n');

    return skillTree;
  } catch (error) {
    console.error('\n❌ ERROR in generateSkillTree:');
    console.error('Error type:', error?.constructor?.name);
    console.error('Error message:', error instanceof Error ? error.message : String(error));

    if (error instanceof z.ZodError) {
      console.error('Zod validation errors:', JSON.stringify(error.issues, null, 2));
    }

    console.error('Full error:', error);
    console.error('=== AI REQUEST FAILED ===\n');

    throw error instanceof Error ? error : new Error('Failed to generate skill tree');
  }
}

const TaskEvaluationSchema = z.object({
  qualityScore: z.number().min(1).max(10),
  suggestedXP: z.number(),
  feedback: z.string(),
  improvements: z.array(z.string()).optional(),
});

export type TaskEvaluation = z.infer<typeof TaskEvaluationSchema>;

export async function evaluateTaskCompletion(
  taskTitle: string,
  taskDescription: string,
  userSubmission: string,
  baseXP: number
): Promise<TaskEvaluation> {
  const prompt = `You are an expert evaluator assessing a learner's task completion.

Task: ${taskTitle}
Requirements: ${taskDescription}
User Submission: ${userSubmission}

Evaluate the submission on a scale of 1-10 and provide constructive feedback.
Adjust the XP reward based on quality (base XP: ${baseXP}).`;

  try {
    const response = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are a task evaluator. Always respond with valid JSON only.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      // response_format: { type: 'json_object' }, // DeepSeek 不支持此参数
      temperature: 0.5,
      max_tokens: 1024,
    });

    let content = response.choices[0].message.content;
    if (!content) {
      throw new Error('Empty response from AI');
    }

    // Remove markdown code blocks if present
    content = content.trim();
    const codeBlockMatch = content.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (codeBlockMatch) {
      content = codeBlockMatch[1].trim();
    }

    const parsed = JSON.parse(content);
    const evaluation = TaskEvaluationSchema.parse(parsed);

    return evaluation;
  } catch (error) {
    console.error('Error evaluating task:', error);
    throw error instanceof Error ? error : new Error('Failed to evaluate task');
  }
}
