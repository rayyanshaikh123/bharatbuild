"use client";

import { useAuth } from "@/components/providers/AuthContext";
import { useEffect, useState } from "react";
import { Building2, Users, Loader2, Clock, CheckCircle2, MapPin, Phone, FolderKanban, HardHat, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { managerOrganization, OrganizationListItem, ManagerOrgRequest, managerDashboard, ManagerDashboardSummary, managerProjects, Project } from "@/lib/api/manager";
import { StatCard } from "@/components/ui/StatCard";
import { ProjectsMapPreview } from "@/components/maps/ProjectsMap";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { ProjectCard } from "@/components/dashboard/ProjectCard";
import { QuickAction } from "@/components/dashboard/QuickAction";
import { ProjectsOverviewCard } from "@/components/dashboard/StatsCards";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Engineers Overview Card
function EngineersOverviewCard({ approved, pending }: { approved: number; pending: number }) {
  return (
    <div className="glass-card rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-bold text-foreground text-lg">Engineers Overview</h3>
        <Link href="/manager/engineers" className="text-muted-foreground hover:text-primary transition-colors">
          <HardHat size={18} />
        </Link>
      </div>
      
      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-500/10 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
              <CheckCircle2 size={20} className="text-green-600 dark:text-green-400" />
            </div>
            <span className="text-sm text-muted-foreground">Approved</span>
          </div>
          <span className="text-2xl font-bold text-foreground">{approved}</span>
        </div>
        
        <div className="flex items-center justify-between p-4 bg-yellow-50 dark:bg-yellow-500/10 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center">
              <Clock size={20} className="text-yellow-600 dark:text-yellow-400" />
            </div>
            <span className="text-sm text-muted-foreground">Pending</span>
          </div>
          <span className="text-2xl font-bold text-foreground">{pending}</span>
        </div>
        
        <div className="pt-4 border-t border-border/50">
          <p className="text-sm text-muted-foreground">
            Total: <span className="font-semibold text-foreground">{approved + pending}</span>
          </p>
        </div>
      </div>
    </div>
  );
}

// Dashboard stats
function ManagerDashboardStats({ organizationId }: { organizationId: string }) {
  const [summary, setSummary] = useState<ManagerDashboardSummary | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [summaryRes, projectsRes] = await Promise.all([
          managerDashboard.getSummary(),
          managerProjects.getAllProjects(organizationId),
        ]);
        setSummary(summaryRes.summary);
        setProjects(projectsRes.projects || []);
      } catch (err) {
        console.error("Failed to fetch dashboard data:", err);
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
        <span className="ml-2 text-muted-foreground">Loading dashboard...</span>
      </div>
    );
  }

  if (!summary) return null;

  const projectStatusData = [
    { label: "Active", value: summary.total_projects_active, color: "var(--chart-3)" },
    { label: "Completed", value: summary.total_projects_completed, color: "var(--chart-5)" },
    { label: "Planned", value: summary.total_projects_planned, color: "var(--chart-2)" },
    { label: "On Hold", value: summary.total_projects_on_hold, color: "var(--chart-4)" },
  ];

  const totalProjects = summary.total_projects_assigned + summary.total_projects_created;

  return (
    <div className="space-y-8">
      {/* 1. KPI Cards (Top Section) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="My Projects" value={summary.total_projects_created} subtitle={`${summary.total_projects_active} active sites`} icon={FolderKanban} />
        <StatCard title="Assigned" value={summary.total_projects_assigned} subtitle="From organization" icon={ClipboardList} />
        <StatCard 
          title="Engineers" 
          value={summary.total_site_engineers_approved} 
          subtitle={`${summary.total_site_engineers_pending} pending`} 
          icon={HardHat}
        />
        <StatCard title="Total Staff" value={summary.total_site_engineers_approved + summary.total_site_engineers_pending} subtitle="Requests & Active" icon={Users} />
      </div>

      {/* 2. Middle Section: Chart and Focus */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
           <ProjectsOverviewCard
            data={projectStatusData}
            totalValue={totalProjects}
            onHoldCount={summary.total_projects_on_hold}
            viewAllHref="/manager/projects"
          />
        </div>
        <div className="lg:col-span-2 glass-card rounded-2xl p-6 flex flex-col justify-center">
            <div className="flex items-center gap-4 mb-6">
               <div className="p-3 bg-primary/10 rounded-xl">
                  <Building2 className="w-8 h-8 text-primary" />
               </div>
               <div>
                 <h3 className="text-xl font-bold text-foreground">Project Management Focus</h3>
                 <p className="text-muted-foreground">Monitor your assigned projects and engineering staff requests.</p>
               </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
               <div className="bg-muted/50 p-4 rounded-xl">
                  <p className="text-sm font-medium text-muted-foreground mb-1">Pending Engineer Requests</p>
                  <p className="text-2xl font-bold text-foreground">{summary.total_site_engineers_pending}</p>
               </div>
               <div className="bg-muted/50 p-4 rounded-xl">
                  <p className="text-sm font-medium text-muted-foreground mb-1">Rejected Requests</p>
                  <p className="text-2xl font-bold text-foreground">{summary.total_site_engineers_rejected}</p>
               </div>
            </div>
        </div>
      </div>

      {/* 3. Bottom Panels (Tabs) */}
      <Tabs defaultValue="projects" className="w-full">
         <div className="flex items-center justify-between mb-4">
           <TabsList className="bg-muted/50 p-1 rounded-xl">
              <TabsTrigger value="projects" className="rounded-lg">Recent Projects</TabsTrigger>
              <TabsTrigger value="engineers" className="rounded-lg">Engineer Approvals</TabsTrigger>
              <TabsTrigger value="labour" className="rounded-lg">Labour & Material</TabsTrigger>
           </TabsList>
         </div>

         <TabsContent value="projects">
           {projects.length > 0 ? (
            <div className="glass-card rounded-2xl p-6">
               <div className="flex items-center justify-between mb-6">
                 <h3 className="font-bold text-foreground text-lg">Active Projects</h3>
                 <Link href="/manager/projects" className="text-sm text-primary hover:underline">View all →</Link>
               </div>
               <div className="grid md:grid-cols-2 gap-4">
                 {projects.slice(0, 4).map((project) => (
                   <ProjectCard key={project.id} id={project.id} name={project.name} location_text={project.location_text} status={project.status} basePath="/manager/projects" />
                 ))}
               </div>
            </div>
           ) : (
             <div className="glass-card p-12 text-center text-muted-foreground">No projects found.</div>
           )}
         </TabsContent>

         <TabsContent value="engineers">
            <EngineersOverviewCard approved={summary.total_site_engineers_approved} pending={summary.total_site_engineers_pending} />
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

// Organization Status Component
function OrganizationStatus({ onApproved }: { onApproved?: (orgId: string) => void }) {
  const [allOrganizations, setAllOrganizations] = useState<OrganizationListItem[]>([]);
  const [myRequests, setMyRequests] = useState<ManagerOrgRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [joiningId, setJoiningId] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [orgsRes, reqsRes] = await Promise.all([
        managerOrganization.getAll(),
        managerOrganization.getMyRequests(),
      ]);
      setAllOrganizations(orgsRes.organizations || []);
      setMyRequests(reqsRes.requests || []);
      
      const approvedRequest = (reqsRes.requests || []).find(r => r.status === "APPROVED");
      if (approvedRequest && onApproved) onApproved(approvedRequest.org_id);
    } catch (err) {
      console.error("Failed to load data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleJoinRequest = async (orgId: string) => {
    setJoiningId(orgId);
    try {
      await managerOrganization.requestJoin(orgId);
      fetchData();
    } catch (err) {
      console.error("Join request failed:", err);
    } finally {
      setJoiningId(null);
    }
  };

  if (isLoading) {
    return <div className="glass-card rounded-2xl p-8 flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  const approvedRequest = myRequests.find(r => r.status === "APPROVED");
  const pendingRequest = myRequests.find(r => r.status === "PENDING");
  const requestedOrgIds = myRequests.map(r => r.org_id);

  if (approvedRequest) {
    return (
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center text-green-500"><CheckCircle2 size={24} /></div>
          <div>
            <h3 className="text-lg font-bold text-foreground">{approvedRequest.org_name}</h3>
            <p className="text-sm text-muted-foreground">Organization Approved</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1"><MapPin size={14} />{approvedRequest.org_address}</span>
          <span className="flex items-center gap-1"><Phone size={14} />{approvedRequest.org_office_phone}</span>
        </div>
      </div>
    );
  }

  if (pendingRequest) {
    return (
      <div className="glass-card rounded-2xl p-6 bg-yellow-50/50 dark:bg-yellow-500/5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-yellow-500/20 rounded-xl flex items-center justify-center text-yellow-600"><Clock size={24} /></div>
          <div>
            <h3 className="text-lg font-bold text-foreground">Pending Approval</h3>
            <p className="text-sm text-muted-foreground">Your request to join <span className="font-semibold">{pendingRequest.org_name}</span> is pending.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-2xl p-6">
      <h3 className="text-lg font-bold text-foreground mb-2">Join an Organization</h3>
      <p className="text-sm text-muted-foreground mb-6">Select an organization to send a join request.</p>
      {allOrganizations.length === 0 ? (
        <div className="text-center py-8"><Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-3" /><p className="text-muted-foreground">No organizations available.</p></div>
      ) : (
        <div className="space-y-3">
          {allOrganizations.map((org) => (
            <div key={org.id} className="flex items-center gap-4 p-4 bg-muted/30 rounded-xl">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary"><Building2 size={24} /></div>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-foreground">{org.name}</h4>
                <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin size={12} />{org.address}</p>
              </div>
              <Button size="sm" disabled={requestedOrgIds.includes(org.id) || joiningId === org.id} onClick={() => handleJoinRequest(org.id)}>
                {joiningId === org.id ? <Loader2 className="h-4 w-4 animate-spin" /> : requestedOrgIds.includes(org.id) ? "Requested" : "Join"}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ManagerDashboardPage() {
  const { user } = useAuth();
  const [approvedOrgId, setApprovedOrgId] = useState<string | null>(null);

  const quickActions = [
    { title: "My Projects", description: "View and manage your projects", href: "/manager/projects", icon: Building2 },
    { title: "Manage Engineers", description: "Handle engineer requests", href: "/manager/engineers", icon: Users },
  ];

  return (
    <div className="space-y-8 pt-12 md:pt-0">
      <DashboardHeader
        userName={user?.name?.split(" ")[0]}
        title="Dashboard"
        showNewButton
        newButtonHref="/manager/projects/new"
        newButtonLabel="New Project"
      />

      <OrganizationStatus onApproved={setApprovedOrgId} />

      {approvedOrgId && <ManagerDashboardStats organizationId={approvedOrgId} />}

      <div>
        <h3 className="font-bold text-foreground text-lg mb-4">Quick Actions</h3>
        <div className="grid md:grid-cols-2 gap-4">
          {quickActions.map((action, idx) => (
            <QuickAction key={idx} {...action} />
          ))}
        </div>
      </div>
    </div>
  );
}
