"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/providers/AuthContext";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { ownerOrganization, ownerProjects, ownerPlans, Project } from "@/lib/api/owner";
import { Loader2, Calendar, FileText, AlertCircle } from "lucide-react";
import Link from "next/link";

export default function OwnerPlansPage() {
  const { user } = useAuth();
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [plansData, setPlansData] = useState<Record<string, { plan: any; itemCount: number } | null>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const orgRes = await ownerOrganization.get();
        if (orgRes.organization) {
          setOrganizationId(orgRes.organization.id);
          const projectsRes = await ownerProjects.getAll(orgRes.organization.id);
          setProjects(projectsRes.projects || []);

          // Fetch plans for each project
          const plansMap: Record<string, { plan: any; itemCount: number } | null> = {};
          for (const project of projectsRes.projects || []) {
            try {
              const planRes = await ownerPlans.getByProjectId(project.id);
              plansMap[project.id] = {
                plan: planRes.plan,
                itemCount: planRes.items?.length || 0
              };
            } catch {
              plansMap[project.id] = null; // No plan for this project
            }
          }
          setPlansData(plansMap);
        }
      } catch (err) {
        console.error("Failed to fetch plans:", err);
        setError("Failed to load plans");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pt-12 md:pt-0 pb-12">
      <DashboardHeader
        userName={user?.name?.split(" ")[0]}
        title="Project Plans"
      />

      {error && (
        <div className="glass-card rounded-2xl p-6 border-destructive bg-destructive/5">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        </div>
      )}

      {projects.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center">
          <Calendar className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-semibold text-muted-foreground">No Projects</h3>
          <p className="text-sm text-muted-foreground/60 mt-2">
            Create a project to start planning tasks.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {projects.map((project) => {
            const planData = plansData[project.id];
            const hasPlan = !!planData;

            return (
              <Link
                key={project.id}
                href={hasPlan ? `/owner/plans/${project.id}` : "#"}
                className={`glass-card rounded-xl p-6 transition-all ${
                  hasPlan
                    ? "hover:border-primary/50 hover:shadow-lg cursor-pointer"
                    : "opacity-60 cursor-not-allowed"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold mb-2">{project.name}</h3>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar size={14} />
                        {project.start_date} - {project.end_date}
                      </span>
                      {hasPlan && planData && (
                        <span className="flex items-center gap-1">
                          <FileText size={14} />
                          {planData.itemCount} {planData.itemCount === 1 ? "Task" : "Tasks"}
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    {hasPlan ? (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-500 border border-green-500/20">
                        Plan Available
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-muted/50 text-muted-foreground border border-border">
                        No Plan
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
