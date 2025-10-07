import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default async function DashboardPage() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect("/auth/signin")
  }

  // Fetch user's skill trees with skill counts
  const skillTrees = await prisma.skillTree.findMany({
    where: {
      userId: session.user.id,
    },
    include: {
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
    <div className="container py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Track your learning progress across all skill trees</p>
        </div>
        <Button asChild>
          <Link href="/">Create New Tree</Link>
        </Button>
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
        <h2 className="text-2xl font-semibold">Your Skill Trees</h2>
        {skillTrees.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground mb-4">No skill trees yet. Create your first one!</p>
              <Button asChild>
                <Link href="/">Generate Skill Tree</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {skillTrees.map((tree) => {
              const completedCount = tree.skills.filter(
                (s) => s.status === "COMPLETED" || s.status === "MASTERED"
              ).length
              const progressPercent = tree.skills.length > 0
                ? Math.round((completedCount / tree.skills.length) * 100)
                : 0

              return (
                <Card key={tree.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 flex-1">
                        <CardTitle className="line-clamp-1">{tree.name}</CardTitle>
                        <CardDescription className="line-clamp-2">
                          {tree.description || "No description"}
                        </CardDescription>
                      </div>
                      {tree.aiGenerated && (
                        <Badge variant="secondary" className="ml-2 shrink-0">
                          AI
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-medium">{progressPercent}%</span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>{tree.skills.length} skills</span>
                      <span>{completedCount} completed</span>
                    </div>
                    <Button asChild className="w-full" variant="outline">
                      <Link href={`/tree/${tree.id}`}>View Tree</Link>
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
