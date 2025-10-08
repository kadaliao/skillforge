import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { calculateUserLevel } from '@/lib/gamification';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Fetch skill tree to verify ownership
    const skillTree = await prisma.skillTree.findUnique({
      where: { id },
      include: {
        skills: {
          include: {
            prerequisites: {
              select: {
                id: true,
                name: true,
              },
            },
            tasks: {
              select: {
                id: true,
                title: true,
                completed: true,
                xpReward: true,
                type: true,
                checklistOptions: true,
              },
            },
          },
        },
      },
    });

    if (!skillTree) {
      return NextResponse.json({ error: 'Skill tree not found' }, { status: 404 });
    }

    // Verify ownership
    if (skillTree.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Calculate XP to deduct (all completed tasks in this tree)
    const completedTasks = await prisma.task.findMany({
      where: {
        skillId: {
          in: skillTree.skills.map(s => s.id),
        },
        completed: true,
      },
      select: {
        xpReward: true,
      },
    });

    const xpToDeduct = completedTasks.reduce((sum, task) => sum + task.xpReward, 0);

    // Count tasks before deletion
    const tasksCount = await prisma.task.count({
      where: {
        skillId: {
          in: skillTree.skills.map(s => s.id),
        },
      },
    });

    // Use transaction to ensure atomicity
    await prisma.$transaction(async (tx) => {
      // Update user stats (deduct XP and recalculate level)
      if (xpToDeduct > 0) {
        const user = await tx.user.findUnique({
          where: { id: session.user.id },
          select: { totalXP: true },
        });

        if (user) {
          const newTotalXP = Math.max(0, user.totalXP - xpToDeduct);
          const newLevel = calculateUserLevel(newTotalXP);

          await tx.user.update({
            where: { id: session.user.id },
            data: {
              totalXP: newTotalXP,
              level: newLevel,
            },
          });
        }
      }

      // Delete skill tree (cascades to skills, tasks; activities set null)
      await tx.skillTree.delete({
        where: { id },
      });
    });

    return NextResponse.json({
      success: true,
      message: 'Skill tree deleted',
      skillsDeleted: skillTree.skills.length,
      tasksDeleted: tasksCount,
      xpDeducted: xpToDeduct,
    });
  } catch (error) {
    console.error('Skill tree deletion failed:', error);
    return NextResponse.json(
      { error: 'Failed to delete skill tree' },
      { status: 500 }
    );
  }
}
