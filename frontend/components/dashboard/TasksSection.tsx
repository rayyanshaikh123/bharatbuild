"use client";

import { useState, useEffect } from "react";
import { 
  CheckCircle2, 
  Circle, 
  Plus, 
  GripVertical, 
  Trash2,
  AlertCircle,
  Clock,
  ArrowUp,
  X
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Sortable, SortableItem, SortableItemHandle } from "@/components/ui/sortable";
import { managerPlans, Plan, PlanItem } from "@/lib/api/manager";
import { cn } from "@/lib/utils";

// Priority Badge Component
function PriorityBadge({ priority }: { priority: number }) {
  // 0-3: Normal/Low, 4-5: High/Urgent
  if (priority >= 4) {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-500/10 text-red-500 border border-red-500/20">
        <AlertCircle size={10} />
        HIGH
      </span>
    );
  }
  return null; // Don't show anything for normal priority to keep UI clean
}

// Priority Selector
function PrioritySelector({ 
  priority, 
  onChange 
}: { 
  priority: number; 
  onChange: (p: number) => void;
}) {
  return (
    <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-md">
      {[0, 1, 2, 3, 4, 5].map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onChange(p)}
          className={cn(
            "w-5 h-5 flex items-center justify-center rounded text-[10px] font-medium transition-all",
            priority === p 
              ? p >= 4 
                ? "bg-red-500 text-white shadow-sm" 
                : "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:bg-background"
          )}
          title={p >= 4 ? "High Priority" : "Normal Priority"}
        >
          {p}
        </button>
      ))}
    </div>
  );
}

interface TasksSectionProps {
  projectId: string;
}

