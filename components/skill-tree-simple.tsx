'use client';

import { useState, useCallback, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TaskCompletionDialog } from '@/components/task-completion-dialog';
import { TaskCreateDialog } from '@/components/task-create-dialog';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';

type SkillStatus = 'LOCKED' | 'AVAILABLE' | 'IN_PROGRESS' | 'COMPLETED' | 'MASTERED';

type SkillData = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  currentLevel: number;
  maxLevel: number;
  currentXP: number;
  xpToNextLevel: number;
  status: SkillStatus;
  prerequisites: { id: string; name: string }[];
  tasks: {
    id: string;
    title: string;
    completed: boolean;
    xpReward: number;
    type: string;
    checklistOptions?: string[] | null;
  }[];
};

type SkillTreeData = {
  id: string;
  name: string;
  description: string | null;
  domain: string;
  skills: SkillData[];
};

interface SkillTreeSimpleProps {
  skillTree: SkillTreeData;
}

// Calculate skill levels based on prerequisites (topological sort)
function calculateSkillLevels(skills: SkillData[]): Map<string, number> {
  const levels = new Map<string, number>();
  const visited = new Set<string>();

  function getLevel(skillId: string): number {
    if (levels.has(skillId)) return levels.get(skillId)!;
    if (visited.has(skillId)) return 0; // Circular dependency fallback

    visited.add(skillId);
    const skill = skills.find(s => s.id === skillId);
    if (!skill || skill.prerequisites.length === 0) {
      levels.set(skillId, 0);
      return 0;
    }

    const maxPrereqLevel = Math.max(
      ...skill.prerequisites.map(prereq => getLevel(prereq.id))
    );
    const level = maxPrereqLevel + 1;
    levels.set(skillId, level);
    return level;
  }

  skills.forEach(skill => getLevel(skill.id));
  return levels;
}

// Group skills by level
function groupSkillsByLevel(skills: SkillData[]): SkillData[][] {
  const levels = calculateSkillLevels(skills);
  const maxLevel = Math.max(...Array.from(levels.values()), 0);

  const grouped: SkillData[][] = [];
  for (let i = 0; i <= maxLevel; i++) {
    grouped[i] = skills.filter(skill => levels.get(skill.id) === i);
  }

  return grouped;
}

