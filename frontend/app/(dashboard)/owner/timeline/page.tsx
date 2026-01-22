"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/providers/AuthContext";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { ownerOrganization, ownerProjects, ownerTimeline, Project } from "@/lib/api/owner";
import { Loader2, Clock, TrendingUp, AlertTriangle, CheckCircle } from "lucide-react";

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
      className="h-10 px-3 bg-background/50 border border-border rounded-lg text-sm text-foreground focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
    >
      <option value="">Select a project</option>
      {projects.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name}
        </option>
      ))}
    </select>
  );
}

export default function OwnerTimelinePage() {
  const { user } = useAuth();
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [timeline, setTimeline] = useState<any | null>(null);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [isLoadingTimeline, setIsLoadingTimeline] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setIsLoadingProjects(true);
        const orgRes = await ownerOrganization.get();
        if (orgRes.organization) {
          setOrganizationId(orgRes.organization.id);
          const projectsRes = await ownerProjects.getAll(orgRes.organization.id);
          setProjects(projectsRes.projects || []);
        }
      } catch (err) {
        console.error("Failed to fetch projects:", err);
        setError("Failed to load projects");
      } finally {
        setIsLoadingProjects(false);
      }
    };

    fetchInitialData();
  }, []);

  useEffect(() => {
    if (!selectedProjectId) {
      setTimeline(null);
      return;
    }

    const fetchTimeline = async () => {
      try {
        setIsLoadingTimeline(true);
        const res = await ownerTimeline.getProjectTimeline(selectedProjectId);
        setTimeline(res);
      } catch (err) {
        console.error("Failed to fetch timeline:", err);
        setError("Failed to load timeline");
      } finally {
        setIsLoadingTimeline(false);
      }
    };

    fetchTimeline();
  }, [selectedProjectId]);

  if (isLoadingProjects) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pt-12 md:pt-0 pb-12">
      <DashboardHeader userName={user?.name?.split(" ")[0]} title="Project Timeline" />

      <div className="glass-card rounded-2xl p-4">
        <ProjectSelector projects={projects} selected={selectedProjectId} onSelect={setSelectedProjectId} />
      </div>

      {!selectedProjectId ? (
        <div className="glass-card rounded-2xl p-12 text-center">
          <Clock className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-semibold text-muted-foreground">Select a Project</h3>
          <p className="text-sm text-muted-foreground/60 mt-2">
            Choose a project to view its timeline and progress.
          </p>
        </div>
      ) : isLoadingTimeline ? (
        <div className="glass-card rounded-2xl p-12 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : timeline ? (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="glass-card rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/20">
                  <TrendingUp className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Progress</p>
                  <p className="text-2xl font-bold">{timeline.overall_progress}%</p>
                </div>
              </div>
            </div>
            <div className="glass-card rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/20">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Completed</p>
                  <p className="text-2xl font-bold">{timeline.completed_tasks}</p>
                </div>
              </div>
            </div>
            <div className="glass-card rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/20">
                  <Clock className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Pending</p>
                  <p className="text-2xl font-bold">{timeline.pending_tasks}</p>
                </div>
              </div>
            </div>
            <div className="glass-card rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-500/20">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Delayed</p>
                  <p className="text-2xl font-bold">{timeline.delayed_tasks}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Tasks */}
          <div className="glass-card rounded-2xl p-6">
            <h3 className="font-bold text-lg mb-4">Tasks</h3>
            <div className="space-y-2">
              {timeline.timeline.map((task: any) => (
                <div key={task.plan_item_id} className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                  <div>
                    <p className="font-medium">{task.task_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(task.period_start).toLocaleDateString()} - {new Date(task.period_end).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {task.delay_days > 0 && (
                      <span className="text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded">
                        {task.delay_days}d delay
                      </span>
                    )}
                    <span className="text-xs bg-muted px-2 py-1 rounded capitalize">{task.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="glass-card rounded-2xl p-12 text-center">
          <p className="text-muted-foreground">No timeline data available</p>
        </div>
      )}
    </div>
  );
}
