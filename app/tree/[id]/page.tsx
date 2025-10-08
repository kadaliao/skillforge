import { SkillTreeSimple } from '@/components/skill-tree-simple';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

async function getSkillTree(id: string) {
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const res = await fetch(`${baseUrl}/api/skill-tree/${id}`, {
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error('Failed to fetch skill tree');
  }

  const data = await res.json();
  return data;
}

export default async function SkillTreePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const skillTree = await getSkillTree(id);

  return (
    <div className="container mx-auto py-6 px-4 space-y-6">
      {/* Header */}
      <div className="space-y-3">
        <Link href="/dashboard">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>

        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold">{skillTree.name}</h1>
            {skillTree.description && (
              <p className="text-muted-foreground max-w-3xl">{skillTree.description}</p>
            )}
          </div>
          <Badge variant="secondary" className="shrink-0">
            {skillTree.skills.length} Skills
          </Badge>
        </div>
      </div>

      {/* Skill Tree Content */}
      <SkillTreeSimple skillTree={skillTree} />

      {/* Instructions */}
      <Card className="p-4">
        <div className="flex items-start gap-6 flex-wrap">
          <div className="flex-1 min-w-[300px]">
            <h3 className="text-sm font-semibold mb-2">💡 How to use</h3>
            <p className="text-sm text-muted-foreground">
              Skills are grouped by learning level. Prerequisites show as <strong>↑ arrows</strong>. Click any skill card to view and complete tasks.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold mb-2">Status Legend</h3>
            <div className="flex flex-wrap gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-gray-500" />
                <span>Locked</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                <span>Available</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                <span>In Progress</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                <span>Completed</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                <span>Mastered</span>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
