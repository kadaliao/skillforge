'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ShareTemplateButton } from "./share-template-button";

interface SkillTreeCardProps {
  tree: {
    id: string;
    name: string;
    description: string | null;
    aiGenerated: boolean;
    isTemplate?: boolean;
    isPublic?: boolean;
    skills: Array<{
      status: string;
    }>;
  };
}

export function SkillTreeCard({ tree }: SkillTreeCardProps) {
  const completedCount = tree.skills.filter(
    (s) => s.status === "COMPLETED" || s.status === "MASTERED"
  ).length;

  const progressPercent = tree.skills.length > 0
    ? Math.round((completedCount / tree.skills.length) * 100)
    : 0;

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
            <ShareTemplateButton
              treeId={tree.id}
              treeName={tree.name}
              isTemplate={tree.isTemplate ?? false}
              isPublic={tree.isPublic ?? false}
            />
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
        <Button asChild className="w-full btn-press" variant="outline">
          <Link href={`/tree/${tree.id}`}>View Tree</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
