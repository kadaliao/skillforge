'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Loader2, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';

interface SkillData {
  name: string;
  description: string;
  category: string;
  estimatedHours: number;
  xpReward: number;
}

interface SkillTreeData {
  id: string;
  treeName: string;
  domain: string;
  description: string;
  estimatedDuration: string;
  skills: SkillData[];
}

interface SkillTreeGeneratorProps {
  onTreeGenerated?: (tree: SkillTreeData) => void;
}

export function SkillTreeGenerator({ onTreeGenerated }: SkillTreeGeneratorProps) {
  const router = useRouter();
  const [goal, setGoal] = useState('');
  const [currentLevel, setCurrentLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner');
  const [weeklyHours, setWeeklyHours] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState<string[]>([]);

  // Personalization fields
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [userBackground, setUserBackground] = useState('');
  const [existingSkills, setExistingSkills] = useState('');
  const [learningPreferences, setLearningPreferences] = useState('');

  const handleGenerate = async () => {
    if (!goal.trim()) {
      setError('Please enter your learning goal');
      return;
    }

    setLoading(true);
    setError('');
    setProgress([]);

    try {
      console.log('🚀 Sending streaming request to /api/ai/generate-tree-stream');

      const response = await fetch('/api/ai/generate-tree-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goal,
          currentLevel,
          weeklyHours,
          // Personalization fields (optional)
          userBackground: userBackground.trim() || undefined,
          existingSkills: existingSkills.trim() || undefined,
          learningPreferences: learningPreferences.trim() || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body');
      }

      let buffer = '';
      let finalResult: SkillTreeData | null = null;

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6));

            if (data.message) {
              console.log(data.message);
              setProgress((prev) => [...prev, data.message]);
            }

            if (data.success !== undefined) {
              if (data.success) {
                finalResult = data.data;
              } else {
                throw new Error(data.error || 'Failed to generate skill tree');
              }
            }
          }
        }
      }

      if (finalResult) {
        if (onTreeGenerated) {
          onTreeGenerated(finalResult);
        }

        // Redirect to skill tree visualization
        if (finalResult.id) {
          router.push(`/tree/${finalResult.id}`);
        }
      } else {
        throw new Error('No result received from server');
      }
    } catch (err) {
      console.error('❌ Frontend error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      setProgress((prev) => [...prev, `❌ Error: ${err instanceof Error ? err.message : 'Unknown error'}`]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-yellow-500" />
          Create Your Skill Tree
        </CardTitle>
        <CardDescription>
          Tell us your goal, and AI will create a personalized learning path for you
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <label htmlFor="goal" className="text-sm font-medium">
            What do you want to learn?
          </label>
          <Input
            id="goal"
            placeholder="e.g., Become a full-stack web developer"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            disabled={loading}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Current Level</label>
          <div className="flex gap-2">
            {(['beginner', 'intermediate', 'advanced'] as const).map((level) => (
              <Badge
                key={level}
                variant={currentLevel === level ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => !loading && setCurrentLevel(level)}
              >
                {level.charAt(0).toUpperCase() + level.slice(1)}
              </Badge>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="hours" className="text-sm font-medium">
            Weekly Hours Available: {weeklyHours}h
          </label>
          <input
            id="hours"
            type="range"
            min="1"
            max="40"
            value={weeklyHours}
            onChange={(e) => setWeeklyHours(Number(e.target.value))}
            className="w-full"
            disabled={loading}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>1h/week</span>
            <span>40h/week</span>
          </div>
        </div>

        {/* Personalization Section */}
        <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-between hover:bg-muted/50"
              disabled={loading}
            >
              <span className="flex items-center gap-2">
                💬 告诉我们更多
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  可选，但推荐
                </Badge>
              </span>
              {showAdvanced ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>

          <CollapsibleContent className="space-y-4 pt-4">
            {/* Background */}
            <div className="space-y-2">
              <Label htmlFor="background">
                💼 你的背景
                <span className="text-xs text-muted-foreground ml-2 font-normal">
                  职业、教育、工作年限等
                </span>
              </Label>
              <Textarea
                id="background"
                placeholder="例如：前端工程师 3年 / 计算机专业学生 / 转行学编程"
                rows={2}
                value={userBackground}
                onChange={(e) => setUserBackground(e.target.value)}
                disabled={loading}
                className="resize-none"
              />
            </div>

            {/* Existing Skills */}
            <div className="space-y-2">
              <Label htmlFor="skills">
                ✨ 已掌握的技能
                <span className="text-xs text-muted-foreground ml-2 font-normal">
                  相关技术、工具、语言等
                </span>
              </Label>
              <Textarea
                id="skills"
                placeholder="例如：React, TypeScript, Git, 会用 Figma 设计原型"
                rows={2}
                value={existingSkills}
                onChange={(e) => setExistingSkills(e.target.value)}
                disabled={loading}
                className="resize-none"
              />
            </div>

            {/* Learning Preferences */}
            <div className="space-y-2">
              <Label htmlFor="preferences">
                🎯 学习目的和偏好
                <span className="text-xs text-muted-foreground ml-2 font-normal">
                  目的、资源偏好、限制等
                </span>
              </Label>
              <Textarea
                id="preferences"
                placeholder="例如：转行做全栈，喜欢视频教程，预算有限希望免费资源，晚上学习为主"
                rows={3}
                value={learningPreferences}
                onChange={(e) => setLearningPreferences(e.target.value)}
                disabled={loading}
                className="resize-none"
              />
            </div>

            {/* Info Alert */}
            <Alert className="bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800">
              <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <AlertDescription className="text-xs text-blue-900 dark:text-blue-100">
                💡 这些信息会帮助 AI 生成更符合你需求的学习路径。你可以用自然语言描述，AI 会智能理解。
              </AlertDescription>
            </Alert>
          </CollapsibleContent>
        </Collapsible>

        {progress.length > 0 && (
          <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-md p-3 max-h-48 overflow-y-auto">
            <div className="text-xs font-mono space-y-1">
              {progress.map((msg, i) => (
                <div key={i} className="text-blue-900 dark:text-blue-100">
                  {msg}
                </div>
              ))}
            </div>
          </div>
        )}

        {error && (
          <div className="text-sm text-red-500 bg-red-50 dark:bg-red-950 p-3 rounded-md border border-red-200 dark:border-red-800">
            {error}
          </div>
        )}

        <Button
          onClick={handleGenerate}
          disabled={loading}
          className="w-full"
          size="lg"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating Your Skill Tree...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Generate Skill Tree
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
