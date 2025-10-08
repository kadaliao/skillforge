import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const domain = searchParams.get("domain");

    // Fetch public templates with skill counts and creator info
    const templates = await prisma.skillTree.findMany({
      where: {
        isTemplate: true,
        isPublic: true,
        ...(domain && { domain }),
      },
      include: {
        user: {
          select: {
            name: true,
            image: true,
          },
        },
        skills: {
          select: {
            id: true,
            status: true,
          },
        },
        _count: {
          select: {
            skills: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Calculate metadata for each template
    const templatesWithMetadata = templates.map((template) => ({
      id: template.id,
      name: template.name,
      description: template.description,
      domain: template.domain,
      createdAt: template.createdAt,
      creator: {
        name: template.user.name,
        image: template.user.image,
      },
      skillCount: template._count.skills,
      aiGenerated: template.aiGenerated,
    }));

    return NextResponse.json({
      success: true,
      data: templatesWithMetadata,
    });
  } catch (error) {
    console.error("[API] Error fetching templates:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch templates",
      },
      { status: 500 }
    );
  }
}
