import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const cloneRequestSchema = z.object({
  name: z.string().min(1).max(200).optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const { name: customName } = cloneRequestSchema.parse(body);

    // Fetch the template with all skills, tasks, and prerequisites
    const template = await prisma.skillTree.findUnique({
      where: { id },
      include: {
        skills: {
          include: {
            tasks: {
              orderBy: { order: "asc" },
            },
            prerequisites: {
              select: { id: true },
            },
          },
        },
      },
    });

    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    // Verify it's a public template
    if (!template.isTemplate || !template.isPublic) {
      return NextResponse.json({ error: "Not a public template" }, { status: 403 });
    }

    // Clone the skill tree with all related data in a transaction
    const clonedTree = await prisma.$transaction(async (tx) => {
      // 1. Create new skill tree (use custom name if provided)
      const newTree = await tx.skillTree.create({
        data: {
          userId,
          name: customName || template.name,
          description: template.description,
          domain: template.domain,
          isTemplate: false,
          isPublic: false,
          aiGenerated: template.aiGenerated,
        },
      });

      // 2. Create skill ID mapping (old ID -> new ID)
      const skillIdMap = new Map<string, string>();

      // 3. Clone skills first (without prerequisites)
      for (const skill of template.skills) {
        const newSkill = await tx.skill.create({
          data: {
            treeId: newTree.id,
            name: skill.name,
            description: skill.description,
            category: skill.category,
            currentLevel: 1,
            maxLevel: skill.maxLevel,
            currentXP: 0,
            xpToNextLevel: skill.xpToNextLevel,
            status: "LOCKED", // Reset all to LOCKED initially
            positionX: skill.positionX,
            positionY: skill.positionY,
            aiMetadata: skill.aiMetadata || undefined,
          },
        });

        skillIdMap.set(skill.id, newSkill.id);

        // 4. Clone tasks for this skill
        for (const task of skill.tasks) {
          await tx.task.create({
            data: {
              skillId: newSkill.id,
              title: task.title,
              description: task.description,
              type: task.type,
              order: task.order,
              xpReward: task.xpReward,
              estimatedHours: task.estimatedHours,
              checklistOptions: task.checklistOptions || undefined,
              completed: false, // Reset completion status
            },
          });
        }
      }

      // 5. Set up prerequisite relationships using the ID mapping
      for (const skill of template.skills) {
        const newSkillId = skillIdMap.get(skill.id);
        if (!newSkillId) continue;

        for (const prereq of skill.prerequisites) {
          const newPrereqId = skillIdMap.get(prereq.id);
          if (!newPrereqId) continue;

          await tx.skill.update({
            where: { id: newSkillId },
            data: {
              prerequisites: {
                connect: { id: newPrereqId },
              },
            },
          });
        }
      }

      // 6. Unlock root skills (skills with no prerequisites)
      const rootSkills = template.skills.filter((s) => s.prerequisites.length === 0);
      for (const rootSkill of rootSkills) {
        const newSkillId = skillIdMap.get(rootSkill.id);
        if (newSkillId) {
          await tx.skill.update({
            where: { id: newSkillId },
            data: {
              status: "AVAILABLE",
              unlockedAt: new Date(),
            },
          });
        }
      }

      return newTree;
    });

    return NextResponse.json({
      success: true,
      data: clonedTree,
      message: "Template cloned successfully",
    });
  } catch (error) {
    console.error("[API] Error cloning skill tree:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to clone skill tree",
      },
      { status: 500 }
    );
  }
}
