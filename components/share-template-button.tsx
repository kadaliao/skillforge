"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreVertical, Share2, ShieldOff, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"

interface ShareTemplateButtonProps {
  treeId: string
  treeName: string
  isTemplate: boolean
  isPublic: boolean
}

export function ShareTemplateButton({ treeId, treeName, isTemplate, isPublic }: ShareTemplateButtonProps) {
  const router = useRouter()
  const [showShareDialog, setShowShareDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [loading, setLoading] = useState(false)
  const isShared = isTemplate && isPublic

  async function handleShare() {
    setLoading(true)
    try {
      const res = await fetch(`/api/skill-tree/${treeId}/share`, {
        method: "POST",
      })
      const data = await res.json()

      if (data.success) {
        router.refresh()
      } else {
        alert(data.error || "Failed to update template status")
      }
    } catch (error) {
      console.error("Share error:", error)
      alert("Failed to update template status")
    } finally {
      setLoading(false)
      setShowShareDialog(false)
    }
  }

  async function handleDelete() {
    setLoading(true)
    try {
      const res = await fetch(`/api/skill-tree/${treeId}`, {
        method: "DELETE",
      })
      const data = await res.json()

      if (data.success) {
        setShowDeleteDialog(false)
        router.refresh()
      } else {
        alert(data.error || "Failed to delete skill tree")
      }
    } catch (error) {
      console.error("Delete error:", error)
      alert("Failed to delete skill tree")
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setShowShareDialog(true)}>
            {isShared ? (
              <>
                <ShieldOff className="mr-2 h-4 w-4" />
                Unshare Template
              </>
            ) : (
              <>
                <Share2 className="mr-2 h-4 w-4" />
                Share as Template
              </>
            )}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setShowDeleteDialog(true)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Tree
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Share/Unshare Dialog */}
      <AlertDialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isShared ? "Remove from Templates?" : "Share as Public Template?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isShared
                ? "This will remove your skill tree from the public template library. Other users will no longer be able to clone it."
                : "This will make your skill tree publicly visible in the template library. Anyone will be able to view and clone it. Your progress data will NOT be shared, only the tree structure."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleShare} disabled={loading}>
              {loading ? "Processing..." : isShared ? "Remove" : "Share"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Skill Tree?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Are you sure you want to delete <strong>&quot;{treeName}&quot;</strong>?
              </p>
              <p className="text-destructive font-medium">
                This action cannot be undone. All skills, tasks, and progress will be permanently deleted.
              </p>
              {isShared && (
                <p className="text-amber-600 dark:text-amber-500 font-medium">
                  ⚠️ This is a public template. Users who already cloned it will keep their copies.
                </p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={loading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {loading ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
