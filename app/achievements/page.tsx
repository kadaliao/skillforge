import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ACHIEVEMENT_DEFINITIONS } from "@/lib/gamification";

export default async function AchievementsPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/auth/signin");
  }

  // Fetch user's unlocked achievements
  const userAchievements = await prisma.userAchievement.findMany({
    where: { userId: session.user.id },
    include: {
      achievement: true,
    },
    orderBy: {
      unlockedAt: "desc",
    },
  });

  const unlockedIds = new Set(userAchievements.map((ua) => ua.achievement.id));

  // Combine with all achievement definitions
  const achievements = ACHIEVEMENT_DEFINITIONS.map((def) => {
    const userAchievement = userAchievements.find(
      (ua) => ua.achievement.id === def.id
    );

    return {
      ...def,
      unlocked: !!userAchievement,
      unlockedAt: userAchievement?.unlockedAt || null,
    };
  });

  // Group by rarity
  const achievementsByRarity = {
    LEGENDARY: achievements.filter((a) => a.rarity === "LEGENDARY"),
    EPIC: achievements.filter((a) => a.rarity === "EPIC"),
    RARE: achievements.filter((a) => a.rarity === "RARE"),
    COMMON: achievements.filter((a) => a.rarity === "COMMON"),
  };

  const totalAchievements = ACHIEVEMENT_DEFINITIONS.length;
  const unlockedCount = userAchievements.length;

  return (
    <div className="container mx-auto py-6 px-4 max-w-6xl">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">🏆 Achievements</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Unlock achievements by completing tasks, maintaining streaks, and mastering skills.
          </p>
        </div>

        {/* Progress */}
        <Card className="p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="text-2xl font-bold">
                {unlockedCount} / {totalAchievements}
              </div>
              <div className="text-xs text-muted-foreground">
                {Math.round((unlockedCount / totalAchievements) * 100)}% completed
              </div>
            </div>
            <div className="flex gap-3">
              {Object.entries(achievementsByRarity).map(([rarity, items]) => {
                const unlocked = items.filter((a) => a.unlocked).length;
                return (
                  <div key={rarity} className="text-center">
                    <div className="text-sm font-semibold">
                      {unlocked}/{items.length}
                    </div>
                    <div className="text-[10px] text-muted-foreground uppercase">
                      {rarity}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>

        {/* Achievement Sections by Rarity */}
        {Object.entries(achievementsByRarity).map(([rarity, items]) => {
          if (items.length === 0) return null;

          const rarityColors = {
            LEGENDARY: "border-purple-500 bg-purple-50 dark:bg-purple-950",
            EPIC: "border-pink-500 bg-pink-50 dark:bg-pink-950",
            RARE: "border-blue-500 bg-blue-50 dark:bg-blue-950",
            COMMON: "border-gray-500 bg-gray-50 dark:bg-gray-950",
          };

          const rarityBadgeColors = {
            LEGENDARY: "bg-purple-500",
            EPIC: "bg-pink-500",
            RARE: "bg-blue-500",
            COMMON: "bg-gray-500",
          };

          return (
            <div key={rarity} className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge
                  className={`${rarityBadgeColors[rarity as keyof typeof rarityBadgeColors]} text-white text-xs`}
                >
                  {rarity}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {items.filter((a) => a.unlocked).length}/{items.length}
                </span>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {items.map((achievement) => (
                  <Card
                    key={achievement.id}
                    className={`p-3 transition-all ${
                      achievement.unlocked
                        ? `border-2 ${rarityColors[rarity as keyof typeof rarityColors]}`
                        : "opacity-50 grayscale"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="text-2xl">{achievement.iconName}</div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm">{achievement.name}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {achievement.description}
                        </div>
                        {achievement.unlocked && achievement.unlockedAt && (
                          <div className="text-[10px] text-muted-foreground mt-1">
                            Unlocked {new Date(achievement.unlockedAt).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                      {achievement.unlocked && (
                        <Badge className="bg-green-500 text-white shrink-0 text-xs h-5">
                          ✓
                        </Badge>
                      )}
                      {!achievement.unlocked && (
                        <Badge variant="outline" className="shrink-0 text-[10px] h-5">
                          Locked
                        </Badge>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
