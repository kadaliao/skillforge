"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface TaskCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  skillId: string;
  onTaskCreated?: () => void;
}

type TaskType = "PRACTICE" | "PROJECT" | "STUDY" | "CHALLENGE" | "MILESTONE";

const TASK_TYPES: { value: TaskType; label: string; description: string }[] = [
  {
    value: "PRACTICE",
    label: "Practice",
    description: "Hands-on practice exercise",
  },
  {
    value: "PROJECT",
    label: "Project",
    description: "Build something practical",
  },
  {
    value: "STUDY",
    label: "Study",
    description: "Read or watch content",
  },
  {
    value: "CHALLENGE",
    label: "Challenge",
    description: "Test your knowledge",
  },
  {
    value: "MILESTONE",
    label: "Milestone",
    description: "Major checkpoint",
  },
];

export function TaskCreateDialog({
  open,
  onOpenChange,
  skillId,
  onTaskCreated,
}: TaskCreateDialogProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    type: "PRACTICE" as TaskType,
    xpReward: 100,
    estimatedHours: 1,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          skillId,
          ...formData,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create task");
      }

      toast.success("Task created successfully");
      onOpenChange(false);
      setFormData({
        title: "",
        description: "",
        type: "PRACTICE",
        xpReward: 100,
        estimatedHours: 1,
      });

      if (onTaskCreated) {
        onTaskCreated();
      }

      router.refresh();
    } catch (error) {
      console.error("Error creating task:", error);
      toast.error(error instanceof Error ? error.message : "Failed to create task");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create New Task</DialogTitle>
            <DialogDescription>
              Add a custom task to this skill. Define what needs to be done and how much XP it's worth.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Task Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                placeholder="e.g., Build a React component"
                required
                maxLength={200}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Detailed instructions or context..."
                rows={3}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="type">Task Type</Label>
              <Select
                value={formData.type}
                onValueChange={(value: TaskType) =>
                  setFormData({ ...formData, type: value })
                }
              >
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TASK_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div>
                        <div className="font-medium">{type.label}</div>
                        <div className="text-xs text-muted-foreground">
                          {type.description}
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="xpReward">XP Reward</Label>
                <Input
                  id="xpReward"
                  type="number"
                  min={1}
                  max={10000}
                  value={formData.xpReward}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      xpReward: parseInt(e.target.value) || 1,
                    })
                  }
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="estimatedHours">Estimated Hours</Label>
                <Input
                  id="estimatedHours"
                  type="number"
                  min={0.1}
                  step={0.5}
                  value={formData.estimatedHours}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      estimatedHours: parseFloat(e.target.value) || 1,
                    })
                  }
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
