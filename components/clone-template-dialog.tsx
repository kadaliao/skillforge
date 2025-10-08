"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"

interface CloneTemplateDialogProps {
  templateId: string
  templateName: string
  children?: React.ReactNode
}

export function CloneTemplateDialog({
  templateId,
  templateName,
  children
}: CloneTemplateDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [customName, setCustomName] = useState(templateName)
  const [loading, setLoading] = useState(false)

  // Reset custom name when dialog opens
  function handleOpenChange(isOpen: boolean) {
    setOpen(isOpen)
    if (isOpen) {
      setCustomName(templateName)
    }
  }

  async function handleClone() {
    if (!customName.trim()) {
      alert("Please enter a name for your skill tree")
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/skill-tree/${templateId}/clone`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: customName.trim(),
        }),
      })
      const data = await res.json()

      if (data.success) {
        setOpen(false)
        router.push(`/tree/${data.data.id}`)
      } else {
        alert(data.error || "Failed to clone template")
      }
    } catch (error) {
      console.error("Clone error:", error)
      alert("Failed to clone template")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {children || (
          <Button size="sm" className="w-full">
            Clone Template
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Clone Skill Tree Template</DialogTitle>
          <DialogDescription>
            Give your new skill tree a custom name. You can change it later.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="tree-name">Skill Tree Name</Label>
            <Input
              id="tree-name"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="Enter a name..."
              disabled={loading}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !loading) {
                  handleClone()
                }
              }}
            />
          </div>
          <div className="text-sm text-muted-foreground">
            <p className="font-medium mb-1">Original template:</p>
            <p className="italic">{templateName}</p>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button onClick={handleClone} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Cloning...
              </>
            ) : (
              "Clone"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
