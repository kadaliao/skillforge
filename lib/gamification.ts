/**
 * Gamification System - XP, Leveling, Achievements, Streaks
 *
 * Core formulas and logic for SkillForge progression system.
 */

import { Rarity, ActivityType } from "@prisma/client";

// ============================================================================
// XP & LEVELING FORMULAS
// ============================================================================

/**
 * Calculate XP required to reach a given user level.
 * Formula: 100 * 1.5^(level - 1)
 * Level 1: 100 XP, Level 2: 150 XP, Level 3: 225 XP, etc.
 */
export function xpForUserLevel(level: number): number {
  if (level <= 1) return 0;
  return Math.floor(100 * Math.pow(1.5, level - 1));
}

/**
 * Calculate total XP needed from level 1 to reach target level.
 */
export function totalXpForUserLevel(level: number): number {
  let total = 0;
  for (let i = 2; i <= level; i++) {
    total += xpForUserLevel(i);
  }
  return total;
}

/**
 * Calculate user level from total XP.
 */
export function calculateUserLevel(totalXp: number): number {
  let level = 1;
  let xpSum = 0;

  while (xpSum + xpForUserLevel(level + 1) <= totalXp) {
    xpSum += xpForUserLevel(level + 1);
    level++;
  }

  return level;
}

/**
 * Calculate XP required for next user level.
 */
export function xpToNextUserLevel(totalXp: number): number {
  const currentLevel = calculateUserLevel(totalXp);
  const xpForNext = xpForUserLevel(currentLevel + 1);
  const totalForCurrent = totalXpForUserLevel(currentLevel);
  return xpForNext - (totalXp - totalForCurrent);
}

/**
 * Calculate skill XP required for a given skill level.
 * Skills level up faster than users.
 * Formula: 50 * 1.3^(level - 1)
 */
export function xpForSkillLevel(level: number): number {
  if (level <= 1) return 0;
  return Math.floor(50 * Math.pow(1.3, level - 1));
}

/**
 * Calculate total XP needed for skill to reach target level.
 */
export function totalXpForSkillLevel(level: number): number {
  let total = 0;
  for (let i = 2; i <= level; i++) {
    total += xpForSkillLevel(i);
  }
  return total;
}

/**
 * Calculate skill level from current XP.
 */
export function calculateSkillLevel(currentXp: number, maxLevel: number): number {
  let level = 1;
  let xpSum = 0;

  while (level < maxLevel && xpSum + xpForSkillLevel(level + 1) <= currentXp) {
    xpSum += xpForSkillLevel(level + 1);
    level++;
  }

  return level;
}

// ============================================================================
// STREAK LOGIC
// ============================================================================

/**
 * Check if activity timestamp continues the streak.
 * Streak continues if activity is within 48 hours of last activity.
 * (Allows missing one day without breaking streak)
 */
export function doesContinueStreak(lastActivityDate: Date, newActivityDate: Date): boolean {
  const hoursDiff = (newActivityDate.getTime() - lastActivityDate.getTime()) / (1000 * 60 * 60);
  return hoursDiff <= 48;
}

/**
 * Check if it's a new day (for streak counting).
 */
export function isNewDay(date1: Date, date2: Date): boolean {
  return date1.toDateString() !== date2.toDateString();
}

/**
 * Calculate new streak values based on activity.
 */
export function calculateStreak(
  lastActivityDate: Date | null,
  currentStreak: number,
  longestStreak: number,
  activityDate: Date = new Date()
): { currentStreak: number; longestStreak: number; streakBroken: boolean } {

  // First activity ever
  if (!lastActivityDate) {
    return {
      currentStreak: 1,
      longestStreak: Math.max(1, longestStreak),
      streakBroken: false
    };
  }

  // Same day - no change
  if (!isNewDay(lastActivityDate, activityDate)) {
    return {
      currentStreak,
      longestStreak,
      streakBroken: false
    };
  }

  // New day - check if streak continues
  if (doesContinueStreak(lastActivityDate, activityDate)) {
    const newStreak = currentStreak + 1;
    return {
      currentStreak: newStreak,
      longestStreak: Math.max(newStreak, longestStreak),
      streakBroken: false
    };
  }

  // Streak broken
  return {
    currentStreak: 1,
    longestStreak,
    streakBroken: true
  };
}

// ============================================================================
// ACHIEVEMENT DEFINITIONS
// ============================================================================

