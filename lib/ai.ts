import OpenAI from 'openai';
import { z } from 'zod';

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL, // 支持自定义 endpoint
});

// Zod schemas for structured outputs
const SkillNodeSchema = z.object({
  name: z.string(),
  description: z.string(),
  category: z.string(),
  estimatedHours: z.number(),
  difficulty: z.number().min(1).max(10),
  prerequisites: z.array(z.string()),
  resources: z.array(z.string()).optional(),
  xpReward: z.number(),
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
  const prompt = `You are an expert learning path designer. Generate a comprehensive skill tree based on the user's goal.

User Goal: ${input.goal}
Current Level: ${input.currentLevel}
Weekly Time Available: ${input.weeklyHours} hours
Preferences: ${input.preferences?.join(', ') || 'None specified'}

Create a detailed skill tree with the following requirements:

1. Break down the main goal into 15-25 individual skills
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
      "xpReward": number (difficulty * estimatedHours * 10)
    }
  ]
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
          content: 'You are a learning path designer. Always respond with valid JSON only.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 4096,
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

    const parsed = JSON.parse(jsonContent);
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

1. Break down the main goal into 15-25 individual skills
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
      "xpReward": number (difficulty * estimatedHours * 10)
    }
  ]
}`;

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
      max_tokens: 4096,
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

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('Empty response from AI');
    }

    const parsed = JSON.parse(content);
    const evaluation = TaskEvaluationSchema.parse(parsed);

    return evaluation;
  } catch (error) {
    console.error('Error evaluating task:', error);
    throw error instanceof Error ? error : new Error('Failed to evaluate task');
  }
}
