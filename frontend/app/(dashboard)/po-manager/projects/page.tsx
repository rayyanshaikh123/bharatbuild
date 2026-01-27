"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/providers/AuthContext";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DataTable, Column } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/Button";
import { 
  purchaseManagerProjects, 
  purchaseManagerOrganization,
  Project, 
  ProjectJoinRequest 
} from "@/lib/api/purchase-manager";
import { Loader2, MapPin, Building2, Clock, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";

export default function POManagerProjectsPage() {
  const { user } = useAuth();
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  
  const [myProjects, setMyProjects] = useState<Project[]>([]);
  const [availableProjects, setAvailableProjects] = useState<Project[]>([]);
  const [myRequests, setMyRequests] = useState<ProjectJoinRequest[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [joiningId, setJoiningId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      
      // 1. Get Organization
      const orgRes = await purchaseManagerOrganization.getMyOrganizations();
      if (!orgRes.organizations || orgRes.organizations.length === 0) {
        setIsLoading(false);
        return; // No org, cannot load projects
      }
      
      const orgId = orgRes.organizations[0].org_id;
      setOrganizationId(orgId);

      // 2. Get Projects Data
      const [projectsRes, allRes, requestsRes] = await Promise.all([
        purchaseManagerProjects.getMyProjects(orgId).catch(() => ({ projects: [] })),
        purchaseManagerProjects.getAll(orgId).catch(() => ({ projects: [] })),
        purchaseManagerProjects.getMyRequests(orgId).catch(() => ({ requests: [] })),
      ]);

      setMyProjects(projectsRes.projects || []);
      setAvailableProjects(allRes.projects || []);
      // Filter available projects to exclude ones I'm already in
      const myProjectIds = new Set((projectsRes.projects || []).map(p => p.id));
      const myRequestIds = new Set((requestsRes.requests || []).map(r => r.project_id));
      
      const trulyAvailable = (allRes.projects || []).filter(p => 
        !myProjectIds.has(p.id) && !myRequestIds.has(p.id)
      );
      setAvailableProjects(trulyAvailable);
      
      setMyRequests(requestsRes.requests || []);
    } catch (err) {
      console.error("Failed to fetch projects:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinProject = async (projectId: string) => {
    if (!organizationId) return;
    
    setJoiningId(projectId);
    try {
      await purchaseManagerProjects.requestJoin(projectId, organizationId);
      toast.success("Join request sent successfully!");
      fetchData(); // Refresh all lists
    } catch (err) {
      console.error("Failed to join project:", err);
      toast.error("Failed to send join request");
    } finally {
      setJoiningId(null);
    }
  };

  // Columns for My Projects table
  const myProjectColumns: Column<Project>[] = [
    {
      key: "name",
      label: "Project Name",
      sortable: true,
      render: (value: string, row: Project) => (
        <div>
          <p className="font-medium">{row.name}</p>
          {row.location_text && (
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              <MapPin size={12} />{row.location_text}
            </p>
          )}
        </div>
      ),
    },
    {
      key: "organization_name",
      label: "Organization",
      render: (value: string) => value || "-",
    },
    {
      key: "status",
      label: "Status",
      render: (value: string) => (
        <Badge variant={value === "ACTIVE" ? "default" : "secondary"}>
          {value}
        </Badge>
      ),
    },
  ];

  // Columns for Available Projects table
  const availableProjectColumns: Column<Project>[] = [
    {
      key: "name",
      label: "Project Name",
      sortable: true,
      render: (value: string, row: Project) => (
        <div>
          <p className="font-medium">{row.name}</p>
          {row.location_text && (
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              <MapPin size={12} />{row.location_text}
            </p>
          )}
        </div>
      ),
    },
    {
      key: "status",
      label: "Project Status",
      render: (value: string) => (
        <Badge variant={value === "ACTIVE" ? "default" : "secondary"}>
          {value}
        </Badge>
      ),
    },
    {
      key: "id",
      label: "Action",
      render: (value: string, row: Project) => (
        <Button 
          size="sm" 
          onClick={() => handleJoinProject(row.id)}
          disabled={joiningId === row.id}
        >
          {joiningId === row.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Request to Join"}
        </Button>
      ),
    },
  ];

  // Columns for My Requests table
  const requestColumns: Column<ProjectJoinRequest>[] = [
    {
      key: "project_name",
      label: "Project",
      sortable: true,
      render: (value: string) => <span className="font-medium">{value}</span>,
    },
    {
      key: "status",
      label: "Request Status",
      render: (value: string) => {
        if (value === "APPROVED") {
          return (
            <Badge className="bg-green-500/10 text-green-600 gap-1 hover:bg-green-500/20">
              <CheckCircle2 size={12} /> Approved
            </Badge>
          );
        }
        if (value === "PENDING") {
          return (
            <Badge className="bg-yellow-500/10 text-yellow-600 gap-1 hover:bg-yellow-500/20">
              <Clock size={12} /> Pending
            </Badge>
          );
        }
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle size={12} /> Rejected
          </Badge>
        );
      },
    },
    {
      key: "assigned_at",
      label: "Requested On",
      render: (value: string) => value ? new Date(value).toLocaleDateString() : "-",
    },
  ];

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!organizationId) {
    return (
      <div className="space-y-8 pt-12 md:pt-0 pb-12">
        <DashboardHeader
          userName={user?.name?.split(" ")[0]}
          title="Projects"
        />
        <div className="glass-card rounded-2xl p-12 text-center">
          <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-bold text-foreground mb-2">Organization Required</h3>
          <p className="text-muted-foreground mb-6">
            You must join an organization before you can access projects.
          </p>
          <Link href="/po-manager/organization">
            <Button>Go to My Organization</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pt-12 md:pt-0 pb-12">
      <DashboardHeader
        userName={user?.name?.split(" ")[0]}
        title="Projects"
      />

      <Tabs defaultValue="my-projects" className="w-full">
        <TabsList className="bg-muted/50 p-1 rounded-xl mb-6">
          <TabsTrigger value="my-projects" className="rounded-lg">
            My Projects ({myProjects.length})
          </TabsTrigger>
          <TabsTrigger value="available" className="rounded-lg">
            Available to Join ({availableProjects.length})
          </TabsTrigger>
          <TabsTrigger value="requests" className="rounded-lg">
            My Requests ({myRequests.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="my-projects">
          {myProjects.length === 0 ? (
            <div className="glass-card rounded-2xl p-12 text-center">
              <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-bold text-muted-foreground mb-2">No Projects Yet</h3>
              <p className="text-sm text-muted-foreground">
                You haven't been approved for any projects yet. Check 'Available to Join' tab.
              </p>
            </div>
          ) : (
            <DataTable 
              data={myProjects} 
              columns={myProjectColumns} 
              searchKeys={["name", "location_text"]}
            />
          )}
        </TabsContent>

        <TabsContent value="available">
          {availableProjects.length === 0 ? (
            <div className="glass-card rounded-2xl p-12 text-center">
              <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-bold text-muted-foreground mb-2">No Available Projects</h3>
              <p className="text-sm text-muted-foreground">
                There are no new projects available to join in your organization.
              </p>
            </div>
          ) : (
            <DataTable 
              data={availableProjects} 
              columns={availableProjectColumns} 
              searchKeys={["name", "location_text"]}
            />
          )}
        </TabsContent>

        <TabsContent value="requests">
          {myRequests.length === 0 ? (
            <div className="glass-card rounded-2xl p-12 text-center">
              <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-bold text-muted-foreground mb-2">No Pending Requests</h3>
              <p className="text-sm text-muted-foreground">
                You don't have any active join requests.
              </p>
            </div>
          ) : (
            <DataTable 
              data={myRequests} 
              columns={requestColumns} 
              searchKeys={["project_name"]}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