export interface AchievementDefinition {
  id: string;
  name: string;
  description: string;
  rarity: Rarity;
  iconName: string;
  checkCondition: (data: AchievementCheckData) => boolean;
}

export interface AchievementCheckData {
  user: {
    totalXP: number;
    level: number;
    currentStreak: number;
    longestStreak: number;
  };
  skillTrees: { id: string }[];
  skills: { id: string; status: string; completedAt: Date | null; treeId: string }[];
  tasks: { id: string; completedAt: Date | null }[];
  activities: { type: ActivityType; createdAt: Date }[];
}

/**
 * Built-in achievement definitions.
 * These should be seeded into the database on first run.
 */
export const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  // COMMON - First steps
  {
    id: "first-skill",
    name: "First Steps",
    description: "Complete your first skill",
    rarity: "COMMON",
    iconName: "🌱",
    checkCondition: (data) => data.skills.filter(s => s.completedAt).length >= 1
  },
  {
    id: "first-tree",
    name: "Tree Planter",
    description: "Create your first skill tree",
    rarity: "COMMON",
    iconName: "🌳",
    checkCondition: (data) => data.skillTrees.length >= 1
  },
  {
    id: "first-task",
    name: "Task Master",
    description: "Complete your first task",
    rarity: "COMMON",
    iconName: "✅",
    checkCondition: (data) => data.tasks.filter(t => t.completedAt).length >= 1
  },

  // RARE - Consistency
  {
    id: "streak-7",
    name: "Week Warrior",
    description: "Maintain a 7-day streak",
    rarity: "RARE",
    iconName: "🔥",
    checkCondition: (data) => data.user.currentStreak >= 7
  },
  {
    id: "skills-10",
    name: "Dedicated Learner",
    description: "Complete 10 skills",
    rarity: "RARE",
    iconName: "📚",
    checkCondition: (data) => data.skills.filter(s => s.completedAt).length >= 10
  },
  {
    id: "level-10",
    name: "Rising Star",
    description: "Reach level 10",
    rarity: "RARE",
    iconName: "⭐",
    checkCondition: (data) => data.user.level >= 10
  },

  // EPIC - Dedication
  {
    id: "streak-30",
    name: "Month Master",
    description: "Maintain a 30-day streak",
    rarity: "EPIC",
    iconName: "🔥",
    checkCondition: (data) => data.user.currentStreak >= 30
  },
  {
    id: "skills-50",
    name: "Knowledge Seeker",
    description: "Complete 50 skills",
    rarity: "EPIC",
    iconName: "🎓",
    checkCondition: (data) => data.skills.filter(s => s.completedAt).length >= 50
  },
  {
    id: "tree-complete",
    name: "Tree Master",
    description: "Complete an entire skill tree",
    rarity: "EPIC",
    iconName: "🏆",
    checkCondition: (data) => {
      // A tree is complete if all its skills are completed
      const completedTrees = data.skillTrees.filter(tree => {
        const treeSkills = data.skills.filter(s => s.treeId === tree.id);
        return treeSkills.length > 0 && treeSkills.every(s => s.status === 'COMPLETED' || s.status === 'MASTERED');
      });
      return completedTrees.length >= 1;
    }
  },

  // LEGENDARY - Mastery
  {
    id: "streak-100",
    name: "Unstoppable",
    description: "Maintain a 100-day streak",
    rarity: "LEGENDARY",
    iconName: "💎",
    checkCondition: (data) => data.user.currentStreak >= 100
  },
  {
    id: "level-50",
    name: "Grandmaster",
    description: "Reach level 50",
    rarity: "LEGENDARY",
    iconName: "👑",
    checkCondition: (data) => data.user.level >= 50
  },
  {
    id: "skills-100",
    name: "Polymath",
    description: "Complete 100 skills",
    rarity: "LEGENDARY",
    iconName: "🧙",
    checkCondition: (data) => data.skills.filter(s => s.completedAt).length >= 100
  },
];

/**
 * Check which achievements user has earned but not yet received.
 */
export function checkNewAchievements(
  data: AchievementCheckData,
  earnedAchievementIds: string[]
): string[] {
  const newAchievements: string[] = [];

  for (const achievement of ACHIEVEMENT_DEFINITIONS) {
    // Skip if already earned
    if (earnedAchievementIds.includes(achievement.id)) continue;

    // Check condition
    if (achievement.checkCondition(data)) {
      newAchievements.push(achievement.id);
    }
  }

  return newAchievements;
}
