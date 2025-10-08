import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  calculateUserLevel,
  calculateSkillLevel,
  xpForSkillLevel,
  calculateStreak,
  checkNewAchievements,
  ACHIEVEMENT_DEFINITIONS,
  type AchievementCheckData,
} from "@/lib/gamification";
import { z } from "zod";

const bulkCompleteSchema = z.object({
  taskIds: z.array(z.string().cuid()).min(1).max(50), // Max 50 tasks at once
});

/**
 * POST /api/tasks/bulk-complete
 *
 * Complete multiple tasks in a single transaction.
 * Simplified logic: No AI evaluation, base XP only.
 * For quality feedback, complete tasks individually.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await req.json();
    const { taskIds } = bulkCompleteSchema.parse(body);

    // Use transaction for atomicity
    const result = await prisma.$transaction(async (tx) => {
      // 1. Fetch all tasks with ownership verification
      const tasks = await tx.task.findMany({
        where: {
          id: { in: taskIds },
          skill: {
            tree: {
              userId,
            },
          },
        },
        include: {
          skill: {
            include: {
              tree: true,
              tasks: true,
            },
          },
        },
      });

      if (tasks.length === 0) {
        throw new Error("No valid tasks found");
      }

      // Filter already completed
      const incompleteTasks = tasks.filter((t) => !t.completedAt);
      if (incompleteTasks.length === 0) {
        throw new Error("All tasks already completed");
      }

      // 2. Mark tasks complete
      const now = new Date();
      await tx.task.updateMany({
        where: {
          id: { in: incompleteTasks.map((t) => t.id) },
        },
        data: {
          completed: true,
          completedAt: now,
        },
      });

      // 3. Calculate total XP
      const totalXP = incompleteTasks.reduce((sum, t) => sum + t.xpReward, 0);

      // 4. Group tasks by skill and update skill progress
      const skillUpdates = new Map<string, { currentXP: number; allCompleted: boolean }>();

      for (const task of incompleteTasks) {
        const skill = task.skill;
        const existing = skillUpdates.get(skill.id) || {
          currentXP: skill.currentXP,
          allCompleted: false,
        };

        existing.currentXP += task.xpReward;

        // Check if all tasks in this skill are now completed
        const completedTaskIds = new Set([
          ...skill.tasks.filter((t) => t.completedAt).map((t) => t.id),
          ...incompleteTasks.filter((t) => t.skillId === skill.id).map((t) => t.id),
        ]);
        existing.allCompleted = skill.tasks.every((t) => completedTaskIds.has(t.id));

        skillUpdates.set(skill.id, existing);
      }

      // Update each skill
      const updatedSkills = [];
      for (const [skillId, update] of skillUpdates) {
        const skill = tasks.find((t) => t.skill.id === skillId)!.skill;
        const newLevel = calculateSkillLevel(update.currentXP, skill.maxLevel);
        const newStatus = update.allCompleted ? "COMPLETED" : skill.status;

        const updated = await tx.skill.update({
          where: { id: skillId },
          data: {
            currentXP: update.currentXP,
            currentLevel: newLevel,
            status: newStatus,
            completedAt: newStatus === "COMPLETED" ? now : null,
            xpToNextLevel:
              newLevel < skill.maxLevel ? xpForSkillLevel(newLevel + 1) : 0,
          },
        });

        updatedSkills.push(updated);

        // Unlock dependents if skill completed
        if (newStatus === "COMPLETED" && skill.status !== "COMPLETED") {
          const dependents = await tx.skill.findMany({
            where: {
              prerequisites: {
                some: { id: skillId },
              },
              status: "LOCKED",
            },
            include: {
              prerequisites: true,
            },
          });

          for (const dependent of dependents) {
            const allPrereqsCompleted = dependent.prerequisites.every(
              (prereq) =>
                prereq.id === skillId ||
                prereq.status === "COMPLETED" ||
                prereq.status === "MASTERED"
            );

            if (allPrereqsCompleted) {
              await tx.skill.update({
                where: { id: dependent.id },
                data: { status: "AVAILABLE", unlockedAt: now },
              });
            }
          }
        }
      }

      // 5. Update user stats
      const user = await tx.user.findUnique({
        where: { id: userId },
      });

      if (!user) throw new Error("User not found");

      const newTotalXP = user.totalXP + totalXP;
      const newLevel = calculateUserLevel(newTotalXP);
      const streakUpdate = calculateStreak(
        user.lastActiveAt,
        user.currentStreak,
        user.longestStreak
      );

      await tx.user.update({
        where: { id: userId },
        data: {
          totalXP: newTotalXP,
          level: newLevel,
          currentStreak: streakUpdate.currentStreak,
          longestStreak: streakUpdate.longestStreak,
          lastActiveAt: now,
        },
      });

      // 6. Create bulk activity record
      await tx.activity.create({
        data: {
          type: "TASK_COMPLETE",
          userId,
          xpGained: totalXP,
          description: `Completed ${incompleteTasks.length} tasks in bulk`,
          metadata: {
            taskCount: incompleteTasks.length,
            taskIds: incompleteTasks.map((t) => t.id),
          },
        },
      });

      return {
        tasksCompleted: incompleteTasks.length,
        totalXP,
        newUserLevel: newLevel,
        newUserTotalXP: newTotalXP,
        skillsUpdated: updatedSkills.length,
        currentStreak: streakUpdate.currentStreak,
        longestStreak: streakUpdate.longestStreak,
      };
    });

    // ========================================================================
    // 7. CHECK ACHIEVEMENTS (after transaction)
    // ========================================================================

    const [skillTrees, skills, tasks, activities, earnedAchievements] = await Promise.all([
      prisma.skillTree.findMany({
        where: { userId },
        select: { id: true },
      }),
      prisma.skill.findMany({
        where: { tree: { userId } },
        select: { id: true, status: true, completedAt: true, treeId: true },
      }),
      prisma.task.findMany({
        where: { skill: { tree: { userId } } },
        select: { id: true, completedAt: true },
      }),
      prisma.activity.findMany({
        where: { userId },
        select: { type: true, createdAt: true },
      }),
      prisma.userAchievement.findMany({
        where: { userId },
        include: { achievement: true },
      }),
    ]);

    const achievementData: AchievementCheckData = {
      user: {
        totalXP: result.newUserTotalXP,
        level: result.newUserLevel,
        currentStreak: result.currentStreak,
        longestStreak: result.longestStreak,
      },
      skillTrees,
      skills,
      tasks,
      activities,
    };

    const newAchievementIds = checkNewAchievements(
      achievementData,
      earnedAchievements.map((ua) => ua.achievement.id)
    );

    const newAchievements = [];

    for (const achievementId of newAchievementIds) {
      const achievementDef = ACHIEVEMENT_DEFINITIONS.find((a) => a.id === achievementId);
      if (!achievementDef) continue;

      // Get or create achievement in database
      let achievement = await prisma.achievement.findUnique({
        where: { id: achievementId },
      });

      if (!achievement) {
        achievement = await prisma.achievement.create({
          data: {
            id: achievementId,
            name: achievementDef.name,
            description: achievementDef.description,
            rarity: achievementDef.rarity,
            iconName: achievementDef.iconName,
          },
        });
      }

      // Award to user
      await prisma.userAchievement.create({
        data: {
          userId,
          achievementId: achievement.id,
        },
      });

      newAchievements.push(achievement);
    }

    return NextResponse.json({
      ...result,
      newAchievements,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Bulk complete error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
