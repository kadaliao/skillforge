import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ skillId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { skillId } = await params;

    // Fetch skill with tree to verify ownership
    const skill = await prisma.skill.findUnique({
      where: { id: skillId },
      include: {
        tree: true,
        dependents: { select: { id: true, name: true } },
        prerequisites: { select: { id: true } },
        tasks: { select: { id: true } },
      },
    });

    if (!skill) {
      return NextResponse.json({ error: "Skill not found" }, { status: 404 });
    }

    // Verify ownership
    if (skill.tree.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Delete skill and unlink dependencies
    // Prisma doesn't auto-handle many-to-many self-relations on delete
    await prisma.$transaction(async (tx) => {
      // 1. Unlink this skill from other skills' prerequisites
      await tx.skill.update({
        where: { id: skillId },
        data: {
          prerequisites: { set: [] },
          dependents: { set: [] },
        },
      });

      // 2. Remove this skill from all other skills that list it as a prerequisite
      for (const dependent of skill.dependents) {
        await tx.skill.update({
          where: { id: dependent.id },
          data: {
            prerequisites: {
              disconnect: { id: skillId },
            },
          },
        });
      }

      // 3. Delete the skill (tasks cascade, activities set null)
      await tx.skill.delete({
        where: { id: skillId },
      });
    });

    return NextResponse.json({
      success: true,
      message: `Skill deleted`,
      tasksDeleted: skill.tasks.length,
      dependentsUnlinked: skill.dependents.length,
    });
  } catch (error) {
    console.error("Skill deletion failed:", error);
    return NextResponse.json(
      { error: "Failed to delete skill" },
      { status: 500 }
    );
  }
}
