import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Fetch skill tree with all skills and their prerequisites
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
      return NextResponse.json(
        { success: false, error: 'Skill tree not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: skillTree,
    });
  } catch (error) {
    console.error('[API] Error fetching skill tree:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch skill tree',
      },
      { status: 500 }
    );
  }
}
