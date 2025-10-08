import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/analytics/skills
 *
 * Returns skill completion statistics across all user's skill trees.
 * Groups by status and provides tree-level breakdowns.
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all skills for this user
    const skills = await prisma.skill.findMany({
      where: {
        tree: {
          userId: session.user.id,
        },
      },
      include: {
        tree: {
          select: {
            id: true,
            name: true,
            domain: true,
          },
        },
        tasks: {
          select: {
            id: true,
            completed: true,
          },
        },
      },
    });

    // Group by status
    const byStatus = {
      LOCKED: 0,
      AVAILABLE: 0,
      IN_PROGRESS: 0,
      COMPLETED: 0,
      MASTERED: 0,
    };

    skills.forEach((skill) => {
      byStatus[skill.status]++;
    });

    // Group by skill tree
    const byTree = new Map<string, {
      treeId: string;
      treeName: string;
      domain: string;
      total: number;
      completed: number;
      mastered: number;
    }>();

    skills.forEach((skill) => {
      const key = skill.tree.id;
      const existing = byTree.get(key) || {
        treeId: skill.tree.id,
        treeName: skill.tree.name,
        domain: skill.tree.domain,
        total: 0,
        completed: 0,
        mastered: 0,
      };

      existing.total++;
      if (skill.status === "COMPLETED") existing.completed++;
      if (skill.status === "MASTERED") existing.mastered++;

      byTree.set(key, existing);
    });

    // Calculate task completion stats
    let totalTasks = 0;
    let completedTasks = 0;

    skills.forEach((skill) => {
      totalTasks += skill.tasks.length;
      completedTasks += skill.tasks.filter((t) => t.completed).length;
    });

    const taskCompletionRate = totalTasks > 0
      ? Math.round((completedTasks / totalTasks) * 100)
      : 0;

    const skillCompletionRate = skills.length > 0
      ? Math.round(((byStatus.COMPLETED + byStatus.MASTERED) / skills.length) * 100)
      : 0;

    return NextResponse.json({
      summary: {
        totalSkills: skills.length,
        completedSkills: byStatus.COMPLETED + byStatus.MASTERED,
        skillCompletionRate,
        totalTasks,
        completedTasks,
        taskCompletionRate,
      },
      byStatus: Object.entries(byStatus).map(([status, count]) => ({
        status,
        count,
        percentage: skills.length > 0 ? Math.round((count / skills.length) * 100) : 0,
      })),
      byTree: Array.from(byTree.values()).map((tree) => ({
        ...tree,
        completionRate: tree.total > 0
          ? Math.round(((tree.completed + tree.mastered) / tree.total) * 100)
          : 0,
      })),
    });
  } catch (error) {
    console.error("Skills analytics error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
