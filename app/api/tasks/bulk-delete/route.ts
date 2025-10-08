import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const bulkDeleteSchema = z.object({
  taskIds: z.array(z.string().cuid()).min(1).max(100),
});

/**
 * DELETE /api/tasks/bulk-delete
 *
 * Delete multiple tasks at once.
 * Verifies ownership before deletion.
 */
export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { taskIds } = bulkDeleteSchema.parse(body);

    // Verify all tasks belong to user's skill trees
    const tasks = await prisma.task.findMany({
      where: {
        id: { in: taskIds },
        skill: {
          tree: {
            userId: session.user.id,
          },
        },
      },
    });

    if (tasks.length === 0) {
      return NextResponse.json({ error: "No valid tasks found" }, { status: 404 });
    }

    // Delete tasks (cascades to activities via onDelete: SetNull)
    await prisma.task.deleteMany({
      where: {
        id: { in: tasks.map((t) => t.id) },
      },
    });

    return NextResponse.json({
      success: true,
      deletedCount: tasks.length,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Bulk delete error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
