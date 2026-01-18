"use client";

import { useAuth } from "@/components/providers/AuthContext";
import { useEffect, useState } from "react";
import { Building2, Users, ArrowUpRight, Loader2, Clock, CheckCircle2, MapPin, Phone } from "lucide-react";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { managerOrganization, OrganizationListItem, ManagerOrgRequest } from "@/lib/api/manager";

interface QuickActionProps {
  title: string;
  description: string;
  href: string;
  icon: React.ElementType;
}

function QuickAction({ title, description, href, icon: Icon }: QuickActionProps) {
  return (
    <Link href={href} className="block group">
      <div className="flex items-center gap-4 p-4 bg-muted/30 border border-border/50 rounded-xl hover:bg-muted/50 hover:border-primary/30 transition-all duration-300">
        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
          <Icon size={20} />
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-bold text-foreground">{title}</h4>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        <ArrowUpRight size={16} className="text-muted-foreground group-hover:text-primary transition-colors" />
      </div>
    </Link>
  );
}

function OrganizationStatus() {
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
    } catch (err) {
      console.error("Failed to load data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

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
    return (
      <div className="bg-card border border-border rounded-2xl p-8 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  // Check status
  const approvedRequest = myRequests.find(r => r.status === "APPROVED");
  const pendingRequest = myRequests.find(r => r.status === "PENDING");
  const requestedOrgIds = myRequests.map(r => r.org_id);

  // Approved - show organization info
  if (approvedRequest) {
    return (
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center text-green-500">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground">{approvedRequest.org_name}</h3>
            <p className="text-sm text-muted-foreground">Organization Approved</p>
          </div>
        </div>
        <div className="flex gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <MapPin size={14} />
            {approvedRequest.org_address}
          </span>
          <span className="flex items-center gap-1">
            <Phone size={14} />
            {approvedRequest.org_office_phone}
          </span>
        </div>
      </div>
    );
  }

  // Pending - show waiting state
  if (pendingRequest) {
    return (
      <div className="space-y-4">
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-yellow-500/20 rounded-xl flex items-center justify-center text-yellow-600">
              <Clock size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">Pending Approval</h3>
              <p className="text-sm text-muted-foreground">
                Your request to join <span className="font-semibold">{pendingRequest.org_name}</span> is pending owner approval.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // No request yet - show organization list to join
  return (
    <div className="bg-card border border-border rounded-2xl p-6">
      <h3 className="text-lg font-bold text-foreground mb-2 uppercase tracking-wide">
        Join an Organization
      </h3>
      <p className="text-sm text-muted-foreground mb-6">
        Select an organization to send a join request to the owner.
      </p>

      {allOrganizations.length === 0 ? (
        <div className="text-center py-8">
          <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No organizations available yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {allOrganizations.map((org) => {
            const alreadyRequested = requestedOrgIds.includes(org.id);
            return (
              <div
                key={org.id}
                className="flex items-center gap-4 p-4 bg-muted/30 border border-border/50 rounded-xl"
              >
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                  <Building2 size={24} />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-foreground">{org.name}</h4>
                  <div className="flex gap-4 text-xs text-muted-foreground mt-1">
                    <span className="flex items-center gap-1">
                      <MapPin size={12} />
                      {org.address}
                    </span>
                    <span className="flex items-center gap-1">
                      <Phone size={12} />
                      {org.office_phone}
                    </span>
                  </div>
                </div>
                <Button
                  size="sm"
                  disabled={alreadyRequested || joiningId === org.id}
                  onClick={() => handleJoinRequest(org.id)}
                  className="text-xs"
                >
                  {joiningId === org.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : alreadyRequested ? (
                    "Requested"
                  ) : (
                    "Request Join"
                  )}
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function ManagerDashboardPage() {
  const { user } = useAuth();

  const actions = [
    { title: "My Projects", description: "View and manage your projects", href: "/manager/projects", icon: Building2 },
    { title: "Manage Engineers", description: "Assign engineers to projects", href: "/manager/engineers", icon: Users },
  ];

  return (
    <div className="space-y-8 pt-12 md:pt-0">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-foreground uppercase italic">
            Welcome, <span className="text-primary">{user?.name?.split(" ")[0] || "Manager"}</span>
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your projects and team
          </p>
        </div>
      </div>

      {/* Organization Status */}
      <OrganizationStatus />

      {/* Quick Actions */}
      <div>
        <h3 className="text-lg font-bold text-foreground mb-4 uppercase tracking-wide">Quick Actions</h3>
        <div className="grid md:grid-cols-2 gap-3">
          {actions.map((action, idx) => (
            <QuickAction key={idx} {...action} />
          ))}
        </div>
      </div>
    </div>
  );
}
