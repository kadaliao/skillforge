import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createTaskSchema = z.object({
  skillId: z.string().cuid(),
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  type: z.enum(["PRACTICE", "PROJECT", "STUDY", "CHALLENGE", "MILESTONE"]),
  xpReward: z.number().int().min(1).max(10000),
  estimatedHours: z.number().positive().optional(),
  order: z.number().int().min(0).optional(), // Optional: auto-calculate if not provided
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validatedData = createTaskSchema.parse(body);

    // Verify user owns the skill tree
    const skill = await prisma.skill.findUnique({
      where: { id: validatedData.skillId },
      include: {
        tree: {
          select: { userId: true },
        },
      },
    });

    if (!skill) {
      return NextResponse.json({ error: "Skill not found" }, { status: 404 });
    }

    if (skill.tree.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Auto-calculate order if not provided
    let order = validatedData.order;
    if (order === undefined) {
      const maxOrderTask = await prisma.task.findFirst({
        where: { skillId: validatedData.skillId },
        orderBy: { order: "desc" },
        select: { order: true },
      });
      order = maxOrderTask ? maxOrderTask.order + 1 : 0;
    }

    // Create task
    const task = await prisma.task.create({
      data: {
        skillId: validatedData.skillId,
        title: validatedData.title,
        description: validatedData.description,
        type: validatedData.type,
        xpReward: validatedData.xpReward,
        estimatedHours: validatedData.estimatedHours,
        order,
      },
    });

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Error creating task:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
