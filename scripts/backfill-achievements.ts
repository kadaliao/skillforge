/**
 * Backfill Achievements Script
 *
 * Checks all users and awards any achievements they've earned but haven't received.
 * Safe to run multiple times (idempotent).
 *
 * Usage: npx tsx scripts/backfill-achievements.ts
 */

import { PrismaClient } from "@prisma/client";
import {
  checkNewAchievements,
  ACHIEVEMENT_DEFINITIONS,
  type AchievementCheckData,
} from "../lib/gamification";

const prisma = new PrismaClient();

interface BackfillReport {
  totalUsers: number;
  usersProcessed: number;
  totalAchievementsAwarded: number;
  userReports: {
    userId: string;
    email: string;
    existingAchievements: number;
    newAchievements: string[];
  }[];
}

async function backfillAchievements(): Promise<BackfillReport> {
  console.log("🚀 Starting achievement backfill...\n");

  const report: BackfillReport = {
    totalUsers: 0,
    usersProcessed: 0,
    totalAchievementsAwarded: 0,
    userReports: [],
  };

  // Fetch all users
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      totalXP: true,
      level: true,
      currentStreak: true,
      longestStreak: true,
    },
  });

  report.totalUsers = users.length;
  console.log(`Found ${users.length} users to check\n`);

  for (const user of users) {
    console.log(`\n📊 Checking user: ${user.email || user.id}`);

    // Fetch user's current data
    const [skillTrees, skills, tasks, activities, earnedAchievements] = await Promise.all([
      prisma.skillTree.findMany({
        where: { userId: user.id },
        select: { id: true },
      }),
      prisma.skill.findMany({
        where: { tree: { userId: user.id } },
        select: { id: true, status: true, completedAt: true, treeId: true },
      }),
      prisma.task.findMany({
        where: { skill: { tree: { userId: user.id } } },
        select: { id: true, completedAt: true },
      }),
      prisma.activity.findMany({
        where: { userId: user.id },
        select: { type: true, createdAt: true },
      }),
      prisma.userAchievement.findMany({
        where: { userId: user.id },
        include: { achievement: true },
      }),
    ]);

    const achievementData: AchievementCheckData = {
      user: {
        totalXP: user.totalXP,
        level: user.level,
        currentStreak: user.currentStreak,
        longestStreak: user.longestStreak,
      },
      skillTrees,
      skills,
      tasks,
      activities,
    };

    // Check for missing achievements
    const newAchievementIds = checkNewAchievements(
      achievementData,
      earnedAchievements.map((ua) => ua.achievement.id)
    );

    console.log(`  Existing achievements: ${earnedAchievements.length}`);
    console.log(`  Missing achievements: ${newAchievementIds.length}`);

    if (newAchievementIds.length === 0) {
      console.log("  ✅ No missing achievements");
      report.usersProcessed++;
      report.userReports.push({
        userId: user.id,
        email: user.email || "",
        existingAchievements: earnedAchievements.length,
        newAchievements: [],
      });
      continue;
    }

    // Award missing achievements
    const awardedAchievements: string[] = [];

    for (const achievementId of newAchievementIds) {
      const achievementDef = ACHIEVEMENT_DEFINITIONS.find((a) => a.id === achievementId);
      if (!achievementDef) {
        console.log(`  ⚠️  Achievement definition not found: ${achievementId}`);
        continue;
      }

      // Get or create achievement in database
      let achievement = await prisma.achievement.findUnique({
        where: { id: achievementId },
      });

      if (!achievement) {
        achievement = await prisma.achievement.create({
          data: {
            id: achievementId,
            name: achievementDef.name,
            description: achievementDef.description,
            rarity: achievementDef.rarity,
            iconName: achievementDef.iconName,
          },
        });
      }

      // Award to user
      await prisma.userAchievement.create({
        data: {
          userId: user.id,
          achievementId: achievement.id,
        },
      });

      awardedAchievements.push(`${achievementDef.iconName} ${achievementDef.name}`);
      console.log(`  🎉 Awarded: ${achievementDef.iconName} ${achievementDef.name}`);
    }

    report.usersProcessed++;
    report.totalAchievementsAwarded += awardedAchievements.length;
    report.userReports.push({
      userId: user.id,
      email: user.email || "",
      existingAchievements: earnedAchievements.length,
      newAchievements: awardedAchievements,
    });
  }

  return report;
}

async function main() {
  try {
    const report = await backfillAchievements();

    console.log("\n" + "=".repeat(60));
    console.log("📈 BACKFILL SUMMARY");
    console.log("=".repeat(60));
    console.log(`Total users checked: ${report.totalUsers}`);
    console.log(`Users processed: ${report.usersProcessed}`);
    console.log(`Total achievements awarded: ${report.totalAchievementsAwarded}`);
    console.log("");

    const usersWithNewAchievements = report.userReports.filter(
      (r) => r.newAchievements.length > 0
    );

    if (usersWithNewAchievements.length > 0) {
      console.log("Users who received new achievements:");
      for (const userReport of usersWithNewAchievements) {
        console.log(`\n  ${userReport.email || userReport.userId}:`);
        console.log(`    Existing: ${userReport.existingAchievements}`);
        console.log(`    New: ${userReport.newAchievements.length}`);
        for (const achievement of userReport.newAchievements) {
          console.log(`      - ${achievement}`);
        }
      }
    } else {
      console.log("✅ No missing achievements found - all users up to date!");
    }

    console.log("\n✨ Backfill complete!\n");
  } catch (error) {
    console.error("\n❌ Backfill failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
