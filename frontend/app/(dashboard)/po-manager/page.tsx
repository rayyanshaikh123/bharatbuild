"use client";

import { useAuth } from "@/components/providers/AuthContext";
import { useEffect, useState } from "react";
import { Building2, Loader2, Clock, CheckCircle2, MapPin, Phone, Package, FileText, ClipboardCheck, FolderKanban } from "lucide-react";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { 
  purchaseManagerOrganization, 
  purchaseManagerDashboard, 
  purchaseManagerProjects,
  PurchaseManagerDashboardSummary, 
  ApprovedOrganization, 
  Project 
} from "@/lib/api/purchase-manager";
import { StatCard } from "@/components/ui/StatCard";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { QuickAction } from "@/components/dashboard/QuickAction";

// Organization Status Component for PO Manager
function OrganizationStatus({ onApproved }: { onApproved?: (org: ApprovedOrganization) => void }) {
  const [organization, setOrganization] = useState<ApprovedOrganization | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const res = await purchaseManagerOrganization.getMyOrganizations();
      if (res.organizations && res.organizations.length > 0) {
        const org = res.organizations[0];
        setOrganization(org);
        if (onApproved) onApproved(org);
      }
    } catch (err) {
      console.error("Failed to load organization data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  if (isLoading) {
    return (
      <div className="glass-card rounded-2xl p-8 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  // Organization approved
  if (organization) {
    return (
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center text-green-500">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground">{organization.org_name}</h3>
            <p className="text-sm text-muted-foreground">Organization Approved</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          {organization.org_address && (
            <span className="flex items-center gap-1"><MapPin size={14} />{organization.org_address}</span>
          )}
        </div>
      </div>
    );
  }

  // No organization - show join options
  return (
    <div className="glass-card rounded-2xl p-6">
      <h3 className="text-lg font-bold text-foreground mb-2">Join an Organization</h3>
      <p className="text-sm text-muted-foreground mb-6">
        You need to join an organization to access projects and purchase orders.
      </p>
      <Link href="/po-manager/organization">
        <Button>
           Find Organization to Join
        </Button>
      </Link>
    </div>
  );
}

// Dashboard Stats
function POManagerDashboardStats({ organizationId }: { organizationId: string }) {
  const [summary, setSummary] = useState<PurchaseManagerDashboardSummary | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [summaryRes, projectsRes] = await Promise.all([
          purchaseManagerDashboard.getSummary(),
          purchaseManagerProjects.getMyProjects(organizationId),
        ]);
        setSummary(summaryRes.summary);
        setProjects(projectsRes.projects || []);
      } catch (err) {
        console.error("Failed to fetch dashboard data:", err);
      } finally {
        setIsLoading(false);
      }
    };
    if (organizationId) {
       fetchData();
    }
  }, [organizationId]);

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
          value={summary?.pending_material_requests || 0} 
          subtitle="Material Requests" 
          icon={Clock} 
        />
        <StatCard 
          title="Approved Requests" 
          value={summary?.approved_material_requests || 0} 
          subtitle="Ready for PO" 
          icon={CheckCircle2} 
        />
        <StatCard 
          title="Purchase Orders" 
          value={summary?.purchase_orders_issued || 0} 
          subtitle="Issued Total" 
          icon={FileText} 
        />
        <StatCard 
          title="Pending GRNs" 
          value={summary?.pending_grns || 0} 
          subtitle="Awaiting Delivery" 
          icon={Package} 
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
  const [approvedOrg, setApprovedOrg] = useState<ApprovedOrganization | null>(null);

  const quickActions = [
    { title: "Material Requests", description: "Process approved requests", href: "/po-manager/material-requests", icon: Package },
    { title: "Purchase Orders", description: "Manage POs", href: "/po-manager/purchase-orders", icon: FileText },
    { title: "View GRN", description: "Check goods received", href: "/po-manager/grn", icon: ClipboardCheck },
    { title: "My Projects", description: "View assigned projects", href: "/po-manager/projects", icon: Building2 },
  ];

  return (
    <div className="space-y-8 pt-12 md:pt-0 pb-12">
      <DashboardHeader
        userName={user?.name?.split(" ")[0]}
        title="Dashboard"
      />

      <OrganizationStatus onApproved={setApprovedOrg} />

      {approvedOrg && <POManagerDashboardStats organizationId={approvedOrg.org_id} />}

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
