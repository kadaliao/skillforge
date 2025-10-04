'use client';

import { useMemo } from 'react';
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
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

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
function SkillNode({ data }: { data: SkillData & { label: string } }) {
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
      className={`min-w-[200px] max-w-[250px] p-3 border-2 ${statusColors[data.status]} transition-all hover:shadow-lg`}
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

interface SkillTreeCanvasProps {
  skillTree: SkillTreeData;
}

export function SkillTreeCanvas({ skillTree }: SkillTreeCanvasProps) {
  // Transform skills into React Flow nodes
  const initialNodes: Node[] = useMemo(() => {
    return skillTree.skills.map((skill, index) => ({
      id: skill.id,
      type: 'skillNode',
      position: {
        x: skill.positionX ?? index * 300,
        y: skill.positionY ?? Math.floor(index / 3) * 200,
      },
      data: {
        ...skill,
        label: skill.name,
      },
    }));
  }, [skillTree.skills]);

  // Transform prerequisites into React Flow edges
  const initialEdges: Edge[] = useMemo(() => {
    const edges: Edge[] = [];

    skillTree.skills.forEach((skill) => {
      skill.prerequisites.forEach((prereq) => {
        edges.push({
          id: `${prereq.id}-${skill.id}`,
          source: prereq.id,
          target: skill.id,
          type: 'smoothstep',
          animated: skill.status === 'IN_PROGRESS',
          style: {
            stroke: skill.status === 'LOCKED' ? '#9ca3af' : '#3b82f6',
            strokeWidth: 2,
          },
        });
      });
    });

    return edges;
  }, [skillTree.skills]);

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  return (
    <div className="w-full h-[800px] border rounded-lg overflow-hidden">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        connectionMode={ConnectionMode.Strict}
        fitView
        minZoom={0.1}
        maxZoom={2}
      >
        <Background />
        <Controls />
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
        />
      </ReactFlow>
    </div>
  );
}
