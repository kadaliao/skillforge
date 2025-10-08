"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

interface Task {
  id: string;
  title: string;
  description: string | null;
  type: string;
  xpReward: number;
  completed: boolean;
  checklistOptions?: string[] | null; // AI-generated checklist
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

// Fallback options when AI doesn't provide checklistOptions (for old data)
function getFallbackOptions(taskType: string): string[] {
  const fallbackMap: Record<string, string[]> = {
    PRACTICE: ["完成所有练习题", "通过自测验证", "理解核心概念"],
    PROJECT: ["完成核心功能开发", "代码已测试通过", "功能可正常演示"],
    STUDY: ["阅读/观看完成", "做了学习笔记", "理解关键知识点"],
    CHALLENGE: ["挑战题目已完成", "通过所有测试用例", "理解解题思路"],
    MILESTONE: ["阶段目标已达成", "输出可验证成果", "完成复盘总结"],
  };
  return fallbackMap[taskType] || ["任务已完成", "理解核心概念", "做了笔记总结"];
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
  const [selectedChecklist, setSelectedChecklist] = useState<string[]>([]);
  const [manualSubmission, setManualSubmission] = useState(""); // 用户手动输入的部分

  // 从数据库获取 AI 生成的勾选选项，如果没有则使用规则引擎作为 fallback
  const checklistOptions = task.checklistOptions && task.checklistOptions.length > 0
    ? task.checklistOptions
    : getFallbackOptions(task.type);

  // 当勾选项变化时，自动更新 submission
  useEffect(() => {
    const checklistText = selectedChecklist.map(opt => `✓ ${opt}`).join('\n');
    if (checklistText) {
      setSubmission(manualSubmission ? `${checklistText}\n\n${manualSubmission}` : checklistText);
    } else {
      setSubmission(manualSubmission);
    }
  }, [selectedChecklist, manualSubmission]);

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
    setManualSubmission("");
    setSelectedChecklist([]);
    setResult(null);
    onOpenChange(false);
  };

  const handleChecklistToggle = (option: string) => {
    setSelectedChecklist(prev =>
      prev.includes(option)
        ? prev.filter(item => item !== option)
        : [...prev, option]
    );
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

            {/* Checklist Options */}
            {checklistOptions.length > 0 && (
              <div className="space-y-2">
                <Label>快速标记完成方式</Label>
                <div className="space-y-2 rounded-lg border p-3 bg-muted/30">
                  {checklistOptions.map((option) => (
                    <div key={option} className="flex items-center space-x-2">
                      <Checkbox
                        id={option}
                        checked={selectedChecklist.includes(option)}
                        onCheckedChange={() => handleChecklistToggle(option)}
                      />
                      <label
                        htmlFor={option}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {option}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="submission">
                补充说明 (optional)
                <span className="text-xs text-muted-foreground ml-2">
                  AI will evaluate your work and adjust XP accordingly
                </span>
              </Label>
              <Textarea
                id="submission"
                placeholder="补充细节、分享链接或粘贴代码..."
                value={manualSubmission}
                onChange={(e) => setManualSubmission(e.target.value)}
                rows={4}
                className="resize-none"
              />
              {selectedChecklist.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  已勾选 {selectedChecklist.length} 项将自动添加到提交内容
                </p>
              )}
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