export function TasksSection({ projectId }: TasksSectionProps) {
  const [plan, setPlan] = useState<Plan | null>(null);
  const [tasks, setTasks] = useState<PlanItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newTaskName, setNewTaskName] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [newPriority, setNewPriority] = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);

  // Fetch plan and tasks
  const fetchTasks = async () => {
    try {
      setIsLoading(true);
      const res = await managerPlans.getByProjectId(projectId);
      setPlan(res.plan);
      setTasks(res.items || []);
    } catch (err) {
      // It's possible no plan exists yet, which is fine
      console.log("No existing plan found or failed to fetch");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [projectId]);

  // Create plan if doesn't exist, then add task
  const handleAddTask = async () => {
    if (!newTaskName.trim()) return;

    try {
      setIsAdding(true);
      let currentPlanId = plan?.id;

      // If no plan exists, create one first
      if (!currentPlanId) {
        // Default to a 1-month plan for now since UI doesn't ask for dates yet
        const startDate = new Date().toISOString().split('T')[0];
        const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        
        const planRes = await managerPlans.create({
          project_id: projectId,
          start_date: startDate,
          end_date: endDate
        });
        setPlan(planRes.plan);
        currentPlanId = planRes.plan.id;
      }

      // Add the task
      const today = new Date().toISOString().split('T')[0];
      await managerPlans.addItem(currentPlanId, {
        task_name: newTaskName,
        description: newTaskDescription || undefined,
        period_type: "WEEK", // Valid values: WEEK or MONTH
        period_start: today,
        period_end: today,
        planned_quantity: 1,
        planned_manpower: 1,
        planned_cost: 0
      });
      
      setShowAddModal(false);
      setNewTaskName("");
      setNewTaskDescription("");
      setNewPriority(0);
      await fetchTasks();
    } catch (err) {
      console.error("Failed to add task:", err);
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm("Delete this task?")) return;
    try {
      await managerPlans.deleteItem(taskId);
      setTasks(tasks.filter(t => t.id !== taskId));
    } catch (err) {
      console.error("Failed to delete task:", err);
    }
  };
  
  const handlePriorityChange = async (taskId: string, newPriority: number) => {
    try {
      // Optimistic update
      setTasks(tasks.map(t => t.id === taskId ? { ...t, priority: newPriority } as any : t));
      await managerPlans.updatePriority(taskId, newPriority);
    } catch (err) {
      console.error("Failed to update priority:", err);
      // Revert on failure
      fetchTasks();
    }
  };

  return (
    <div className="glass-card rounded-2xl p-6 mt-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-bold text-lg flex items-center gap-2">
          <CheckCircle2 className="text-primary" size={20} />
          Project Tasks
        </h3>
        <span className="text-xs text-muted-foreground px-2 py-1 bg-muted rounded-full">
          {tasks.length} Tasks
        </span>
      </div>

      {/* Task List */}
      <div className="space-y-3 mb-6">
        {tasks.length === 0 && !isLoading && (
          <div className="text-center py-8 text-muted-foreground bg-muted/20 rounded-xl border border-dashed border-border">
            <p>No tasks yet. Click "Add Task" below!</p>
          </div>
        )}

        <Sortable
          value={tasks}
          onValueChange={(newTasks) => setTasks(newTasks)}
          getItemValue={(item) => item.id}
          orientation="vertical"
        >
          {tasks.map((task) => (
             <SortableItem key={task.id} value={task.id} asChild>
              <div className="group flex items-center gap-3 p-3 bg-card border border-border/50 rounded-xl hover:border-primary/30 transition-all shadow-sm">
                <SortableItemHandle className="text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing p-1">
                  <GripVertical size={16} />
                </SortableItemHandle>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{task.task_name}</span>
                    <PriorityBadge priority={(task as any).priority || 0} />
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                    <span>{task.period_type}</span>
                    <span>•</span>
                    <span>{new Date(task.period_start).toLocaleDateString()}</span>
                  </div>
                  {task.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{task.description}</p>
                  )}
                </div>

                {/* Priority Quick Actions */}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2">
                   <div className="flex flex-col gap-0.5">
                      <button 
                        onClick={() => handlePriorityChange(task.id, Math.min(5, ((task as any).priority || 0) + 1))}
                        className="text-muted-foreground hover:text-orange-500"
                        title="Increase Priority"
                      >
                       <ArrowUp size={14} />
                      </button>
                   </div>
                   <span className={cn(
                     "text-xs font-mono w-4 text-center",
                     ((task as any).priority || 0) >= 4 ? "text-red-500 font-bold" : "text-muted-foreground"
                   )}>
                     {(task as any).priority || 0}
                   </span>
                </div>

                <div className="h-8 w-[1px] bg-border mx-1" />

                <button
                  onClick={() => handleDeleteTask(task.id)}
                  className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </SortableItem> 
          ))}
        </Sortable>
      </div>

      {/* Add Task Button */}
      <Button
        onClick={() => setShowAddModal(true)}
        className="w-full justify-center gap-2"
        variant="outline"
      >
        <Plus size={18} />
        Add Task
      </Button>

      {/* Add Task Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">Add New Task</h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setNewTaskName("");
                  setNewTaskDescription("");
                  setNewPriority(0);
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1 block">
                  Task Name *
                </label>
                <input
                  type="text"
                  value={newTaskName}
                  onChange={(e) => setNewTaskName(e.target.value)}
                  placeholder="Enter task name..."
                  className="w-full h-10 px-3 bg-background border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary/50 outline-none"
                  disabled={isAdding}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1 block">
                  Description
                </label>
                <textarea
                  value={newTaskDescription}
                  onChange={(e) => setNewTaskDescription(e.target.value)}
                  placeholder="Enter task description..."
                  rows={3}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary/50 outline-none resize-none"
                  disabled={isAdding}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1 block">
                  Priority
                </label>
                <PrioritySelector priority={newPriority} onChange={setNewPriority} />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                onClick={() => {
                  setShowAddModal(false);
                  setNewTaskName("");
                  setNewTaskDescription("");
                  setNewPriority(0);
                }}
                variant="outline"
                className="flex-1"
                disabled={isAdding}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddTask}
                className="flex-1"
                disabled={isAdding || !newTaskName.trim()}
              >
                {isAdding ? "Adding..." : "Add Task"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
