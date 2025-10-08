#!/usr/bin/env tsx
/**
 * Sync achievement definitions to production database
 * Run this after updating ACHIEVEMENT_DEFINITIONS in lib/gamification.ts
 *
 * Usage: npx tsx scripts/sync-production-achievements.ts
 */

import { prisma } from '../lib/prisma';
import { ACHIEVEMENT_DEFINITIONS } from '../lib/gamification';

async function syncAchievements() {
  console.log('🔄 Syncing achievement definitions...\n');

  let updated = 0;
  let created = 0;

  for (const def of ACHIEVEMENT_DEFINITIONS) {
    const existing = await prisma.achievement.findUnique({
      where: { id: def.id }
    });

    if (existing) {
      await prisma.achievement.update({
        where: { id: def.id },
        data: {
          name: def.name,
          description: def.description,
          rarity: def.rarity,
          iconName: def.iconName,
        }
      });
      console.log(`✅ Updated: ${def.iconName} ${def.name}`);
      updated++;
    } else {
      await prisma.achievement.create({
        data: {
          id: def.id,
          name: def.name,
          description: def.description,
          rarity: def.rarity,
          iconName: def.iconName,
        }
      });
      console.log(`✨ Created: ${def.iconName} ${def.name}`);
      created++;
    }
  }

  console.log(`\n🎉 Sync complete! Created: ${created}, Updated: ${updated}`);
}

syncAchievements()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
