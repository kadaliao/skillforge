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
  preferences?: string[];
}

export async function generateSkillTreeStream(
  input: SkillTreeGenerationInput,
  onProgress: (chunk: string) => void
): Promise<SkillTreeResponse> {
  const prompt = `You are an expert learning path designer. Generate a skill tree SKELETON (structure only, no tasks yet).

User Goal: ${input.goal}
Current Level: ${input.currentLevel}
Weekly Time Available: ${input.weeklyHours} hours
Preferences: ${input.preferences?.join(', ') || 'None specified'}

Create a skill tree skeleton with the following requirements:

1. Break down the main goal into 12-15 individual skills
2. Each skill should be achievable in 1-3 weeks
3. Define clear prerequisite relationships between skills (this is CRITICAL)
4. Assign difficulty ratings (1-10) and estimated hours
5. Calculate XP rewards based on difficulty and time investment (difficulty * estimatedHours * 10)
6. Categorize skills into logical groups (e.g., Frontend, Backend, DevOps)
7. Provide 2-3 learning resource recommendations per skill

Important:
- Skills should progress from easier to harder
- Prerequisite skills must come before dependent skills in the array
- First 2-3 skills should have no prerequisites (entry points)
- Difficulty should gradually increase (start at 1-3, end at 7-10)
- DO NOT generate tasks - tasks will be generated later when user clicks on a skill

CRITICAL: Return ONLY valid JSON matching this EXACT structure (no markdown, no extra text):

{
  "treeName": "string - name of the learning path",
  "domain": "string - the domain (e.g., Web Development, Data Science)",
  "description": "string - brief description of what the learner will achieve",
  "estimatedDuration": "string - total time estimate (e.g., '6 months', '1 year')",
  "skills": [
    {
      "name": "string - concise skill name (2-4 words)",
      "description": "string - what this skill teaches (1-2 sentences)",
      "category": "string - category/group name",
      "estimatedHours": number,
      "difficulty": number (1-10),
      "prerequisites": ["array of skill names that must be completed first - BE PRECISE"],
      "resources": ["2-3 specific learning resources with URLs or book names"],
      "xpReward": number (difficulty * estimatedHours * 10)
    }
  ]
}

Example skill structure:
{
  "name": "React Fundamentals",
  "description": "Learn React components, state management, and hooks for building interactive UIs.",
  "category": "Frontend",
  "estimatedHours": 20,
  "difficulty": 4,
  "prerequisites": ["JavaScript ES6+", "HTML & CSS Basics"],
  "resources": ["React Official Docs (react.dev)", "Frontend Masters React Course", "Build a Todo App Tutorial"],
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
