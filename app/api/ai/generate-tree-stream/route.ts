import { NextRequest } from 'next/server';
import { z } from 'zod';
import { generateSkillTreeStream } from '@/lib/ai';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

// Increase timeout for long-running AI requests
export const maxDuration = 300; // 5 minutes (Vercel Pro max)

const generateTreeSchema = z.object({
  goal: z.string().min(5, 'Goal must be at least 5 characters'),
  currentLevel: z.enum(['beginner', 'intermediate', 'advanced']),
  weeklyHours: z.number().min(1).max(168),
  preferences: z.array(z.string()).optional(),
});

export async function POST(req: NextRequest) {
  console.log('\n🔵 [API] POST /api/ai/generate-tree-stream - Request received');

  const encoder = new TextEncoder();

  // Create a readable stream for SSE
  const stream = new ReadableStream({
    async start(controller) {
      const send = (message: string) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ message })}\n\n`));
      };

      try {
        // Get authenticated user
        const session = await auth();
        if (!session?.user?.id) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                success: false,
                error: 'Authentication required',
              })}\n\n`
            )
          );
          controller.close();
          return;
        }

        const userId = session.user.id;

        const body = await req.json();
        send('📥 Request received');

        // Validate input
        send('🔍 Validating input...');
        const validatedData = generateTreeSchema.parse(body);
        send('✓ Input validation passed');

        // Generate skill tree using AI with streaming
        const aiSkillTree = await generateSkillTreeStream(validatedData, send);

        // Save to database
        send('💾 Saving skill tree to database...');
        const savedSkillTree = await prisma.skillTree.create({
          data: {
            userId,
            name: aiSkillTree.treeName,
            description: aiSkillTree.description,
            domain: aiSkillTree.domain,
            aiGenerated: true,
            skills: {
              create: aiSkillTree.skills.map((skill, index) => ({
                name: skill.name,
                description: skill.description,
                category: skill.category,
                status: index < 2 ? 'AVAILABLE' : 'LOCKED',
                xpToNextLevel: skill.xpReward,
                // Let React Flow + dagre calculate positions automatically
                positionX: null,
                positionY: null,
                aiMetadata: {
                  estimatedHours: skill.estimatedHours,
                  difficulty: skill.difficulty,
                  resources: skill.resources,
                  xpReward: skill.xpReward,
                  prerequisites: skill.prerequisites,
                },
                // Tasks will be generated on-demand when user clicks on skill
                tasks: skill.tasks
                  ? {
                      create: skill.tasks.map((task) => ({
                        title: task.title,
                        description: task.description,
                        type: task.type,
                        xpReward: task.xpReward,
                        estimatedHours: task.estimatedHours,
                      })),
                    }
                  : undefined,
              })),
            },
          },
          include: {
            skills: true,
          },
        });

        // Connect skill prerequisites
        send('🔗 Connecting skill dependencies...');
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

        send('✓ Skill tree saved successfully');

        // Send success with skill tree ID
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              success: true,
              data: {
                id: savedSkillTree.id,
                ...aiSkillTree,
              },
            })}\n\n`
          )
        );

        controller.close();
      } catch (error) {
        console.error('\n❌ [API] Error in generate-tree-stream:', error);

        let errorMessage = 'Failed to generate skill tree';
        if (error instanceof z.ZodError) {
          errorMessage = `Validation error: ${error.issues.map((i) => i.message).join(', ')}`;
        } else if (error instanceof Error) {
          errorMessage = error.message;
        }

        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              success: false,
              error: errorMessage,
            })}\n\n`
          )
        );

        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
