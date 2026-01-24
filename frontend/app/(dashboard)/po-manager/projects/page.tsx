"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/providers/AuthContext";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DataTable, Column } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/Button";
import { poManagerProjects, Project, ProjectRequest } from "@/lib/api/po-manager";
import { Loader2, MapPin, Calendar, Building2, Clock, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function POManagerProjectsPage() {
  const { user } = useAuth();
  const [myProjects, setMyProjects] = useState<Project[]>([]);
  const [availableProjects, setAvailableProjects] = useState<Project[]>([]);
  const [myRequests, setMyRequests] = useState<ProjectRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [joiningId, setJoiningId] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [projectsRes, availableRes, requestsRes] = await Promise.all([
        poManagerProjects.getMyProjects().catch(() => ({ projects: [] })),
        poManagerProjects.getAvailableProjects().catch(() => ({ projects: [] })),
        poManagerProjects.getProjectRequests().catch(() => ({ requests: [] })),
      ]);
      setMyProjects(projectsRes.projects || []);
      setAvailableProjects(availableRes.projects || []);
      setMyRequests(requestsRes.requests || []);
    } catch (err) {
      console.error("Failed to fetch projects:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleJoinProject = async (projectId: string) => {
    setJoiningId(projectId);
    try {
      await poManagerProjects.joinProject(projectId);
      toast.success("Join request sent successfully!");
      fetchData();
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
      key: "org_name",
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
    {
      key: "assigned_at",
      label: "Joined",
      render: (value: string) => value ? new Date(value).toLocaleDateString() : "-",
    },
  ];

  // Columns for Available Projects table
  const availableProjectColumns: Column<Project>[] = [
    {
      key: "name",
      label: "Project Name",
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
      key: "join_status",
      label: "Join Status",
      render: (value: string | undefined) => {
        if (value === "APPROVED") {
          return <Badge className="bg-green-500/10 text-green-600">Approved</Badge>;
        }
        if (value === "PENDING") {
          return <Badge className="bg-yellow-500/10 text-yellow-600">Pending</Badge>;
        }
        if (value === "REJECTED") {
          return <Badge variant="destructive">Rejected</Badge>;
        }
        return <Badge variant="outline">Not Joined</Badge>;
      },
    },
    {
      key: "actions",
      label: "Action",
      render: (value: unknown, row: Project) => {
        const joinStatus = (row as any).join_status;
        if (joinStatus === "APPROVED" || joinStatus === "PENDING") {
          return null;
        }
        return (
          <Button 
            size="sm" 
            onClick={() => handleJoinProject(row.id)}
            disabled={joiningId === row.id}
          >
            {joiningId === row.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Request to Join"}
          </Button>
        );
      },
    },
  ];

  // Columns for My Requests table
  const requestColumns: Column<ProjectRequest>[] = [
    {
      key: "project_name",
      label: "Project",
      render: (value: string, row: ProjectRequest) => (
        <div>
          <p className="font-medium">{row.project_name}</p>
          {row.location_text && (
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              <MapPin size={12} />{row.location_text}
            </p>
          )}
        </div>
      ),
    },
    {
      key: "org_name",
      label: "Organization",
      render: (value: string) => value || "-",
    },
    {
      key: "status",
      label: "Request Status",
      render: (value: string) => {
        if (value === "APPROVED") {
          return (
            <Badge className="bg-green-500/10 text-green-600 gap-1">
              <CheckCircle2 size={12} /> Approved
            </Badge>
          );
        }
        if (value === "PENDING") {
          return (
            <Badge className="bg-yellow-500/10 text-yellow-600 gap-1">
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
      label: "Requested",
      render: (value: string) => new Date(value).toLocaleDateString(),
    },
  ];

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
        title="Projects"
      />

      <Tabs defaultValue="my-projects" className="w-full">
        <TabsList className="bg-muted/50 p-1 rounded-xl mb-6">
          <TabsTrigger value="my-projects" className="rounded-lg">
            My Projects ({myProjects.length})
          </TabsTrigger>
          <TabsTrigger value="available" className="rounded-lg">
            Available Projects ({availableProjects.length})
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
                You haven't been approved for any projects yet. Browse available projects and request to join.
              </p>
            </div>
          ) : (
            <DataTable 
              data={myProjects} 
              columns={myProjectColumns} 
              searchKeys={["name", "location_text", "org_name"]}
            />
          )}
        </TabsContent>

        <TabsContent value="available">
          {availableProjects.length === 0 ? (
            <div className="glass-card rounded-2xl p-12 text-center">
              <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-bold text-muted-foreground mb-2">No Available Projects</h3>
              <p className="text-sm text-muted-foreground">
                No projects are currently available in your organization.
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
              <h3 className="text-lg font-bold text-muted-foreground mb-2">No Requests</h3>
              <p className="text-sm text-muted-foreground">
                You haven't sent any project join requests yet.
              </p>
            </div>
          ) : (
            <DataTable 
              data={myRequests} 
              columns={requestColumns} 
              searchKeys={["project_name", "org_name"]}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
