import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const reorderSchema = z.object({
  skillId: z.string().cuid(),
  taskOrders: z.array(
    z.object({
      taskId: z.string().cuid(),
      order: z.number().int().min(0),
    })
  ).min(1),
});

/**
 * PUT /api/tasks/reorder
 *
 * Reorder tasks within a skill.
 * Accepts array of {taskId, order} pairs and updates in transaction.
 */
export async function PUT(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { skillId, taskOrders } = reorderSchema.parse(body);

    // Verify user owns the skill
    const skill = await prisma.skill.findUnique({
      where: { id: skillId },
      include: {
        tree: {
          select: { userId: true },
        },
        tasks: {
          select: { id: true },
        },
      },
    });

    if (!skill) {
      return NextResponse.json({ error: "Skill not found" }, { status: 404 });
    }

    if (skill.tree.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Verify all taskIds belong to this skill
    const skillTaskIds = new Set(skill.tasks.map((t) => t.id));
    const invalidTasks = taskOrders.filter((to) => !skillTaskIds.has(to.taskId));

    if (invalidTasks.length > 0) {
      return NextResponse.json(
        { error: "Some tasks do not belong to this skill" },
        { status: 400 }
      );
    }

    // Update task orders in transaction
    await prisma.$transaction(
      taskOrders.map((to) =>
        prisma.task.update({
          where: { id: to.taskId },
          data: { order: to.order },
        })
      )
    );

    return NextResponse.json({ success: true, updated: taskOrders.length });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Reorder error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
