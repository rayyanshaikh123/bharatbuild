"use client";

import { useAuth } from "@/components/providers/AuthContext";
import { useEffect, useState } from "react";
import { Building2, Loader2, Clock, CheckCircle2, MapPin, Phone, Package, FileText, ClipboardCheck, FolderKanban } from "lucide-react";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { 
  poManagerOrganization, 
  poManagerDashboard, 
  poManagerProjects,
  PODashboardSummary, 
  Organization, 
  Project 
} from "@/lib/api/po-manager";
import { StatCard } from "@/components/ui/StatCard";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { QuickAction } from "@/components/dashboard/QuickAction";

// Organization Status Component for PO Manager
function OrganizationStatus({ onApproved }: { onApproved?: (org: Organization) => void }) {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [allOrganizations, setAllOrganizations] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Try to get current organization status
      try {
        const statusRes = await poManagerOrganization.getStatus();
        if (statusRes.organization) {
          setOrganization(statusRes.organization);
          if (statusRes.organization.status === "APPROVED" && onApproved) {
            onApproved(statusRes.organization);
          }
          return;
        }
      } catch {
        // No organization yet, fetch available ones
      }
      
      // Fetch available organizations to join
      const orgsRes = await poManagerOrganization.getAllOrganizations();
      setAllOrganizations(orgsRes.organizations || []);
    } catch (err) {
      console.error("Failed to load organization data:", err);
      setError("Failed to load organization data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleJoinRequest = async (orgId: string) => {
    setJoiningId(orgId);
    try {
      await poManagerOrganization.joinOrganization(orgId);
      fetchData();
    } catch (err) {
      console.error("Join request failed:", err);
    } finally {
      setJoiningId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="glass-card rounded-2xl p-8 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card rounded-2xl p-6 bg-red-50/50 dark:bg-red-500/5 border-red-200 dark:border-red-500/20">
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }

  // Organization approved
  if (organization?.status === "APPROVED") {
    return (
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center text-green-500">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground">{organization.name}</h3>
            <p className="text-sm text-muted-foreground">Organization Approved</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          {organization.address && (
            <span className="flex items-center gap-1"><MapPin size={14} />{organization.address}</span>
          )}
          {organization.office_phone && (
            <span className="flex items-center gap-1"><Phone size={14} />{organization.office_phone}</span>
          )}
        </div>
      </div>
    );
  }

  // Pending approval
  if (organization?.status === "PENDING") {
    return (
      <div className="glass-card rounded-2xl p-6 bg-yellow-50/50 dark:bg-yellow-500/5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-yellow-500/20 rounded-xl flex items-center justify-center text-yellow-600">
            <Clock size={24} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground">Pending Approval</h3>
            <p className="text-sm text-muted-foreground">
              Your request to join <span className="font-semibold">{organization.name}</span> is pending.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // No organization - show join options
  return (
    <div className="glass-card rounded-2xl p-6">
      <h3 className="text-lg font-bold text-foreground mb-2">Join an Organization</h3>
      <p className="text-sm text-muted-foreground mb-6">
        Select an organization to send a join request. You need to be approved by the organization owner before you can access projects.
      </p>
      {allOrganizations.length === 0 ? (
        <div className="text-center py-8">
          <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No organizations available.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {allOrganizations.map((org) => (
            <div key={org.id} className="flex items-center gap-4 p-4 bg-muted/30 rounded-xl">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                <Building2 size={24} />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-foreground">{org.name}</h4>
                {org.address && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin size={12} />{org.address}
                  </p>
                )}
              </div>
              <Button 
                size="sm" 
                disabled={joiningId === org.id}
                onClick={() => handleJoinRequest(org.id)}
              >
                {joiningId === org.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Join"}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Dashboard Stats
function POManagerDashboardStats() {
  const [summary, setSummary] = useState<PODashboardSummary | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [summaryRes, projectsRes] = await Promise.all([
          poManagerDashboard.getSummary(),
          poManagerProjects.getMyProjects(),
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
  }, []);

  if (isLoading) {
    return (
      <div className="glass-card rounded-2xl p-8 flex items-center justify-center min-h-[300px]">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Loading dashboard...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Pending Requests" 
          value={summary?.pending_requests || 0} 
          subtitle="Awaiting PO" 
          icon={Clock} 
        />
        <StatCard 
          title="POs Generated Today" 
          value={summary?.pos_generated_today || 0} 
          subtitle="Today's output" 
          icon={FileText} 
        />
        <StatCard 
          title="POs Sent This Week" 
          value={summary?.pos_sent_this_week || 0} 
          subtitle="Weekly total" 
          icon={Package} 
        />
        <StatCard 
          title="Total Purchase Orders" 
          value={summary?.total_pos || 0} 
          subtitle="All time" 
          icon={FolderKanban} 
        />
      </div>

      {/* Projects Overview */}
      {projects.length > 0 && (
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-foreground text-lg">My Projects</h3>
            <Link href="/po-manager/projects" className="text-sm text-primary hover:underline">
              View all →
            </Link>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.slice(0, 3).map((project) => (
              <div key={project.id} className="p-4 bg-muted/30 rounded-xl border border-border/50">
                <h4 className="font-semibold text-foreground mb-1">{project.name}</h4>
                {project.location_text && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mb-2">
                    <MapPin size={12} />{project.location_text}
                  </p>
                )}
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  project.status === "ACTIVE" 
                    ? "bg-green-500/10 text-green-600 dark:text-green-400"
                    : project.status === "COMPLETED"
                    ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                    : "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400"
                }`}>
                  {project.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function POManagerDashboardPage() {
  const { user } = useAuth();
  const [approvedOrg, setApprovedOrg] = useState<Organization | null>(null);

  const quickActions = [
    { title: "Material Requests", description: "Process approved requests", href: "/po-manager/material-requests", icon: Package },
    { title: "Purchase Orders", description: "Manage POs", href: "/po-manager/purchase-orders", icon: FileText },
    { title: "View GRN", description: "Check goods received", href: "/po-manager/grn", icon: ClipboardCheck },
    { title: "My Projects", description: "View assigned projects", href: "/po-manager/projects", icon: Building2 },
  ];

  return (
    <div className="space-y-8 pt-12 md:pt-0">
      <DashboardHeader
        userName={user?.name?.split(" ")[0]}
        title="Dashboard"
      />

      <OrganizationStatus onApproved={setApprovedOrg} />

      {approvedOrg && <POManagerDashboardStats />}

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
