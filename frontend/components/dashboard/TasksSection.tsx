"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { 
  CheckCircle2, 
  Circle,
  Plus, 
  Trash2,
  X,
  UserPlus,
  Loader2,
  Calendar,
  Star,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { managerPlans, managerSubcontractors, Plan, PlanItem, Subcontractor } from "@/lib/api/manager";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import Link from "next/link";

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
  return null;
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
  organizationId: string;
}

export function TasksSection({ projectId, organizationId }: TasksSectionProps) {
  const [plan, setPlan] = useState<Plan | null>(null);
  const [tasks, setTasks] = useState<PlanItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Rating State
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [ratingTaskId, setRatingTaskId] = useState<string | null>(null);
  const [ratingValue, setRatingValue] = useState(5);

  // Add Task Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTaskName, setNewTaskName] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [newPriority, setNewPriority] = useState(0);
  const [newPeriodType, setNewPeriodType] = useState<"WEEK" | "MONTH">("WEEK");
  const [newPeriodStart, setNewPeriodStart] = useState(new Date().toISOString().split('T')[0]);
  const [newPeriodEnd, setNewPeriodEnd] = useState(new Date().toISOString().split('T')[0]);
  const [newPlannedQuantity, setNewPlannedQuantity] = useState(1);
  const [newPlannedManpower, setNewPlannedManpower] = useState(1);
  const [newPlannedCost, setNewPlannedCost] = useState(0);

  // Subcontractor State
  const [subcontractors, setSubcontractors] = useState<Subcontractor[]>([]);
  const [isLoadingSubs, setIsLoadingSubs] = useState(false);
  
  // Assignment during creation & post-creation
  const [creationSubId, setCreationSubId] = useState(""); 
  const [assignTaskId, setAssignTaskId] = useState<string | null>(null);
  const [selectedSubId, setSelectedSubId] = useState("");

  // Fetch plan and tasks
  const fetchTasks = async () => {
    try {
      setIsLoading(true);
      const res = await managerPlans.getByProjectId(projectId);
      setPlan(res.plan);
      setTasks(res.items || []);
    } catch (err) {
      console.log("No existing plan found or failed to fetch");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSubcontractors = async () => {
    try {
      setIsLoadingSubs(true);
      const res = await managerSubcontractors.getAll(organizationId);
      setSubcontractors(res.subcontractors || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load subcontractors");
    } finally {
      setIsLoadingSubs(false);
    }
  };

  useEffect(() => {
    fetchTasks();
    fetchSubcontractors();
  }, [projectId, organizationId]);

  // Create plan if doesn't exist, then add task
  const handleAddTask = async () => {
    if (!newTaskName.trim()) return;

    try {
      setIsAdding(true);
      let currentPlanId = plan?.id;

      // If no plan exists, create one first
      if (!currentPlanId) {
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

      const itemRes = await managerPlans.addItem(currentPlanId, {
        task_name: newTaskName,
        description: newTaskDescription || undefined,
        period_type: newPeriodType,
        period_start: newPeriodStart,
        period_end: newPeriodEnd,
        planned_quantity: newPlannedQuantity,
        planned_manpower: newPlannedManpower,
        planned_cost: newPlannedCost
      });

      // Update Priority if not 0
      if (newPriority > 0) {
         await managerPlans.updatePriority(itemRes.item.id, newPriority);
      }

      // Assign Subcontractor if selected
      if (creationSubId) {
        await managerSubcontractors.assignToTask(itemRes.item.id, creationSubId, newPeriodStart);
      }
      
      toast.success("Task added successfully");
      setShowAddModal(false);
      resetForm();
      fetchTasks();
    } catch (err) {
      console.error("Failed to add task:", err);
      toast.error("Failed to add task");
    } finally {
      setIsAdding(false);
    }
  };

  const handleAssignSubcontractor = async () => {
    if (!assignTaskId || !selectedSubId) return;
    try {
      await managerSubcontractors.assignToTask(assignTaskId, selectedSubId);
      toast.success("Subcontractor assigned!");
      setAssignTaskId(null);
      setSelectedSubId("");
    } catch (err) {
      toast.error("Failed to assign subcontractor");
      console.error(err);
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    try {
      // Optimistic Update
      setTasks(tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
      await managerPlans.updateStatus(taskId, newStatus);
      toast.success("Status updated");
    } catch (err) {
      console.error(err);
      toast.error("Failed to update status");
      fetchTasks(); // Revert
    }
  };

  const openAssignModal = (taskId: string) => {
    setAssignTaskId(taskId);
    setSelectedSubId("");
  };

  const handleRatingSubmit = async () => {
    if (!ratingTaskId) return;
    try {
      await managerSubcontractors.submitSpeedRating(ratingTaskId, ratingValue);
      
      // Optimistic update
      setTasks(tasks.map(t => 
        t.id === ratingTaskId 
          ? { ...t, speed_rating: ratingValue } 
          : t
      ));
      
      toast.success("Speed rating submitted!");
      setShowRatingModal(false);
      setRatingTaskId(null);
    } catch (err: any) {
      console.error(err);
      if (err.response?.data?.error) {
        toast.error(err.response.data.error);
      } else {
        toast.error("Failed to submit rating");
      }
    }
  };

  const resetForm = () => {
    setNewTaskName("");
    setNewTaskDescription("");
    setNewPriority(0);
    setNewPeriodType("WEEK");
    setNewPeriodStart(new Date().toISOString().split('T')[0]);
    setNewPeriodEnd(new Date().toISOString().split('T')[0]);
    setNewPlannedQuantity(1);
    setNewPlannedManpower(1);
    setNewPlannedCost(0);
    setCreationSubId("");
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm("Delete this task?")) return;
    try {
      await managerPlans.deleteItem(taskId);
      setTasks(tasks.filter(t => t.id !== taskId));
      toast.success("Task deleted");
    } catch (err) {
      console.error("Failed to delete task:", err);
      toast.error("Failed to delete task");
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
      <div className="space-y-4 mb-6">
        {tasks.length === 0 && !isLoading && (
          <div className="text-center py-8 text-muted-foreground bg-muted/20 rounded-xl border border-dashed border-border">
            <p>No tasks yet. Click "Add Task" below!</p>
          </div>
        )}

        {tasks.map((task) => (
          <div key={task.id} className="group flex flex-col md:flex-row md:items-center gap-4 p-4 bg-card border border-border/50 rounded-xl hover:border-primary/30 transition-all shadow-sm">
            
            {/* Status Checkbox */}
            <div className="flex-shrink-0 pt-1 md:pt-0">
               <button
                 onClick={() => handleStatusChange(task.id, task.status === "COMPLETED" ? "PENDING" : "COMPLETED")}
                 className={cn(
                   "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                   task.status === "COMPLETED" 
                     ? "bg-green-500 border-green-500 text-white" 
                     : "border-muted-foreground/30 hover:border-primary"
                 )}
                 title={task.status === "COMPLETED" ? "Mark as Pending" : "Mark as Completed"}
               >
                 {task.status === "COMPLETED" && <CheckCircle2 size={16} />}
               </button>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className={cn(
                  "font-bold text-base truncate transition-all",
                  task.status === "COMPLETED" && "text-muted-foreground line-through decoration-border"
                )}>
                  {task.task_name}
                </span>
                <PriorityBadge priority={task.priority || 0} />
              </div>
              
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1 bg-muted/50 px-2 py-0.5 rounded">
                  <Calendar size={12} />
                  {new Date(task.period_start).toLocaleDateString()}
                </span>
                {task.planned_cost > 0 && (
                  <span>Est: ₹{task.planned_cost}</span>
                )}
              </div>
              
              {task.description && (
                <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{task.description}</p>
              )}
            </div>

            <div className="flex items-center gap-2 self-start md:self-center mt-2 md:mt-0">
               {task.speed_rating ? (
                 <div className="flex items-center gap-1 bg-yellow-500/10 px-2 py-1 rounded border border-yellow-500/20">
                    <span className="text-xs font-bold text-yellow-600">Speed:</span>
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star 
                          key={star} 
                          size={12} 
                          className={cn(
                            star <= (task.speed_rating || 0) ? "fill-yellow-500 text-yellow-500" : "text-muted-foreground/30"
                          )} 
                        />
                      ))}
                    </div>
                 </div>
               ) : task.status === "COMPLETED" ? (
                 <Button 
                    size="sm" 
                    className="h-8 gap-1 text-xs bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/20 hover:text-yellow-700 border-yellow-500/20"
                    variant="outline"
                    onClick={() => {
                      setRatingTaskId(task.id);
                      setRatingValue(5);
                      setShowRatingModal(true);
                    }}
                 >
                    <Star size={14} className="fill-current" /> Rate
                 </Button>
               ) : (
                 <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-8 gap-1 text-xs"
                    onClick={() => openAssignModal(task.id)}
                 >
                    <UserPlus size={14} /> Assign
                 </Button>
               )}

               <button
                  onClick={() => handleDeleteTask(task.id)}
                  className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                  title="Delete Task"
                >
                  <Trash2 size={16} />
                </button>
            </div>
          </div>
        ))}
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
      {showAddModal && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[9999]">
          <div className="bg-card border border-border rounded-2xl shadow-2xl max-w-2xl w-full p-6 space-y-4 max-h-[85vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">Add New Task</h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  resetForm();
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Task Name */}
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

              {/* Description */}
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1 block">
                  Description
                </label>
                <textarea
                  value={newTaskDescription}
                  onChange={(e) => setNewTaskDescription(e.target.value)}
                  placeholder="Enter task description..."
                  rows={2}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary/50 outline-none resize-none"
                  disabled={isAdding}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Subcontractor Assignment */}
                 <div>
                    <label className="text-sm font-medium text-muted-foreground mb-1 block">
                      Assign Subcontractor
                    </label>
                    <select
                      className="w-full h-10 px-3 bg-background border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary/50 outline-none"
                      value={creationSubId}
                      onChange={(e) => setCreationSubId(e.target.value)}
                      disabled={isAdding}
                    >
                       <option value="">No Assignment</option>
                       {subcontractors.length > 0 ? (
                         subcontractors.map(sub => (
                           <option key={sub.id} value={sub.id}>{sub.name} ({sub.specialization || 'General'})</option>
                         ))
                       ) : (
                         <option disabled>No subcontractors available</option>
                       )}
                    </select>
                    {subcontractors.length === 0 && (
                      <p className="text-[10px] text-muted-foreground mt-1">
                        <Link href="/manager/subcontractors" className="underline hover:text-primary">Add subcontractors</Link> to assign tasks.
                      </p>
                    )}
                 </div>

                 {/* Priority */}
                 <div>
                    <label className="text-sm font-medium text-muted-foreground mb-1 block">
                      Priority
                    </label>
                    <PrioritySelector priority={newPriority} onChange={setNewPriority} />
                 </div>
              </div>


              {/* Period Type, Start Date, End Date */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-1 block">
                    Type
                  </label>
                  <select
                    value={newPeriodType}
                    onChange={(e) => setNewPeriodType(e.target.value as "WEEK" | "MONTH")}
                    className="w-full h-10 px-3 bg-background border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary/50 outline-none"
                    disabled={isAdding}
                  >
                    <option value="WEEK">Weekly</option>
                    <option value="MONTH">Monthly</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-1 block">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={newPeriodStart}
                    onChange={(e) => setNewPeriodStart(e.target.value)}
                    className="w-full h-10 px-3 bg-background border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary/50 outline-none"
                    disabled={isAdding}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-1 block">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={newPeriodEnd}
                    onChange={(e) => setNewPeriodEnd(e.target.value)}
                    className="w-full h-10 px-3 bg-background border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary/50 outline-none"
                    disabled={isAdding}
                  />
                </div>
              </div>

              {/* Planning Fields Row */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-1 block">
                    Quantity
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newPlannedQuantity}
                    onChange={(e) => setNewPlannedQuantity(Number(e.target.value))}
                    className="w-full h-10 px-3 bg-background border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary/50 outline-none"
                    disabled={isAdding}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-1 block">
                    Manpower
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newPlannedManpower}
                    onChange={(e) => setNewPlannedManpower(Number(e.target.value))}
                    className="w-full h-10 px-3 bg-background border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary/50 outline-none"
                    disabled={isAdding}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-1 block">
                    Est. Cost (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newPlannedCost}
                    onChange={(e) => setNewPlannedCost(Number(e.target.value))}
                    className="w-full h-10 px-3 bg-background border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary/50 outline-none"
                    disabled={isAdding}
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                onClick={() => {
                  setShowAddModal(false);
                  resetForm();
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
        </div>,
        document.body
      )}

      {/* Assign Subcontractor Modal (Post-creation) */}
      {assignTaskId && typeof document !== 'undefined' && createPortal(
         <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[9999]" onClick={(e) => {
             if (e.target === e.currentTarget) setAssignTaskId(null);
         }}>
             <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-sm p-6 animate-in fade-in zoom-in-95 duration-200">
                 <h3 className="font-bold text-lg mb-4">Assign Subcontractor</h3>
                 
                 {isLoadingSubs ? (
                   <div className="flex justify-center py-4"><Loader2 className="animate-spin text-primary" /></div>
                 ) : (
                   <div className="space-y-4">
                      {subcontractors.length === 0 ? (
                        <div className="text-center py-4">
                           <p className="text-sm text-muted-foreground mb-2">No subcontractors found.</p>
                           <Link href="/manager/subcontractors">
                              <Button variant="outline" size="sm" className="w-full">Manage Subcontractors</Button>
                           </Link>
                        </div>
                      ) : (
                         <>
                            <select 
                              className="w-full h-10 px-3 rounded-lg border border-border bg-background"
                              value={selectedSubId}
                              onChange={(e) => setSelectedSubId(e.target.value)}
                            >
                               <option value="">Select Subcontractor...</option>
                               {subcontractors.map(sub => (
                                 <option key={sub.id} value={sub.id}>{sub.name} ({sub.specialization || "General"})</option>
                               ))}
                            </select>
                            
                            <div className="flex gap-2 pt-2">
                                <Button variant="outline" className="flex-1" onClick={() => setAssignTaskId(null)}>Cancel</Button>
                                <Button 
                                   className="flex-1" 
                                   disabled={!selectedSubId}
                                   onClick={handleAssignSubcontractor}
                                >
                                   Assign
                                </Button>
                            </div>
                         </>
                      )}
                   </div>
                 )}
             </div>
         </div>,
         document.body
      )}

      {/* Speed Rating Modal */}
      {showRatingModal && ratingTaskId && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[9999]" onClick={(e) => {
          if (e.target === e.currentTarget) setShowRatingModal(false);
        }}>
          <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-sm p-6 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="font-bold text-lg mb-4 text-center">Rate Subcontractor Speed</h3>
            
            <div className="flex justify-center gap-2 mb-6">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRatingValue(star)}
                  className="transition-transform hover:scale-110 focus:outline-none"
                >
                  <Star 
                    size={32} 
                    className={cn(
                      "transition-colors", 
                      star <= ratingValue ? "fill-yellow-500 text-yellow-500" : "text-muted-foreground/30"
                    )} 
                  />
                </button>
              ))}
            </div>
            
            <div className="flex gap-2">
               <Button variant="outline" className="flex-1" onClick={() => setShowRatingModal(false)}>Cancel</Button>
               <Button className="flex-1" onClick={handleRatingSubmit}>Submit Rating</Button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

