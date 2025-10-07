"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface Task {
  id: string;
  title: string;
  description: string | null;
  type: string;
  xpReward: number;
  completed: boolean;
}

interface TaskCompletionDialogProps {
  task: Task;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (result: TaskCompletionResult) => void;
}

interface TaskCompletionResult {
  xpAwarded: number;
  qualityScore: number | null;
  aiFeedback: string | null;
  skill: {
    id: string;
    currentXP: number;
    currentLevel: number;
    status: string;
    leveledUp: boolean;
  };
  user: {
    totalXP: number;
    level: number;
    leveledUp: boolean;
    xpToNextLevel: number;
    currentStreak: number;
    longestStreak: number;
    streakBroken: boolean;
  };
  unlockedSkills: string[];
  newAchievements: Array<{
    id: string;
    name: string;
    description: string;
    rarity: string;
    iconName: string;
  }>;
}

export function TaskCompletionDialog({
  task,
  open,
  onOpenChange,
  onSuccess,
}: TaskCompletionDialogProps) {
  const [submission, setSubmission] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TaskCompletionResult | null>(null);

  const handleComplete = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/tasks/${task.id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submission: submission.trim() || undefined,
          notes: notes.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to complete task");
      }

      const data = await response.json();
      setResult(data);
      onSuccess(data);

      // Show celebration toast
      if (data.user.leveledUp) {
        toast.success(`🎉 Level Up! You're now level ${data.user.level}!`);
      }
      if (data.skill.leveledUp) {
        toast.success(`⬆️ Skill leveled up to ${data.skill.currentLevel}!`);
      }
      if (data.newAchievements.length > 0) {
        data.newAchievements.forEach((achievement: { iconName: string; name: string }) => {
          toast.success(`${achievement.iconName} Achievement Unlocked: ${achievement.name}!`);
        });
      }
      if (data.unlockedSkills.length > 0) {
        toast.success(`🔓 Unlocked ${data.unlockedSkills.length} new skill(s)!`);
      }
    } catch (error) {
      console.error("Task completion failed:", error);
      toast.error(error instanceof Error ? error.message : "Failed to complete task");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSubmission("");
    setNotes("");
    setResult(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{task.title}</DialogTitle>
          <DialogDescription>
            {task.description || "Complete this task to earn XP and progress in your skill tree."}
          </DialogDescription>
        </DialogHeader>

        {!result ? (
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{task.type}</Badge>
              <span className="text-sm text-muted-foreground">
                {task.xpReward} XP (base reward)
              </span>
            </div>

            <div className="space-y-2">
              <Label htmlFor="submission">
                Submission (optional)
                <span className="text-xs text-muted-foreground ml-2">
                  AI will evaluate your work and adjust XP accordingly
                </span>
              </Label>
              <Textarea
                id="submission"
                placeholder="Describe what you did, share a link to your work, or paste code..."
                value={submission}
                onChange={(e) => setSubmission(e.target.value)}
                rows={6}
                className="resize-none"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                placeholder="Personal notes, reflections, or things to remember..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            {/* Success Summary */}
            <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold">XP Awarded</span>
                <Badge variant="default" className="text-lg">
                  +{result.xpAwarded} XP
                </Badge>
              </div>
              {result.qualityScore && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Quality Score</span>
                  <Badge variant="outline">{result.qualityScore}/10</Badge>
                </div>
              )}
            </div>

            {/* AI Feedback */}
            {result.aiFeedback && (
              <div className="space-y-2">
                <Label>AI Feedback</Label>
                <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                  {result.aiFeedback}
                </div>
              </div>
            )}

            {/* User Progress */}
            <div className="space-y-2">
              <Label>Your Progress</Label>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Level {result.user.level}</span>
                  <span className="text-muted-foreground">
                    {result.user.xpToNextLevel} XP to next level
                  </span>
                </div>
                {result.user.currentStreak > 0 && (
                  <div className="flex justify-between">
                    <span>🔥 Current Streak</span>
                    <span className="font-semibold">{result.user.currentStreak} days</span>
                  </div>
                )}
              </div>
            </div>

            {/* New Achievements */}
            {result.newAchievements.length > 0 && (
              <div className="space-y-2">
                <Label>🏆 New Achievements</Label>
                <div className="space-y-2">
                  {result.newAchievements.map((achievement) => (
                    <div
                      key={achievement.id}
                      className="flex items-center gap-3 rounded-lg border p-3"
                    >
                      <span className="text-2xl">{achievement.iconName}</span>
                      <div className="flex-1">
                        <div className="font-semibold">{achievement.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {achievement.description}
                        </div>
                      </div>
                      <Badge variant={
                        achievement.rarity === "LEGENDARY" ? "default" :
                        achievement.rarity === "EPIC" ? "secondary" :
                        "outline"
                      }>
                        {achievement.rarity}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {!result ? (
            <>
              <Button variant="outline" onClick={handleClose} disabled={loading}>
                Cancel
              </Button>
              <Button onClick={handleComplete} disabled={loading}>
                {loading ? "Completing..." : "Complete Task"}
              </Button>
            </>
          ) : (
            <Button onClick={handleClose}>Close</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
