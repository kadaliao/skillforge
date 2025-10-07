/**
 * Seed achievements into database.
 * Run with: npx tsx prisma/seed-achievements.ts
 */

import { PrismaClient } from "@prisma/client";
import { ACHIEVEMENT_DEFINITIONS } from "../lib/gamification";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding achievements...");

  let created = 0;
  let updated = 0;

  for (const def of ACHIEVEMENT_DEFINITIONS) {
    const existing = await prisma.achievement.findUnique({
      where: { id: def.id },
    });

    if (existing) {
      // Update if definition changed
      await prisma.achievement.update({
        where: { id: def.id },
        data: {
          name: def.name,
          description: def.description,
          rarity: def.rarity,
          iconName: def.iconName,
        },
      });
      updated++;
      console.log(`  ✓ Updated: ${def.name} (${def.rarity})`);
    } else {
      // Create new achievement
      await prisma.achievement.create({
        data: {
          id: def.id,
          name: def.name,
          description: def.description,
          rarity: def.rarity,
          iconName: def.iconName,
        },
      });
      created++;
      console.log(`  + Created: ${def.name} (${def.rarity})`);
    }
  }

  console.log(`\n✅ Done! Created: ${created}, Updated: ${updated}`);
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
