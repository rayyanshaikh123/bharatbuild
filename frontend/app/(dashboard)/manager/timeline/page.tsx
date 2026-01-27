"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/components/providers/AuthContext";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DataTable, Column } from "@/components/ui/DataTable";
import { managerProjects, managerOrganization, managerTimeline, Project, TimelineResponse, TimelineItem } from "@/lib/api/manager";
import { Loader2, Calendar, Clock, AlertTriangle, CheckCircle2, Filter, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Project selector
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

// Stats Card Component
function StatsCard({ title, value, icon: Icon, colorClass }: { title: string; value: number | string; icon: any; colorClass: string }) {
  return (
    <Card className="glass-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${colorClass}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}

export default function ManagerTimelinePage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [timelineData, setTimelineData] = useState<TimelineResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDataLoading, setIsDataLoading] = useState(false);

  // Initial Data Fetch (Projects)
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        // Fetch approved organization
        let currentOrgId = (user as any)?.orgId;
        
        if (!currentOrgId && user) {
          const orgRes = await managerOrganization.getMyRequests();
          const approved = orgRes.requests?.find((r: any) => r.status === 'APPROVED');
          if (approved) currentOrgId = approved.org_id;
        }

        if (currentOrgId) {
          const res = await managerProjects.getAllProjects(currentOrgId);
          const authorizedProjects = (res.projects || []).filter((p: any) => p.my_status === 'ACTIVE' || p.is_creator);
          setProjects(authorizedProjects);
        }
      } catch (err) {
        console.error("Failed to fetch projects", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProjects();
  }, [user]);

  // Fetch Timeline Data
  useEffect(() => {
    if (!selectedProjectId) {
      setTimelineData(null);
      return;
    }

    const fetchTimeline = async () => {
      try {
        setIsDataLoading(true);
        const res = await managerTimeline.getProjectTimeline(selectedProjectId);
        setTimelineData(res);
      } catch (err) {
        console.error("Failed to fetch timeline", err);
      } finally {
        setIsDataLoading(false);
      }
    };

    fetchTimeline();
  }, [selectedProjectId]);

  // Columns for Timeline Table
  const columns: Column<TimelineItem>[] = useMemo(
    () => [
      {
        key: "task_name",
        label: "Task Name",
        sortable: true,
        render: (val) => <span className="font-medium">{val}</span>,
      },
      {
        key: "period_start",
        label: "Start Date",
        sortable: true,
        render: (val) => new Date(val).toLocaleDateString(),
      },
      {
        key: "period_end",
        label: "End Date",
        sortable: true,
        render: (val) => new Date(val).toLocaleDateString(),
      },
      {
        key: "status",
        label: "Status",
        width: "120px",
        render: (val) => (
          <span className={`text-xs px-2 py-1 rounded font-medium ${
            val === "COMPLETED" ? "bg-green-500/20 text-green-400" :
            val === "DELAYED" ? "bg-red-500/20 text-red-400" :
            val === "IN_PROGRESS" ? "bg-blue-500/20 text-blue-400" :
            "bg-amber-500/20 text-amber-400"
          }`}>
            {val.replace("_", " ")}
          </span>
        ),
      },
      {
        key: "priority",
        label: "Priority",
        width: "80px",
        render: (val) => (
          <span className={`text-xs px-2 py-1 rounded font-medium ${
            val >= 5 ? "bg-red-500/10 text-red-400" : "bg-muted text-muted-foreground"
          }`}>
            P{val}
          </span>
        ),
      },
      {
        key: "delay_days",
        label: "Delay",
        render: (val) => val > 0 ? (
          <span className="text-red-400 font-medium flex items-center gap-1">
            <AlertCircle size={14} />
            {val} days
          </span>
        ) : (
          <span className="text-muted-foreground">-</span>
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
      <DashboardHeader userName={user?.name?.split(" ")[0]} title="Project Timeline" />

      {/* Controls Bar */}
      <div className="glass-card rounded-2xl p-4 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Filter size={16} />
          <span className="text-sm">Filter:</span>
        </div>
        <ProjectSelector projects={projects} selected={selectedProjectId} onSelect={setSelectedProjectId} />
      </div>

      {/* Main Content */}
      {!selectedProjectId ? (
        <div className="glass-card rounded-2xl p-12 text-center text-muted-foreground">
          <Calendar className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p>Select a project to view its timeline and progress.</p>
        </div>
      ) : isDataLoading ? (
        <div className="glass-card rounded-2xl p-12 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-sm text-muted-foreground mt-2">Loading timeline...</p>
        </div>
      ) : timelineData ? (
        <div className="space-y-6">
          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard 
              title="Overall Progress" 
              value={`${timelineData.overall_progress}%`} 
              icon={CheckCircle2} 
              colorClass="text-green-500" 
            />
            <StatsCard 
              title="Pending Tasks" 
              value={timelineData.pending_tasks} 
              icon={Clock} 
              colorClass="text-blue-500" 
            />
            <StatsCard 
              title="Delayed Tasks" 
              value={timelineData.delayed_tasks} 
              icon={AlertTriangle} 
              colorClass="text-red-500" 
            />
            <StatsCard 
              title="Total Tasks" 
              value={timelineData.total_tasks} 
              icon={Calendar} 
              colorClass="text-purple-500" 
            />
          </div>

          {/* Timeline Table */}
          <div className="glass-card rounded-2xl p-6">
            <h3 className="text-lg font-semibold mb-4 text-gradient">Task Schedule</h3>
            <DataTable
              data={timelineData.timeline}
              columns={columns}
              searchable
              searchKeys={["task_name"]}
              emptyMessage="No tasks found in timeline"
            />
          </div>
        </div>
      ) : (
        <div className="glass-card rounded-2xl p-12 text-center text-muted-foreground">
          <p>No timeline data available.</p>
        </div>
      )}
    </div>
  );
}
