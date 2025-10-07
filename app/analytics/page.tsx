"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type ProgressData = {
  data: {
    date: string;
    xpGained: number;
    totalXP: number;
  }[];
  summary: {
    totalXPGained: number;
    daysActive: number;
    avgXPPerDay: number;
  };
};

type SkillsData = {
  summary: {
    totalSkills: number;
    completedSkills: number;
    skillCompletionRate: number;
    totalTasks: number;
    completedTasks: number;
    taskCompletionRate: number;
  };
  byStatus: {
    status: string;
    count: number;
    percentage: number;
  }[];
  byTree: {
    treeId: string;
    treeName: string;
    domain: string;
    total: number;
    completed: number;
    mastered: number;
    completionRate: number;
  }[];
};

const STATUS_COLORS: Record<string, string> = {
  LOCKED: "bg-gray-500",
  AVAILABLE: "bg-blue-500",
  IN_PROGRESS: "bg-yellow-500",
  COMPLETED: "bg-green-500",
  MASTERED: "bg-purple-500",
};

export default function AnalyticsPage() {
  const [progressData, setProgressData] = useState<ProgressData | null>(null);
  const [skillsData, setSkillsData] = useState<SkillsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [progressRes, skillsRes] = await Promise.all([
          fetch(`/api/analytics/progress?days=${days}`),
          fetch("/api/analytics/skills"),
        ]);

        if (progressRes.ok) {
          setProgressData(await progressRes.json());
        }
        if (skillsRes.ok) {
          setSkillsData(await skillsRes.json());
        }
      } catch (error) {
        console.error("Failed to load analytics:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [days]);

  if (loading) {
    return (
      <div className="container mx-auto py-6 px-4">
        <h1 className="text-3xl font-bold mb-6">Analytics</h1>
        <div className="text-center py-12 text-muted-foreground">Loading analytics...</div>
      </div>
    );
  }

  const maxXP = progressData?.data.reduce((max, d) => Math.max(max, d.xpGained), 0) || 1;

  return (
    <div className="container mx-auto py-6 px-4 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">Track your progress and performance</p>
        </div>
        <a
          href="/dashboard"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to Dashboard
        </a>
      </div>

      <Tabs defaultValue="progress" className="space-y-4">
        <TabsList>
          <TabsTrigger value="progress">XP Progress</TabsTrigger>
          <TabsTrigger value="skills">Skills & Tasks</TabsTrigger>
        </TabsList>

        <TabsContent value="progress" className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-4">
              <div className="text-sm text-muted-foreground">Total XP Gained</div>
              <div className="text-2xl font-bold">
                {progressData?.summary.totalXPGained || 0}
              </div>
              <div className="text-xs text-muted-foreground">
                Last {days} days
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-muted-foreground">Days Active</div>
              <div className="text-2xl font-bold">
                {progressData?.summary.daysActive || 0}
              </div>
              <div className="text-xs text-muted-foreground">
                Out of {days} days
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-muted-foreground">Avg XP per Day</div>
              <div className="text-2xl font-bold">
                {progressData?.summary.avgXPPerDay || 0}
              </div>
              <div className="text-xs text-muted-foreground">
                On active days
              </div>
            </Card>
          </div>

          {/* Time Range Selector */}
          <div className="flex gap-2">
            {[7, 14, 30, 90].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-3 py-1 rounded text-sm ${
                  days === d
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted hover:bg-muted/80"
                }`}
              >
                {d} days
              </button>
            ))}
          </div>

          {/* XP Bar Chart */}
          <Card className="p-6">
            <h3 className="font-semibold mb-4">Daily XP Gained</h3>
            <div className="space-y-1">
              {progressData?.data.slice(-30).map((day) => (
                <div key={day.date} className="flex items-center gap-2 text-sm">
                  <div className="w-20 text-xs text-muted-foreground">
                    {new Date(day.date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </div>
                  <div className="flex-1 h-8 flex items-center">
                    <div
                      className="h-6 bg-blue-500 rounded transition-all"
                      style={{
                        width: `${(day.xpGained / maxXP) * 100}%`,
                        minWidth: day.xpGained > 0 ? "2px" : "0",
                      }}
                    />
                    <span className="ml-2 text-xs">{day.xpGained} XP</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Cumulative XP Line Chart */}
          <Card className="p-6">
            <h3 className="font-semibold mb-4">Total XP Over Time</h3>
            <div className="relative h-64 flex items-end gap-1">
              {progressData?.data.slice(-30).map((day, i, arr) => {
                const maxTotal = Math.max(...arr.map((d) => d.totalXP));
                const height = (day.totalXP / maxTotal) * 100;
                return (
                  <div
                    key={day.date}
                    className="flex-1 bg-green-500 rounded-t hover:bg-green-600 transition-all relative group"
                    style={{ height: `${height}%` }}
                  >
                    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block bg-popover text-popover-foreground text-xs p-2 rounded shadow-lg whitespace-nowrap z-10">
                      <div className="font-semibold">{day.totalXP} XP</div>
                      <div className="text-muted-foreground">
                        {new Date(day.date).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="text-xs text-muted-foreground text-center mt-2">
              Last 30 days
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="skills" className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-4">
              <div className="text-sm text-muted-foreground">Total Skills</div>
              <div className="text-2xl font-bold">
                {skillsData?.summary.totalSkills || 0}
              </div>
              <div className="text-xs text-muted-foreground">
                {skillsData?.summary.completedSkills || 0} completed
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-muted-foreground">
                Skill Completion
              </div>
              <div className="text-2xl font-bold">
                {skillsData?.summary.skillCompletionRate || 0}%
              </div>
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mt-2">
                <div
                  className="h-full bg-green-500"
                  style={{
                    width: `${skillsData?.summary.skillCompletionRate || 0}%`,
                  }}
                />
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-muted-foreground">
                Task Completion
              </div>
              <div className="text-2xl font-bold">
                {skillsData?.summary.taskCompletionRate || 0}%
              </div>
              <div className="text-xs text-muted-foreground">
                {skillsData?.summary.completedTasks || 0} /{" "}
                {skillsData?.summary.totalTasks || 0} tasks
              </div>
            </Card>
          </div>

          {/* Skills by Status */}
          <Card className="p-6">
            <h3 className="font-semibold mb-4">Skills by Status</h3>
            <div className="space-y-3">
              {skillsData?.byStatus.map((status) => (
                <div key={status.status} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-3 h-3 rounded-full ${
                          STATUS_COLORS[status.status]
                        }`}
                      />
                      <span>{status.status}</span>
                    </div>
                    <span className="font-semibold">
                      {status.count} ({status.percentage}%)
                    </span>
                  </div>
                  <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${STATUS_COLORS[status.status]}`}
                      style={{ width: `${status.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Skills by Tree */}
          <Card className="p-6">
            <h3 className="font-semibold mb-4">Progress by Skill Tree</h3>
            <div className="space-y-4">
              {skillsData?.byTree.map((tree) => (
                <div key={tree.treeId} className="space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-medium">{tree.treeName}</div>
                      <Badge variant="outline" className="text-xs mt-1">
                        {tree.domain}
                      </Badge>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold">
                        {tree.completionRate}%
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {tree.completed + tree.mastered} / {tree.total} skills
                      </div>
                    </div>
                  </div>
                  <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-green-500 to-purple-500"
                      style={{ width: `${tree.completionRate}%` }}
                    />
                  </div>
                </div>
              ))}
              {(!skillsData?.byTree || skillsData.byTree.length === 0) && (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  No skill trees yet. Create one from the dashboard!
                </div>
              )}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
