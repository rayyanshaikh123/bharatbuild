"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/providers/AuthContext";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { ownerAnalytics, ownerProjects, ownerOrganization, Project } from "@/lib/api/owner";
import { ProjectAnalyticsDetail } from "@/components/dashboard/ProjectAnalyticsDetail";
import { Loader2, TrendingUp, DollarSign, Activity, Target, AlertCircle } from "lucide-react";

export default function OwnerAnalyticsPage() {
  const { user } = useAuth();
  const [overview, setOverview] = useState<any | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [projectAnalytics, setProjectAnalytics] = useState<any | null>(null);
  const [isLoadingOverview, setIsLoadingOverview] = useState(true);
  const [isLoadingProject, setIsLoadingProject] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoadingOverview(true);
        
        // Get overview
        const analyticsRes = await ownerAnalytics.getOverview();
        setOverview(analyticsRes);

        // Get projects for selector
        const orgRes = await ownerOrganization.get();
        if (orgRes.organization) {
          const projectsRes = await ownerProjects.getAll(orgRes.organization.id);
          setProjects(projectsRes.projects || []);
        }
      } catch (err) {
        console.error("Failed to fetch analytics:", err);
      } finally {
        setIsLoadingOverview(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (!selectedProjectId) {
      setProjectAnalytics(null);
      return;
    }

    const fetchProjectAnalytics = async () => {
      try {
        setIsLoadingProject(true);
        const res = await ownerAnalytics.getProjectAnalytics(selectedProjectId);
        setProjectAnalytics(res);
      } catch (err) {
        console.error("Failed to fetch project analytics:", err);
      } finally {
        setIsLoadingProject(false);
      }
    };

    fetchProjectAnalytics();
  }, [selectedProjectId]);

  if (isLoadingOverview) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pt-12 md:pt-0 pb-12">
      <DashboardHeader userName={user?.name?.split(" ")[0]} title="Analytics Dashboard" />

      {/* Organization Overview */}
      {overview && (
        <>
          <h3 className="text-lg font-bold">Organization Overview</h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="glass-card rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/20">
                  <Activity className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Projects</p>
                  <p className="text-2xl font-bold">{overview.total_projects || 0}</p>
                </div>
              </div>
            </div>

            <div className="glass-card rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/20">
                  <Target className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Active</p>
                  <p className="text-2xl font-bold">{overview.active_projects || 0}</p>
                </div>
              </div>
            </div>

            <div className="glass-card rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/20">
                  <DollarSign className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Budget</p>
                  <p className="text-xl font-bold">
                    {new Intl.NumberFormat("en-IN", {
                      style: "currency",
                      currency: "INR",
                      maximumFractionDigits: 0,
                    }).format(overview.total_budget || 0)}
                  </p>
                </div>
              </div>
            </div>

            <div className="glass-card rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/20">
                  <TrendingUp className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Completion Rate</p>
                  <p className="text-2xl font-bold">{overview.completion_rate || 0}%</p>
                </div>
              </div>
            </div>
          </div>

          {/* Additional metrics if available */}
          {overview.total_spent !== undefined && (
            <div className="glass-card rounded-xl p-6">
              <h4 className="font-semibold mb-4">Financial Overview</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Total Spent</p>
                  <p className="text-xl font-bold text-primary">
                    {new Intl.NumberFormat("en-IN", {
                      style: "currency",
                      currency: "INR",
                      maximumFractionDigits: 0,
                    }).format(overview.total_spent)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Budget Utilization</p>
                  <p className="text-xl font-bold">
                    {overview.total_budget > 0 
                      ? Math.round((overview.total_spent / overview.total_budget) * 100) 
                      : 0}%
                  </p>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Project Analytics */}
      <div className="glass-card rounded-xl p-6">
        <h3 className="font-bold text-lg mb-4">Project Analytics</h3>
        
        <select
          value={selectedProjectId || ""}
          onChange={(e) => setSelectedProjectId(e.target.value || null)}
          className="w-full md:w-80 h-10 px-3 bg-background/50 border border-border rounded-lg text-sm mb-6"
        >
          <option value="">Select a project to view analytics</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.status})
            </option>
          ))}
        </select>

        {isLoadingProject ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Loading analytics...</span>
          </div>
        ) : projectAnalytics ? (
          <ProjectAnalyticsDetail data={projectAnalytics} />
        ) : selectedProjectId ? (
          <div className="text-center py-12 text-muted-foreground">
            <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No analytics data available for this project</p>
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground border-2 border-dashed border-border rounded-xl">
            <Activity className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Select a project above to view detailed analytics</p>
          </div>
        )}
      </div>
    </div>
  );
}
