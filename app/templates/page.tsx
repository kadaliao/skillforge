"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { CloneTemplateDialog } from "@/components/clone-template-dialog"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

interface Template {
  id: string
  name: string
  description: string | null
  domain: string
  createdAt: string
  creator: {
    name: string | null
    image: string | null
  }
  skillCount: number
  aiGenerated: boolean
}

export default function TemplatesPage() {
  const router = useRouter()
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchTemplates() {
      try {
        const res = await fetch("/api/templates")
        const data = await res.json()
        if (data.success) {
          setTemplates(data.data)
        }
      } catch (error) {
        console.error("Failed to fetch templates:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchTemplates()
  }, [])

  if (loading) {
    return (
      <div className="container mx-auto py-6 px-4">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 px-4 space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Skill Tree Templates</h1>
        <p className="text-muted-foreground text-sm">
          Browse and clone community-shared learning paths
        </p>
      </div>

      {templates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">
              No public templates available yet. Be the first to share one!
            </p>
            <Button onClick={() => router.push("/dashboard")}>Go to Dashboard</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <Card key={template.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1 flex-1">
                    <CardTitle className="line-clamp-1">{template.name}</CardTitle>
                    <CardDescription className="line-clamp-2">
                      {template.description || "No description"}
                    </CardDescription>
                  </div>
                  <Badge variant="secondary" className="shrink-0">
                    {template.domain}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Creator info */}
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={template.creator.image || undefined} />
                    <AvatarFallback className="text-xs">
                      {template.creator.name?.[0] || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm text-muted-foreground">
                    by {template.creator.name || "Anonymous"}
                  </span>
                </div>

                {/* Stats */}
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>{template.skillCount} skills</span>
                  {template.aiGenerated && (
                    <Badge variant="outline" className="text-[10px]">
                      AI Generated
                    </Badge>
                  )}
                </div>

                {/* Clone button */}
                <CloneTemplateDialog
                  templateId={template.id}
                  templateName={template.name}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
