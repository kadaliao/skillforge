import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/analytics/progress
 *
 * Returns user XP progression over time.
 * Aggregates activity data by day to show XP gained per day.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const days = parseInt(searchParams.get("days") || "30");

    // Get activities from the last N days
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const activities = await prisma.activity.findMany({
      where: {
        userId: session.user.id,
        createdAt: {
          gte: startDate,
        },
        xpGained: {
          gt: 0,
        },
      },
      orderBy: {
        createdAt: "asc",
      },
      select: {
        xpGained: true,
        createdAt: true,
        type: true,
      },
    });

    // Aggregate by day
    const dailyXP = new Map<string, number>();

    activities.forEach((activity) => {
      const dateKey = activity.createdAt.toISOString().split("T")[0];
      dailyXP.set(dateKey, (dailyXP.get(dateKey) || 0) + activity.xpGained);
    });

    // Convert to array and calculate cumulative XP
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { totalXP: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Calculate starting XP (total XP minus all XP in the period)
    const periodXP = activities.reduce((sum, a) => sum + a.xpGained, 0);
    let cumulativeXP = user.totalXP - periodXP;

    const result = [];
    const allDates = [];

    // Generate all dates in range (including days with no activity)
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateKey = date.toISOString().split("T")[0];
      allDates.push(dateKey);
    }

    for (const dateKey of allDates) {
      const dailyGain = dailyXP.get(dateKey) || 0;
      cumulativeXP += dailyGain;

      result.push({
        date: dateKey,
        xpGained: dailyGain,
        totalXP: cumulativeXP,
      });
    }

    return NextResponse.json({
      data: result,
      summary: {
        totalXPGained: periodXP,
        daysActive: dailyXP.size,
        avgXPPerDay: dailyXP.size > 0 ? Math.round(periodXP / dailyXP.size) : 0,
      },
    });
  } catch (error) {
    console.error("Progress analytics error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
