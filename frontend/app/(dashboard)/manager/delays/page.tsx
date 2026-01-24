"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/components/providers/AuthContext";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DataTable, Column } from "@/components/ui/DataTable";
import { managerProjects, Project } from "@/lib/api/manager";
import { Loader2, Calendar, AlertTriangle, AlertCircle, CheckCircle2, XCircle, Filter } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner"; // Use sonner instead of use-toast

// Project Selector Component
function ProjectSelector({
  projects,
  selected,
  onSelect,
}: {
  projects: Project[];
  selected: string | null;
  onSelect: (id: string | null) => void;
}) {
  return (
    <select
      value={selected || ""}
      onChange={(e) => onSelect(e.target.value || null)}
      className="h-10 px-3 bg-background/50 border border-border rounded-lg text-sm transition-all min-w-[200px]"
    >
      <option value="">Select a Project</option>
      {projects.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name}
        </option>
      ))}
    </select>
  );
}

export default function ManagerDelaysPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [delays, setDelays] = useState<DelayedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<DelayedItem | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  // Initial Data Fetch (Projects)
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        if (user && (user as any).orgId) {
          const res = await managerProjects.getMyProjects((user as any).orgId);
          setProjects(res.projects || []);
        }
      } catch (err) {
        console.error("Failed to fetch projects", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProjects();
  }, [user]);

  // Fetch Delays
  const fetchDelays = async () => {
    if (!selectedProjectId) return;
    try {
      setIsDataLoading(true);
      const res = await managerDelays.getProjectDelays(selectedProjectId);
      setDelays(res.delayed_items || []);
    } catch (err) {
      console.error("Failed to fetch delays", err);
      toast.error("Failed to load delayed items");
    } finally {
      setIsDataLoading(false);
    }
  };

  useEffect(() => {
    if (selectedProjectId) {
      fetchDelays();
    } else {
      setDelays([]);
    }
  }, [selectedProjectId]);

  // Handle Status Update
  const handleUpdateStatus = async (itemId: string, status: string, delayReason?: string, completedAt?: string) => {
    try {
      await managerDelays.updatePlanItemStatus(itemId, {
        status,
        delay: delayReason,
        completed_at: completedAt
      });
      toast.success("Item status updated successfully");
      setIsSheetOpen(false);
      fetchDelays(); // Refresh list
    } catch (error) {
      console.error("Failed to update status", error);
      toast.error("Failed to update status");
    }
  };

  // Review Dialog Component (Using Sheet now)
  function ReviewSheet({ item }: { item: DelayedItem }) {
    const [status, setStatus] = useState<string>(item.status);
    const [reason, setReason] = useState(item.delay || "");
    const [completedDate, setCompletedDate] = useState("");

    return (
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Review Delay</SheetTitle>
          <SheetDescription>
            Update the status or provide a reason for the delay for <strong>{item.task_name}</strong>.
          </SheetDescription>
        </SheetHeader>
        <div className="grid gap-6 py-6">
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <select
              id="status"
              value={status} 
              onChange={(e) => setStatus(e.target.value)}
              className="w-full h-10 px-3 bg-background border border-input rounded-md text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
               <option value="PENDING">Pending</option>
               <option value="DELAYED">Delayed</option>
               <option value="COMPLETED">Completed</option>
            </select>
          </div>
          
          {status === "DELAYED" && (
            <div className="space-y-2">
              <Label htmlFor="reason">Reason</Label>
              <textarea 
                id="reason" 
                value={reason} 
                onChange={(e) => setReason(e.target.value)} 
                className="w-full min-h-[100px] px-3 py-2 bg-background border border-input rounded-md text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                placeholder="Explain why this task is delayed..."
              />
            </div>
          )}

          {status === "COMPLETED" && (
            <div className="space-y-2">
              <Label htmlFor="completedAt">Completion Date</Label>
              <Input 
                id="completedAt" 
                type="date" 
                value={completedDate} 
                onChange={(e) => setCompletedDate(e.target.value)} 
              />
            </div>
          )}
        </div>
        <SheetFooter>
          <Button onClick={() => handleUpdateStatus(item.plan_item_id, status, reason, completedDate)}>
            Save Changes
          </Button>
        </SheetFooter>
      </SheetContent>
    );
  }

  // Columns
  const columns: Column<DelayedItem>[] = useMemo(
    () => [
      {
        key: "task_name",
        label: "Task",
        sortable: true,
        render: (val) => <span className="font-medium">{val}</span>,
      },
      {
        key: "period_end",
        label: "Planned End",
        sortable: true,
        render: (val) => <span className="text-muted-foreground">{new Date(val).toLocaleDateString()}</span>,
      },
      {
        key: "delay_days",
        label: "Overdue By",
        sortable: true,
        render: (val) => (
          <span className="text-red-400 font-medium flex items-center gap-1">
            <AlertCircle size={14} />
            {Math.floor(val)} days
          </span>
        ),
      },
      {
        key: "status",
        label: "Status",
        width: "100px",
        render: (val) => (
          <span className={`text-xs px-2 py-1 rounded font-medium ${
            val === "DELAYED" ? "bg-red-500/20 text-red-400" : "bg-amber-500/20 text-amber-400"
          }`}>
            {val}
          </span>
        ),
      },
      {
        key: "plan_item_id",
        label: "Actions",
        width: "100px",
        render: (_, item) => (
          <Sheet>
            <SheetTrigger asChild>
              <Button size="sm" variant="outline" onClick={() => setSelectedItem(item)}>
                Review
              </Button>
            </SheetTrigger>
            <ReviewSheet item={item} />
          </Sheet>
        ),
      },
    ],
    []
  );

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pt-12 md:pt-0 pb-12">
      <DashboardHeader userName={user?.name?.split(" ")[0]} title="Delays Management" />

      {/* Controls Bar */}
      <div className="glass-card rounded-2xl p-4 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Filter size={16} />
          <span className="text-sm">Filter:</span>
        </div>
        <ProjectSelector projects={projects} selected={selectedProjectId} onSelect={setSelectedProjectId} />
      </div>

      {/* Main Content */}
      <div className="glass-card rounded-2xl p-6">
        {!selectedProjectId ? (
          <div className="text-center py-12 text-muted-foreground">
            <AlertTriangle className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>Select a project to manage delays</p>
          </div>
        ) : isDataLoading ? (
          <div className="text-center py-12">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
            <p className="text-sm text-muted-foreground mt-2">Loading delays...</p>
          </div>
        ) : (
          <DataTable
            data={delays}
            columns={columns}
            searchable
            searchKeys={["task_name"]}
            emptyMessage="No delayed items found (Great job!)"
          />
        )}
      </div>
    </div>
  );
}
