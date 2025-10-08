import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Verify user owns the skill tree
    const skillTree = await prisma.skillTree.findUnique({
      where: { id },
      select: {
        userId: true,
        isTemplate: true,
        isPublic: true,
      },
    });

    if (!skillTree) {
      return NextResponse.json({ error: "Skill tree not found" }, { status: 404 });
    }

    if (skillTree.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Toggle template status
    const isSharing = !skillTree.isTemplate || !skillTree.isPublic;

    const updatedTree = await prisma.skillTree.update({
      where: { id },
      data: {
        isTemplate: isSharing,
        isPublic: isSharing,
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedTree,
      message: isSharing
        ? "Skill tree shared as public template"
        : "Skill tree removed from templates",
    });
  } catch (error) {
    console.error("[API] Error sharing skill tree:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to share skill tree",
      },
      { status: 500 }
    );
  }
}
