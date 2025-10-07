import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import OpenAI from 'openai';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

export const maxDuration = 60; // 1 minute should be enough for generating 3 tasks

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL,
  timeout: 60 * 1000, // 1 minute
  maxRetries: 2,
});

const TaskSchema = z.object({
  title: z.string(),
  description: z.string(),
  type: z.enum(['PRACTICE', 'PROJECT', 'STUDY', 'CHALLENGE', 'MILESTONE']),
  xpReward: z.number(),
  estimatedHours: z.number().optional(),
});

const TasksResponseSchema = z.object({
  tasks: z.array(TaskSchema).length(3), // Exactly 3 tasks
});

const requestSchema = z.object({
  skillId: z.string(),
});

export async function POST(req: NextRequest) {
  try {
    // Authenticate
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await req.json();
    const { skillId } = requestSchema.parse(body);

    // Fetch skill details
    const skill = await prisma.skill.findUnique({
      where: { id: skillId },
      include: {
        tasks: true,
        tree: true, // Correct relation name is 'tree', not 'skillTree'
      },
    });

    if (!skill) {
      return NextResponse.json({ error: 'Skill not found' }, { status: 404 });
    }

    // Check ownership
    if (skill.tree.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Check if tasks already exist
    if (skill.tasks.length > 0) {
      return NextResponse.json({ error: 'Tasks already exist for this skill' }, { status: 400 });
    }

    // Extract metadata from aiMetadata field
    const aiMetadata = skill.aiMetadata as {
      estimatedHours?: number;
      difficulty?: number;
      xpReward?: number;
    } | null;

    const estimatedHours = aiMetadata?.estimatedHours || 10;
    const difficulty = aiMetadata?.difficulty || 5;
    const totalXP = aiMetadata?.xpReward || difficulty * estimatedHours * 10;

    // Generate tasks using AI
    const prompt = `Generate 3 actionable tasks for this skill:

Skill Name: ${skill.name}
Description: ${skill.description}
Category: ${skill.category}
Estimated Hours: ${estimatedHours}h
Difficulty: ${difficulty}/10
Total XP: ${totalXP}

Create exactly 3 tasks following this structure:
1. STUDY task (30% XP) - Learn the theory/concepts
2. PRACTICE task (30% XP) - Hands-on practice exercises
3. PROJECT task (40% XP) - Build something real

Requirements:
- Tasks should be specific and actionable
- Each task should build on the previous one
- Distribute XP: STUDY gets ${Math.floor(totalXP * 0.3)}, PRACTICE gets ${Math.floor(totalXP * 0.3)}, PROJECT gets ${Math.floor(totalXP * 0.4)}
- Estimate hours for each task based on skill difficulty

Return ONLY valid JSON (no markdown):
{
  "tasks": [
    {
      "title": "string - task title (concise)",
      "description": "string - what to do (1-2 sentences)",
      "type": "STUDY | PRACTICE | PROJECT",
      "xpReward": number,
      "estimatedHours": number
    }
  ]
}`;

    console.log(`🤖 Generating tasks for skill: ${skill.name}`);

    const response = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are a learning task designer. Always respond with valid JSON only.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 2048,
    });

    let content = response.choices[0].message.content;
    if (!content) {
      throw new Error('Empty response from AI');
    }

    // Extract JSON from markdown if needed
    const codeBlockMatch = content.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (codeBlockMatch) {
      content = codeBlockMatch[1].trim();
    }

    const parsed = JSON.parse(content);
    const { tasks } = TasksResponseSchema.parse(parsed);

    // Save tasks to database
    const createdTasks = await prisma.task.createMany({
      data: tasks.map((task, index) => ({
        skillId: skill.id,
        title: task.title,
        description: task.description,
        type: task.type,
        xpReward: task.xpReward,
        estimatedHours: task.estimatedHours,
        order: index,
      })),
    });

    console.log(`✅ Created ${createdTasks.count} tasks for skill: ${skill.name}`);

    // Fetch and return updated skill with tasks
    const updatedSkill = await prisma.skill.findUnique({
      where: { id: skillId },
      include: { tasks: { orderBy: { order: 'asc' } } },
    });

    return NextResponse.json({ success: true, skill: updatedSkill });
  } catch (error) {
    console.error('Error generating tasks:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate tasks' },
      { status: 500 }
    );
  }
}