export function SkillTreeSimple({ skillTree }: SkillTreeSimpleProps) {
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [skillsData, setSkillsData] = useState(skillTree.skills);
  const [generatingTasks, setGeneratingTasks] = useState(false);

  // Refetch skill tree data without page reload
  const refreshSkillTree = useCallback(async () => {
    try {
      const response = await fetch(`/api/skill-tree/${skillTree.id}`, {
        cache: 'no-store',
      });
      if (!response.ok) throw new Error('Failed to refresh data');
      const data = await response.json();
      setSkillsData(data.data.skills);
    } catch (error) {
      console.error('Failed to refresh skill tree:', error);
      toast.error('Failed to refresh data');
    }
  }, [skillTree.id]);

  const selectedSkill = useMemo(
    () => skillsData.find((s) => s.id === selectedSkillId) || null,
    [skillsData, selectedSkillId]
  );

  const selectedTask = useMemo(() => {
    if (!selectedSkill || !selectedTaskId) return null;
    return selectedSkill.tasks.find((t) => t.id === selectedTaskId) || null;
  }, [selectedSkill, selectedTaskId]);

  const skillLevels = useMemo(() => groupSkillsByLevel(skillsData), [skillsData]);

  const handleTaskClick = (task: SkillData['tasks'][0]) => {
    if (task.completed) return;
    setSelectedTaskId(task.id);
    setDialogOpen(true);
  };

  const handleTaskComplete = useCallback(
    (result: {
      skill: { id: string; currentXP: number; currentLevel: number; status: string };
      unlockedSkills: string[];
    }) => {
      setSkillsData((prev) =>
        prev.map((skill) => {
          if (skill.id === result.skill.id) {
            return {
              ...skill,
              currentXP: result.skill.currentXP,
              currentLevel: result.skill.currentLevel,
              status: result.skill.status as SkillStatus,
              tasks: skill.tasks.map((t) =>
                t.id === selectedTaskId ? { ...t, completed: true } : t
              ),
            };
          }
          if (result.unlockedSkills.includes(skill.id)) {
            return { ...skill, status: 'AVAILABLE' as SkillStatus };
          }
          return skill;
        })
      );
      setDialogOpen(false);
      setSelectedTaskId(null);
    },
    [selectedTaskId]
  );

  const handleTaskCreated = useCallback(async () => {
    await refreshSkillTree();
    toast.success('Task created');
  }, [refreshSkillTree]);

  const handleTaskDelete = useCallback(async (taskId: string) => {
    if (!confirm('Delete this task? This cannot be undone.')) return;

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete task');

      toast.success('Task deleted');
      await refreshSkillTree();
    } catch (error) {
      toast.error('Failed to delete task');
      console.error(error);
    }
  }, [refreshSkillTree]);

  const handleSkillDelete = useCallback(async (skillId: string, skillName: string) => {
    if (!confirm(`Delete skill "${skillName}"?\n\nThis will:\n- Delete all tasks in this skill\n- Unlink dependencies from other skills\n- Keep activity history (set to null)\n\nThis cannot be undone.`)) return;

    try {
      const response = await fetch(`/api/skills/${skillId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete skill');
      }

      const result = await response.json();
      toast.success(`Skill deleted. ${result.tasksDeleted} task(s) removed, ${result.dependentsUnlinked} dependent(s) unlinked.`);
      setSelectedSkillId(null); // Close panel since skill is deleted
      await refreshSkillTree();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete skill');
      console.error(error);
    }
  }, [refreshSkillTree]);

  const handleBulkComplete = useCallback(async () => {
    const taskIds = Array.from(selectedTasks);
    if (taskIds.length === 0) return;

    try {
      const response = await fetch('/api/tasks/bulk-complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskIds }),
      });

      if (!response.ok) throw new Error('Failed to complete tasks');

      const result = await response.json();
      toast.success(`Completed ${result.tasksCompleted} tasks! +${result.totalXP} XP`);
      setSelectedTasks(new Set());
      await refreshSkillTree();
    } catch (error) {
      toast.error('Failed to complete tasks');
      console.error(error);
    }
  }, [selectedTasks, refreshSkillTree]);

  const handleBulkDelete = useCallback(async () => {
    const taskIds = Array.from(selectedTasks);
    if (taskIds.length === 0) return;

    if (!confirm(`Delete ${taskIds.length} tasks? This cannot be undone.`)) return;

    try {
      const response = await fetch('/api/tasks/bulk-delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskIds }),
      });

      if (!response.ok) throw new Error('Failed to delete tasks');

      const result = await response.json();
      toast.success(`Deleted ${result.deletedCount} tasks`);
      setSelectedTasks(new Set());
      await refreshSkillTree();
    } catch (error) {
      toast.error('Failed to delete tasks');
      console.error(error);
    }
  }, [selectedTasks, refreshSkillTree]);

  const toggleTaskSelection = useCallback((taskId: string) => {
    setSelectedTasks((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  }, []);

  const statusColors = {
    LOCKED: 'bg-gray-200 dark:bg-gray-800 border-gray-400 text-gray-600 dark:text-gray-400',
    AVAILABLE: 'bg-blue-50 dark:bg-blue-950 border-blue-500 text-blue-900 dark:text-blue-100',
    IN_PROGRESS: 'bg-yellow-50 dark:bg-yellow-950 border-yellow-500 text-yellow-900 dark:text-yellow-100',
    COMPLETED: 'bg-green-50 dark:bg-green-950 border-green-500 text-green-900 dark:text-green-100',
    MASTERED: 'bg-purple-50 dark:bg-purple-950 border-purple-500 text-purple-900 dark:text-purple-100',
  };

  const statusBadgeColors = {
    LOCKED: 'bg-gray-500',
    AVAILABLE: 'bg-blue-500',
    IN_PROGRESS: 'bg-yellow-500',
    COMPLETED: 'bg-green-500',
    MASTERED: 'bg-purple-500',
  };

  return (
    <>
      {/* Background overlay when task panel is open */}
      {selectedSkill && (
        <div
          className="fixed inset-0 bg-black/20 z-40 transition-opacity"
          onClick={() => setSelectedSkillId(null)}
        />
      )}

      {/* Skill Tree - Level-based layout */}
      <div className="space-y-6">
        {skillLevels.map((levelSkills, levelIndex) => (
          <div key={levelIndex} className="space-y-3">
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="text-xs font-semibold px-2.5 py-0.5">
                Level {levelIndex + 1}
              </Badge>
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground">
                {levelSkills.length} skill{levelSkills.length !== 1 ? 's' : ''}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {levelSkills.map((skill) => {
                const completedTasks = skill.tasks.filter((t) => t.completed).length;
                const totalTasks = skill.tasks.length;
                const progressPercent = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

                return (
                  <Card
                    key={skill.id}
                    className={`p-3 border-2 transition-smooth cursor-pointer hover-lift ${
                      selectedSkillId === skill.id ? 'ring-2 ring-primary animate-pulse-ring' : ''
                    } ${statusColors[skill.status]}`}
                    onClick={() => setSelectedSkillId(skill.id)}
                  >
                    <div className="space-y-2.5">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-sm leading-tight line-clamp-2">{skill.name}</h3>
                          {skill.category && (
                            <div className="text-xs text-muted-foreground mt-0.5">{skill.category}</div>
                          )}
                        </div>
                        <Badge className={`${statusBadgeColors[skill.status]} text-white text-[10px] shrink-0 h-5`}>
                          {skill.status === 'IN_PROGRESS' ? 'PROGRESS' : skill.status}
                        </Badge>
                      </div>

                      {/* Prerequisites */}
                      {skill.prerequisites.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {skill.prerequisites.map((prereq) => (
                            <Badge
                              key={prereq.id}
                              variant="secondary"
                              className="text-[10px] h-5 cursor-pointer hover:bg-secondary/80"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedSkillId(prereq.id);
                              }}
                            >
                              ↑ {prereq.name}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {/* Progress Bars */}
                      <div className="space-y-1.5">
                        <div className="space-y-0.5">
                          <div className="flex justify-between text-[10px] text-muted-foreground">
                            <span>Level {skill.currentLevel}/{skill.maxLevel}</span>
                            <span>{skill.currentXP}/{skill.xpToNextLevel} XP</span>
                          </div>
                          <div className="h-1 bg-gray-300 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-600 transition-progress"
                              style={{ width: `${(skill.currentXP / skill.xpToNextLevel) * 100}%` }}
                            />
                          </div>
                        </div>

                        {totalTasks > 0 && (
                          <div className="space-y-0.5">
                            <div className="flex justify-between text-[10px] text-muted-foreground">
                              <span>Tasks</span>
                              <span>{completedTasks}/{totalTasks}</span>
                            </div>
                            <div className="h-1 bg-gray-300 dark:bg-gray-700 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-green-600 transition-progress"
                                style={{ width: `${progressPercent}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Task Panel - Fixed positioning */}
      {selectedSkill && (
        <Card className="fixed right-4 top-20 bottom-4 w-96 p-4 overflow-y-auto flex flex-col z-50 shadow-2xl">
          <div className="space-y-4 flex-1">
            <div>
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-semibold text-lg flex-1">{selectedSkill.name}</h3>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => handleSkillDelete(selectedSkill.id, selectedSkill.name)}
                  title="Delete skill"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              {selectedSkill.description && (
                <p className="text-sm text-muted-foreground mt-1">
                  {selectedSkill.description}
                </p>
              )}
            </div>

            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Level</span>
                <span className="font-semibold">
                  {selectedSkill.currentLevel}/{selectedSkill.maxLevel}
                </span>
              </div>
              <div className="flex justify-between">
                <span>XP</span>
                <span className="font-semibold">
                  {selectedSkill.currentXP}/{selectedSkill.xpToNextLevel}
                </span>
              </div>
            </div>

            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-sm">Tasks</h4>
                <div className="flex gap-2">
                  {selectedSkill.tasks.length === 0 && (
                    <Button
                      size="sm"
                      onClick={async () => {
                        setGeneratingTasks(true);
                        toast.info('Generating tasks with AI...', { duration: 2000 });
                        try {
                          const response = await fetch('/api/ai/generate-tasks', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ skillId: selectedSkillId }),
                          });

                          if (!response.ok) throw new Error('Failed to generate tasks');

                          toast.success('Tasks generated successfully!');
                          await refreshSkillTree();
                          setGeneratingTasks(false);
                        } catch (error) {
                          toast.error('Failed to generate tasks');
                          console.error(error);
                          setGeneratingTasks(false);
                        }
                      }}
                      disabled={generatingTasks}
                    >
                      {generatingTasks ? (
                        <>
                          <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Generating...
                        </>
                      ) : (
                        <>✨ Generate Tasks</>
                      )}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setCreateDialogOpen(true)}
                    className="btn-press"
                  >
                    + Add Task
                  </Button>
                </div>
              </div>

              {/* Bulk Actions Toolbar */}
              {selectedTasks.size > 0 && (
                <div className="flex items-center gap-2 mb-2 p-2 bg-muted rounded-lg">
                  <span className="text-sm font-medium">{selectedTasks.size} selected</span>
                  <div className="flex gap-1 ml-auto">
                    <Button size="sm" onClick={handleBulkComplete} className="btn-press bg-primary text-primary-foreground hover:bg-primary/90">
                      Complete
                    </Button>
                    <Button size="sm" variant="destructive" onClick={handleBulkDelete} className="btn-press">
                      Delete
                    </Button>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                {selectedSkill.tasks.map((task) => (
                  <div
                    key={task.id}
                    className={`p-2 border rounded-lg transition-smooth ${
                      task.completed
                        ? 'bg-green-50 dark:bg-green-950 border-green-500'
                        : 'hover:bg-muted'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {!task.completed && (
                        <input
                          type="checkbox"
                          checked={selectedTasks.has(task.id)}
                          onChange={() => toggleTaskSelection(task.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="mt-1 cursor-pointer"
                        />
                      )}

                      <div
                        className="flex-1 cursor-pointer"
                        onClick={() => !task.completed && handleTaskClick(task)}
                      >
                        <div className="text-sm font-medium">{task.title}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {task.type}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {task.xpReward} XP
                          </span>
                        </div>
                      </div>

                      {task.completed ? (
                        <Badge className="bg-green-500 text-white shrink-0">
                          ✓
                        </Badge>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 px-2 text-xs btn-press"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTaskDelete(task.id);
                          }}
                        >
                          Delete
                        </Button>
                      )}
                    </div>
                  </div>
                ))}

                {selectedSkill.tasks.length === 0 && (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    <p className="mb-2">No tasks yet for this skill.</p>
                    <p>Click "✨ Generate Tasks" to let AI create tasks, or manually add them.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Task Completion Dialog */}
      {selectedTask && (
        <TaskCompletionDialog
          task={{
            id: selectedTask.id,
            title: selectedTask.title,
            description: null,
            type: selectedTask.type,
            xpReward: selectedTask.xpReward,
            completed: selectedTask.completed,
          }}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSuccess={handleTaskComplete}
        />
      )}

      {/* Task Create Dialog */}
      {selectedSkillId && (
        <TaskCreateDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          skillId={selectedSkillId}
          onTaskCreated={handleTaskCreated}
        />
      )}
    </>
  );
}
