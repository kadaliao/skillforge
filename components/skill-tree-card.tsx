'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

interface SkillTreeCardProps {
  tree: {
    id: string;
    name: string;
    description: string | null;
    aiGenerated: boolean;
    skills: Array<{
      status: string;
    }>;
  };
}

export function SkillTreeCard({ tree }: SkillTreeCardProps) {
  const [deleting, setDeleting] = useState(false);

  const completedCount = tree.skills.filter(
    (s) => s.status === "COMPLETED" || s.status === "MASTERED"
  ).length;

  const progressPercent = tree.skills.length > 0
    ? Math.round((completedCount / tree.skills.length) * 100)
    : 0;

  const handleDelete = async () => {
    if (!confirm(`Delete skill tree "${tree.name}"?\n\nThis will permanently delete:\n- ${tree.skills.length} skill(s)\n- All tasks in those skills\n- All progress data\n\nActivity history will be preserved.\n\nThis cannot be undone.`)) {
      return;
    }

    setDeleting(true);
    try {
      const response = await fetch(`/api/skill-tree/${tree.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete skill tree');
      }

      const result = await response.json();
      const xpMsg = result.xpDeducted > 0 ? ` ${result.xpDeducted} XP deducted.` : '';
      toast.success(`Skill tree deleted. ${result.skillsDeleted} skill(s) and ${result.tasksDeleted} task(s) removed.${xpMsg}`);
      window.location.reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete skill tree');
      console.error(error);
      setDeleting(false);
    }
  };

  return (
    <Card className="hover-lift transition-smooth">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1">
            <CardTitle className="line-clamp-1">{tree.name}</CardTitle>
            <CardDescription className="line-clamp-2">
              {tree.description || "No description"}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 ml-2 shrink-0">
            {tree.aiGenerated && (
              <Badge variant="secondary">AI</Badge>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10 btn-press"
              onClick={handleDelete}
              disabled={deleting}
              title="Delete skill tree"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Progress</span>
          <span className="font-medium">{progressPercent}%</span>
        </div>
        <div className="h-2 bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-progress"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{tree.skills.length} skills</span>
          <span>{completedCount} completed</span>
        </div>
        <Button asChild className="w-full btn-press" variant="outline" disabled={deleting}>
          <Link href={`/tree/${tree.id}`}>View Tree</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
