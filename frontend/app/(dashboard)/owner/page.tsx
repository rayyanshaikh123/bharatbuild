"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/providers/AuthContext";
import { Building2, Users, HardHat, DollarSign, FolderKanban, Loader2, IndianRupeeIcon } from "lucide-react";
import Link from "next/link";
import { OwnerOrganization } from "@/components/dashboard/OrganizationList";
import { PendingManagerRequests } from "@/components/dashboard/PendingManagerRequests";
import { Organization, ownerDashboard, OwnerDashboardSummary, ownerProjects, Project } from "@/lib/api/owner";
import { StatCard } from "@/components/ui/StatCard";
import { ProjectsMapPreview } from "@/components/maps/ProjectsMap";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { ProjectCard } from "@/components/dashboard/ProjectCard";
import { QuickAction } from "@/components/dashboard/QuickAction";
import { ProjectsOverviewCard, BudgetOverviewCard } from "@/components/dashboard/StatsCards";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

  // Dashboard stats section using real API data
  function OwnerDashboardStats({ organizationId }: { organizationId: string }) {
  const [summary, setSummary] = useState<OwnerDashboardSummary | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [summaryRes, projectsRes] = await Promise.all([
          ownerDashboard.getSummary(),
          ownerProjects.getAll(organizationId),
        ]);
        setSummary(summaryRes.summary);
        setProjects(projectsRes.projects || []);
      } catch (err) {
        console.error("Failed to fetch dashboard data:", err);
        setError("Failed to load dashboard statistics");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [organizationId]);

  if (isLoading) {
    return (
      <div className="glass-card rounded-2xl p-8 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Loading enterprise data...</span>
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="glass-card rounded-2xl p-8 text-center text-muted-foreground">
        {error || "No data available"}
      </div>
    );
  }

  // Prepare data for charts
  const projectStatusData = [
    { label: "Active", value: summary.total_projects_active, color: "var(--chart-3)" },
    { label: "Completed", value: summary.total_projects_completed, color: "var(--chart-5)" },
    { label: "Planned", value: summary.total_projects_planned, color: "var(--chart-2)" },
    { label: "On Hold", value: summary.total_projects_on_hold, color: "var(--chart-4)" },
  ];

  const formatBudget = (value: number) => {
    if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
    if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
    if (value >= 1000) return `₹${(value / 1000).toFixed(0)}K`;
    return `₹${value}`;
  };

  const totalBudget = summary.total_budget_planned + summary.total_budget_active + summary.total_budget_completed;

  // Map project data with geofence_radius
  const projectLocations = projects.map(p => ({
    id: p.id,
    name: p.name,
    latitude: p.latitude,
    longitude: p.longitude,
    status: p.status,
    location_text: p.location_text,
    geofence_radius: p.geofence_radius,
  }));

  return (
    <div className="space-y-8">
      {/* 1. KPI Cards (Top Section) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Projects"
          value={summary.total_projects}
          subtitle={`${summary.total_projects_active} active sites`}
          icon={FolderKanban}
        />
        <StatCard
          title="Workforce"
          value={summary.total_site_engineers_approved + summary.total_managers_approved}
          subtitle="Engineers & Managers"
          icon={Users}
        />
        <StatCard
          title="Total Budget"
          value={formatBudget(totalBudget)}
          subtitle={`${formatBudget(summary.total_budget_active)} currently deployed`}
          icon={IndianRupeeIcon}
        />
        <StatCard
          title="Overall Health"
          value={`${Math.round((summary.total_projects_active / (summary.total_projects || 1)) * 100)}%`}
          subtitle="Projects Active"
          icon={Building2}
        />
      </div>

      {/* 2. Charts (Middle Section) */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
           <BudgetOverviewCard
            activeBudget={summary.total_budget_active}
            plannedBudget={summary.total_budget_planned}
            completedBudget={summary.total_budget_completed}
          />
        </div>
        <div className="lg:col-span-1">
          <ProjectsOverviewCard
            data={projectStatusData}
            totalValue={summary.total_projects}
            onHoldCount={summary.total_projects_on_hold}
            viewAllHref="/owner/projects"
          />
        </div>
      </div>

      {/* 3. Bottom Panels (Tabs) */}
      {/* 3. Bottom Panels (Tabs) */}
       <Tabs defaultValue="approvals" className="w-full">
        <div className="flex items-center justify-between mb-4">
          <TabsList className="bg-muted/50 p-1 rounded-xl">
             <TabsTrigger value="approvals" className="rounded-lg">Approvals / Requests</TabsTrigger>
             <TabsTrigger value="map" className="rounded-lg">Project Map</TabsTrigger>
             <TabsTrigger value="labour" className="rounded-lg">Labour & Material</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="approvals" className="space-y-4">
           {/* Re-using PendingManagerRequests but integrated better */}
           <div className="glass-card rounded-2xl p-6">
              <h3 className="font-bold text-lg mb-4 text-foreground">Pending Approvals</h3>
              <PendingManagerRequests organizationId={organizationId} />
           </div>
        </TabsContent>

        <TabsContent value="map">
           {projectLocations.length > 0 ? (
            <ProjectsMapPreview 
              projects={projectLocations} 
              title="Global Project View"
              viewAllHref="/owner/projects"
            />
          ) : (
            <div className="glass-card p-12 text-center text-muted-foreground">No projects with location data.</div>
          )}
        </TabsContent>

        <TabsContent value="labour">
           <div className="glass-card rounded-2xl p-12 flex flex-col items-center justify-center text-center">
              <HardHat className="w-12 h-12 text-muted-foreground opacity-20 mb-4" />
              <h3 className="text-lg font-bold text-muted-foreground">Labour & Material Module</h3>
              <p className="text-sm text-muted-foreground/60 max-w-sm mt-2">
                Detailed breakdowns for labour allocation and material inventory are available in the specific project reports.
              </p>
           </div>
        </TabsContent>
       </Tabs>
    </div>
  );
}

export default function OwnerDashboardPage() {
  const { user } = useAuth();
  const [organization, setOrganization] = useState<Organization | null>(null);

  return (
    <div className="space-y-8 pt-12 md:pt-0 pb-12">
      <DashboardHeader
        userName={user?.name?.split(" ")[0]}
        title="Enterprise Overview"
      />

      <OwnerOrganization onOrganizationLoad={setOrganization} />

      {organization && <OwnerDashboardStats organizationId={organization.id} />}

      {/* Quick Actions removed as they are redundant or can be sidebar items, keeping UI clean for 'Enterprise' look */}
    </div>
  );
}
