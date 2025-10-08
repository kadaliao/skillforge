import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { SkillTreeCard } from "@/components/skill-tree-card"

export default async function DashboardPage() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect("/auth/signin")
  }

  // Fetch user's skill trees with skill counts and template info
  const skillTrees = await prisma.skillTree.findMany({
    where: {
      userId: session.user.id,
    },
    select: {
      id: true,
      name: true,
      description: true,
      aiGenerated: true,
      isTemplate: true,
      isPublic: true,
      createdAt: true,
      skills: {
        select: {
          id: true,
          status: true,
        },
      },
      _count: {
        select: {
          skills: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  })

  // Calculate stats
  const totalTrees = skillTrees.length
  const totalSkills = skillTrees.reduce((sum, tree) => sum + tree._count.skills, 0)
  const completedSkills = skillTrees.reduce(
    (sum, tree) =>
      sum + tree.skills.filter((s) => s.status === "COMPLETED" || s.status === "MASTERED").length,
    0
  )

  return (
    <div className="container mx-auto py-6 px-4 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground text-sm">Track your learning progress</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild size="sm" className="btn-press">
            <Link href="/analytics">Analytics</Link>
          </Button>
          <Button asChild size="sm" className="btn-press">
            <Link href="/">+ New Tree</Link>
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Skill Trees</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTrees}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Skills</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSkills}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Skills</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedSkills}</div>
            <p className="text-xs text-muted-foreground">
              {totalSkills > 0 ? Math.round((completedSkills / totalSkills) * 100) : 0}% of total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Skill Trees List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Your Skill Trees</h2>
          {skillTrees.length > 0 && (
            <span className="text-sm text-muted-foreground">{skillTrees.length} tree{skillTrees.length !== 1 ? 's' : ''}</span>
          )}
        </div>
        {skillTrees.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground mb-4">No skill trees yet. Create your first one!</p>
              <Button asChild className="btn-press">
                <Link href="/">Generate Skill Tree</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {skillTrees.map((tree) => (
              <SkillTreeCard key={tree.id} tree={tree} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
