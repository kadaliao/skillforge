import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { generateSkillTree } from '@/lib/ai';
import { prisma } from '@/lib/prisma';

const generateTreeSchema = z.object({
  goal: z.string().min(5, 'Goal must be at least 5 characters'),
  currentLevel: z.enum(['beginner', 'intermediate', 'advanced']),
  weeklyHours: z.number().min(1).max(168),
  preferences: z.array(z.string()).optional(),
});

// Temporary user ID for demo purposes (before authentication is implemented)
const DEMO_USER_ID = 'demo-user';

export async function POST(req: NextRequest) {
  console.log('\n🔵 [API] POST /api/ai/generate-tree - Request received');

  try {
    const body = await req.json();
    console.log('📥 [API] Request body:', JSON.stringify(body, null, 2));

    // Validate input
    console.log('🔍 [API] Validating input...');
    const validatedData = generateTreeSchema.parse(body);
    console.log('✓ [API] Input validation passed');

    // Generate skill tree using AI
    console.log('🤖 [API] Calling generateSkillTree...');
    const aiSkillTree = await generateSkillTree(validatedData);
    console.log('✓ [API] Skill tree generated successfully');

    // Ensure demo user exists
    console.log('👤 [API] Ensuring demo user exists...');
    await prisma.user.upsert({
      where: { id: DEMO_USER_ID },
      create: {
        id: DEMO_USER_ID,
        email: 'demo@skillforge.dev',
        name: 'Demo User',
      },
      update: {},
    });

    // Save to database
    console.log('💾 [API] Saving skill tree to database...');
    const savedSkillTree = await prisma.skillTree.create({
      data: {
        userId: DEMO_USER_ID,
        name: aiSkillTree.treeName,
        description: aiSkillTree.description,
        domain: aiSkillTree.domain,
        aiGenerated: true,
        skills: {
          create: aiSkillTree.skills.map((skill, index) => ({
            name: skill.name,
            description: skill.description,
            category: skill.category,
            status: index < 2 ? 'AVAILABLE' : 'LOCKED', // First 2 skills are available
            xpToNextLevel: skill.xpReward,
            positionX: (index % 4) * 300,
            positionY: Math.floor(index / 4) * 200,
            aiMetadata: {
              estimatedHours: skill.estimatedHours,
              difficulty: skill.difficulty,
              resources: skill.resources,
              xpReward: skill.xpReward,
              prerequisites: skill.prerequisites,
            },
          })),
        },
      },
      include: {
        skills: true,
      },
    });

    // Connect skill prerequisites
    console.log('🔗 [API] Connecting skill prerequisites...');
    for (const aiSkill of aiSkillTree.skills) {
      const skill = savedSkillTree.skills.find((s) => s.name === aiSkill.name);
      if (!skill) continue;

      const prerequisiteIds = aiSkill.prerequisites
        .map((prereqName) => savedSkillTree.skills.find((s) => s.name === prereqName)?.id)
        .filter((id): id is string => id !== undefined);

      if (prerequisiteIds.length > 0) {
        await prisma.skill.update({
          where: { id: skill.id },
          data: {
            prerequisites: {
              connect: prerequisiteIds.map((id) => ({ id })),
            },
          },
        });
      }
    }

    console.log('✓ [API] Skill tree saved with ID:', savedSkillTree.id);

    return NextResponse.json({
      success: true,
      data: {
        id: savedSkillTree.id,
        ...aiSkillTree,
      },
    });
  } catch (error) {
    console.error('\n❌ [API] Error in generate-tree:');

    if (error instanceof z.ZodError) {
      console.error('[API] Zod validation error:', error.issues);
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid input',
          details: error.issues,
        },
        { status: 400 }
      );
    }

    console.error('[API] Error type:', error?.constructor?.name);
    console.error('[API] Error message:', error instanceof Error ? error.message : String(error));
    console.error('[API] Full error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate skill tree',
      },
      { status: 500 }
    );
  }
}
