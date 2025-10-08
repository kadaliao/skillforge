import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { evaluateTaskCompletion } from "@/lib/ai";
import {
  calculateUserLevel,
  xpToNextUserLevel,
  calculateSkillLevel,
  xpForSkillLevel,
  calculateStreak,
  checkNewAchievements,
  ACHIEVEMENT_DEFINITIONS,
  type AchievementCheckData,
} from "@/lib/gamification";

interface RouteContext {
  params: Promise<{ taskId: string }>;
}

/**
 * POST /api/tasks/[taskId]/complete
 *
 * Complete a task with full gamification:
 * - Award XP (AI-evaluated or base)
 * - Update skill progress & leveling
 * - Unlock dependent skills
 * - Update user XP & level
 * - Track streaks
 * - Award achievements
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { taskId } = await context.params;
    const body = await request.json();
    const { submission, notes } = body as { submission?: string; notes?: string };

    // ========================================================================
    // 1. FETCH TASK WITH RELATIONSHIPS
    // ========================================================================

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        skill: {
          include: {
            tree: true,
            tasks: true,
            dependents: {
              include: {
                tasks: true,
              },
            },
          },
        },
      },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Verify ownership
    if (task.skill.tree.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Already completed
    if (task.completedAt) {
      return NextResponse.json({ error: "Task already completed" }, { status: 400 });
    }

    // ========================================================================
    // 2. AI EVALUATION (if submission provided)
    // ========================================================================

    let xpAwarded = task.xpReward;
    let qualityScore: number | null = null;
    let aiFeedback: string | null = null;

    if (submission && submission.trim().length > 0) {
      try {
        const evaluation = await evaluateTaskCompletion(
          task.title,
          task.description || "",
          submission,
          task.xpReward
        );

        qualityScore = evaluation.qualityScore;
        aiFeedback = evaluation.feedback;
        xpAwarded = evaluation.suggestedXP;
      } catch (error) {
        console.error("AI evaluation failed:", error);
        // Fallback to base XP if AI fails
      }
    }

    // ========================================================================
    // 3. UPDATE TASK
    // ========================================================================

    await prisma.task.update({
      where: { id: taskId },
      data: {
        completed: true,
        completedAt: new Date(),
        submission: submission || null,
        notes: notes || null,
        qualityScore,
        aiFeedback,
      },
    });

    // ========================================================================
    // 4. SKILL PROGRESSION
    // ========================================================================

    const skill = task.skill;
    const newSkillXP = skill.currentXP + xpAwarded;
    const newSkillLevel = calculateSkillLevel(newSkillXP, skill.maxLevel);
    const oldSkillLevel = skill.currentLevel;
    const skillLeveledUp = newSkillLevel > oldSkillLevel;

    // Check if all tasks in skill are now completed
    const allTasksCompleted = skill.tasks.every(
      (t) => t.id === taskId || t.completedAt !== null
    );

    // Determine new skill status
    let newSkillStatus = skill.status;
    if (allTasksCompleted && skill.status === "IN_PROGRESS") {
      newSkillStatus = "COMPLETED";
    }

    await prisma.skill.update({
      where: { id: skill.id },
      data: {
        currentXP: newSkillXP,
        currentLevel: newSkillLevel,
        status: newSkillStatus,
        completedAt: newSkillStatus === "COMPLETED" ? new Date() : null,
        xpToNextLevel:
          newSkillLevel < skill.maxLevel
            ? xpForSkillLevel(newSkillLevel + 1)
            : 0,
      },
    });

    // ========================================================================
    // 5. UNLOCK DEPENDENT SKILLS
    // ========================================================================

    const unlockedSkills: string[] = [];

    if (newSkillStatus === "COMPLETED") {
      // Find skills that depend on this one
      const dependentSkills = skill.dependents;

      for (const dependent of dependentSkills) {
        // Check if ALL prerequisites are completed
        const prerequisites = await prisma.skill.findUnique({
          where: { id: dependent.id },
          include: {
            prerequisites: true,
          },
        });

        if (!prerequisites) continue;

        const allPrereqsCompleted = prerequisites.prerequisites.every(
          (prereq) => prereq.status === "COMPLETED" || prereq.status === "MASTERED"
        );

        // Unlock if all prerequisites are done and currently locked
        if (allPrereqsCompleted && dependent.status === "LOCKED") {
          await prisma.skill.update({
            where: { id: dependent.id },
            data: { status: "AVAILABLE" },
          });
          unlockedSkills.push(dependent.id);
        }
      }
    }

    // ========================================================================
    // 6. USER XP & LEVELING
    // ========================================================================

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const newUserTotalXP = user.totalXP + xpAwarded;
    const newUserLevel = calculateUserLevel(newUserTotalXP);
    const oldUserLevel = user.level;
    const userLeveledUp = newUserLevel > oldUserLevel;

    // ========================================================================
    // 7. STREAK TRACKING
    // ========================================================================

    const streakUpdate = calculateStreak(
      user.lastActiveAt,
      user.currentStreak,
      user.longestStreak
    );

    // ========================================================================
    // 8. CREATE ACTIVITY RECORD
    // ========================================================================

    await prisma.activity.create({
      data: {
        type: "TASK_COMPLETE",
        userId: session.user.id,
        skillId: skill.id,
        taskId: task.id,
        xpGained: xpAwarded,
        description: `Completed task: ${task.title}`,
        metadata: {
          taskTitle: task.title,
          qualityScore,
          skillLeveledUp,
          userLeveledUp,
          unlockedSkills,
        },
      },
    });

    // Add level up activities
    if (userLeveledUp) {
      await prisma.activity.create({
        data: {
          type: "LEVEL_UP",
          userId: session.user.id,
          xpGained: 0,
          description: `Leveled up to ${newUserLevel}!`,
          metadata: { level: newUserLevel },
        },
      });
    }

    if (newSkillStatus === "COMPLETED") {
      await prisma.activity.create({
        data: {
          type: "SKILL_UNLOCKED",
          userId: session.user.id,
          skillId: skill.id,
          xpGained: 0,
          description: `Completed skill: ${skill.name}`,
          metadata: { skillName: skill.name },
        },
      });
    }

    // ========================================================================
    // 9. UPDATE USER
    // ========================================================================

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        totalXP: newUserTotalXP,
        level: newUserLevel,
        currentStreak: streakUpdate.currentStreak,
        longestStreak: streakUpdate.longestStreak,
        lastActiveAt: new Date(),
      },
    });

    // ========================================================================
    // 10. CHECK ACHIEVEMENTS
    // ========================================================================

    const [skillTrees, skills, tasks, activities, earnedAchievements] = await Promise.all([
      prisma.skillTree.findMany({
        where: { userId: session.user.id },
        select: { id: true },
      }),
      prisma.skill.findMany({
        where: { tree: { userId: session.user.id } },
        select: { id: true, status: true, completedAt: true, treeId: true },
      }),
      prisma.task.findMany({
        where: { skill: { tree: { userId: session.user.id } } },
        select: { id: true, completedAt: true },
      }),
      prisma.activity.findMany({
        where: { userId: session.user.id },
        select: { type: true, createdAt: true },
      }),
      prisma.userAchievement.findMany({
        where: { userId: session.user.id },
        include: { achievement: true },
      }),
    ]);

    const achievementData: AchievementCheckData = {
      user: {
        totalXP: newUserTotalXP,
        level: newUserLevel,
        currentStreak: streakUpdate.currentStreak,
        longestStreak: streakUpdate.longestStreak,
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
          userId: session.user.id,
          achievementId: achievement.id,
        },
      });

      newAchievements.push(achievement);
    }

    // ========================================================================
    // 11. RETURN RESPONSE
    // ========================================================================

    return NextResponse.json({
      success: true,
      xpAwarded,
      qualityScore,
      aiFeedback,
      skill: {
        id: skill.id,
        currentXP: newSkillXP,
        currentLevel: newSkillLevel,
        status: newSkillStatus,
        leveledUp: skillLeveledUp,
      },
      user: {
        totalXP: newUserTotalXP,
        level: newUserLevel,
        leveledUp: userLeveledUp,
        xpToNextLevel: xpToNextUserLevel(newUserTotalXP),
        currentStreak: streakUpdate.currentStreak,
        longestStreak: streakUpdate.longestStreak,
        streakBroken: streakUpdate.streakBroken,
      },
      unlockedSkills,
      newAchievements,
    });
  } catch (error) {
    console.error("Task completion error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
