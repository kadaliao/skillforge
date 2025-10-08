'use client';

import { useMemo, useState, useCallback } from 'react';
import {
  ReactFlow,
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  ConnectionMode,
  NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TaskCompletionDialog } from '@/components/task-completion-dialog';
import { TaskCreateDialog } from '@/components/task-create-dialog';
import { toast } from 'sonner';

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
  positionX: number | null;
  positionY: number | null;
  prerequisites: { id: string; name: string }[];
  tasks: {
    id: string;
    title: string;
    completed: boolean;
    xpReward: number;
    type: string;
  }[];
};

type SkillTreeData = {
  id: string;
  name: string;
  description: string | null;
  domain: string;
  skills: SkillData[];
};

// Custom node component
type SkillNodeData = SkillData & { label: string; onNodeClick?: (skillId: string) => void };
function SkillNode({ data }: { data: SkillNodeData }) {
  const statusColors = {
    LOCKED: 'bg-gray-200 dark:bg-gray-800 border-gray-400',
    AVAILABLE: 'bg-blue-50 dark:bg-blue-950 border-blue-500',
    IN_PROGRESS: 'bg-yellow-50 dark:bg-yellow-950 border-yellow-500',
    COMPLETED: 'bg-green-50 dark:bg-green-950 border-green-500',
    MASTERED: 'bg-purple-50 dark:bg-purple-950 border-purple-500',
  };

  const statusBadgeColors = {
    LOCKED: 'bg-gray-500',
    AVAILABLE: 'bg-blue-500',
    IN_PROGRESS: 'bg-yellow-500',
    COMPLETED: 'bg-green-500',
    MASTERED: 'bg-purple-500',
  };

  const completedTasks = data.tasks.filter((t) => t.completed).length;
  const totalTasks = data.tasks.length;
  const progressPercent = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  return (
    <Card
      className={`min-w-[200px] max-w-[250px] p-3 border-2 ${statusColors[data.status]} transition-all hover:shadow-lg cursor-pointer`}
      onClick={() => data.onNodeClick?.(data.id)}
    >
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-sm leading-tight">{data.name}</h3>
          <Badge className={`${statusBadgeColors[data.status]} text-white text-xs shrink-0`}>
            {data.status}
          </Badge>
        </div>

        {data.category && (
          <div className="text-xs text-muted-foreground">{data.category}</div>
        )}

        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span>Level {data.currentLevel}/{data.maxLevel}</span>
            <span>{data.currentXP}/{data.xpToNextLevel} XP</span>
          </div>
          <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all"
              style={{ width: `${(data.currentXP / data.xpToNextLevel) * 100}%` }}
            />
          </div>
        </div>

        {totalTasks > 0 && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span>Tasks</span>
              <span>{completedTasks}/{totalTasks}</span>
            </div>
            <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

const nodeTypes = {
  skillNode: SkillNode,
};

// Auto-layout using dagre
function getLayoutedNodes(skills: SkillData[]): Map<string, { x: number; y: number }> {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  // Configure layout direction (Top to Bottom) with better spacing
  dagreGraph.setGraph({
    rankdir: 'TB',  // Top to Bottom (prerequisite → dependent)
    nodesep: 120,   // Horizontal spacing between nodes in same rank
    ranksep: 200,   // Vertical spacing between ranks (levels)
    marginx: 100,   // Margin around the graph
    marginy: 100,
    align: 'UL',    // Align nodes to upper-left for consistency
  });

  const nodeWidth = 250;
  const nodeHeight = 150;

  // Add nodes to dagre graph
  skills.forEach((skill) => {
    dagreGraph.setNode(skill.id, { width: nodeWidth, height: nodeHeight });
  });

  // Add edges (prerequisites)
  skills.forEach((skill) => {
    skill.prerequisites.forEach((prereq) => {
      dagreGraph.setEdge(prereq.id, skill.id);
    });
  });

  // Calculate layout
  dagre.layout(dagreGraph);

  // Extract positions
  const positions = new Map<string, { x: number; y: number }>();
  skills.forEach((skill) => {
    const node = dagreGraph.node(skill.id);
    // dagre returns center position, we need top-left for React Flow
    positions.set(skill.id, {
      x: node.x - nodeWidth / 2,
      y: node.y - nodeHeight / 2,
    });
  });

  return positions;
}

interface SkillTreeCanvasProps {
  skillTree: SkillTreeData;
}

export function SkillTreeCanvas({ skillTree }: SkillTreeCanvasProps) {
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [skillsData, setSkillsData] = useState(skillTree.skills);
  const [generatingTasks, setGeneratingTasks] = useState(false);

  // Debug: Log skill tree structure on mount
  console.log('[SkillTreeCanvas] Loaded skill tree:', {
    name: skillTree.name,
    totalSkills: skillTree.skills.length,
    skillsWithPrereqs: skillTree.skills.filter(s => s.prerequisites.length > 0).length,
  });

  const selectedSkill = useMemo(
    () => skillsData.find((s) => s.id === selectedSkillId) || null,
    [skillsData, selectedSkillId]
  );

  const selectedTask = useMemo(() => {
    if (!selectedSkill || !selectedTaskId) return null;
    return selectedSkill.tasks.find((t) => t.id === selectedTaskId) || null;
  }, [selectedSkill, selectedTaskId]);

  const handleNodeClick = useCallback((skillId: string) => {
    setSelectedSkillId(skillId);
  }, []);

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
      // Update local skills data to reflect completion
      setSkillsData((prev) =>
        prev.map((skill) => {
          if (skill.id === result.skill.id) {
            // Update the completed skill
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
          // Unlock dependent skills
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

  const handleTaskCreated = useCallback(() => {
    // Refresh skill data after task creation
    window.location.reload();
  }, []);

  const handleTaskDelete = useCallback(async (taskId: string) => {
    if (!confirm('Delete this task? This cannot be undone.')) return;

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete task');

      toast.success('Task deleted');
      window.location.reload();
    } catch (error) {
      toast.error('Failed to delete task');
      console.error(error);
    }
  }, []);

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
      window.location.reload();
    } catch (error) {
      toast.error('Failed to complete tasks');
      console.error(error);
    }
  }, [selectedTasks]);

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
      window.location.reload();
    } catch (error) {
      toast.error('Failed to delete tasks');
      console.error(error);
    }
  }, [selectedTasks]);

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

  // Transform skills into React Flow nodes with auto-layout
  const initialNodes: Node[] = useMemo(() => {
    // Calculate auto-layout positions
    const layoutPositions = getLayoutedNodes(skillsData);

    return skillsData.map((skill) => {
      const autoPos = layoutPositions.get(skill.id) || { x: 0, y: 0 };

      return {
        id: skill.id,
        type: 'skillNode',
        position: {
          // Use manual position if set, otherwise use auto-layout
          x: skill.positionX ?? autoPos.x,
          y: skill.positionY ?? autoPos.y,
        },
        data: {
          ...skill,
          label: skill.name,
          onNodeClick: handleNodeClick,
        },
      };
    });
  }, [skillsData, handleNodeClick]);

  // Transform prerequisites into React Flow edges
  const initialEdges: Edge[] = useMemo(() => {
    const edges: Edge[] = [];

    skillsData.forEach((skill) => {
      skill.prerequisites.forEach((prereq) => {
        // Color and width based on skill status - more visible styles
        let stroke = '#2563eb'; // brighter blue
        let strokeWidth = 4;

        if (skill.status === 'LOCKED') {
          stroke = '#6b7280'; // darker gray for better contrast
          strokeWidth = 3;
        } else if (skill.status === 'COMPLETED' || skill.status === 'MASTERED') {
          stroke = '#16a34a'; // darker green
          strokeWidth = 4;
        } else if (skill.status === 'IN_PROGRESS') {
          stroke = '#ca8a04'; // darker yellow
          strokeWidth = 5;
        } else if (skill.status === 'AVAILABLE') {
          stroke = '#2563eb'; // blue
          strokeWidth = 4;
        }

        edges.push({
          id: `${prereq.id}-${skill.id}`,
          source: prereq.id,
          target: skill.id,
          type: 'smoothstep',
          animated: skill.status === 'IN_PROGRESS',
          style: {
            stroke,
            strokeWidth,
            strokeOpacity: 0.9,
          },
          markerEnd: {
            type: 'arrowclosed',
            color: stroke,
            width: 25,
            height: 25,
          },
          label: undefined, // No labels to keep clean
        });
      });
    });

    console.log(`[SkillTreeCanvas] Generated ${edges.length} edges from skill prerequisites`);
    return edges;
  }, [skillsData]);

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  return (
    <div className="flex gap-4 h-[800px]">
      {/* Skill Tree Visualization */}
      <div className="flex-1 border rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-900">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          connectionMode={ConnectionMode.Strict}
          fitView
          fitViewOptions={{
            padding: 0.2,
            minZoom: 0.5,
            maxZoom: 1.5,
          }}
          minZoom={0.1}
          maxZoom={2}
          defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
          panOnScroll
          panOnDrag
          zoomOnScroll
          zoomOnPinch
          preventScrolling={false}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
        >
          <Background gap={20} size={1} color="#e5e7eb" />
          <Controls showInteractive={false} />
          <MiniMap
            nodeColor={(node) => {
              const skill = node.data as SkillData;
              const colors = {
                LOCKED: '#9ca3af',
                AVAILABLE: '#3b82f6',
                IN_PROGRESS: '#eab308',
                COMPLETED: '#22c55e',
                MASTERED: '#a855f7',
              };
              return colors[skill.status];
            }}
            pannable
            zoomable
          />
        </ReactFlow>
      </div>

      {/* Task Panel */}
      {selectedSkill && (
        <Card className="w-96 p-4 overflow-y-auto flex flex-col">
          <div className="space-y-4 flex-1">
            <div>
              <h3 className="font-semibold text-lg">{selectedSkill.name}</h3>
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
                          window.location.reload();
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
                    <Button size="sm" variant="secondary" onClick={handleBulkComplete}>
                      Complete
                    </Button>
                    <Button size="sm" variant="destructive" onClick={handleBulkDelete}>
                      Delete
                    </Button>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                {selectedSkill.tasks.map((task) => (
                  <div
                    key={task.id}
                    className={`p-2 border rounded-lg ${
                      task.completed
                        ? 'bg-green-50 dark:bg-green-950 border-green-500'
                        : 'hover:bg-muted'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {/* Checkbox for bulk selection */}
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
                          className="h-6 px-2 text-xs"
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
                    <p>Click &ldquo;✨ Generate Tasks&rdquo; to let AI create tasks, or manually add them.</p>
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
    </div>
  );
}
