"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/providers/AuthContext";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DataTable, Column } from "@/components/ui/DataTable";
import { managerProjectManagerRequests, managerProjects, managerOrganization, Project, ManagerOrgRequest } from "@/lib/api/manager";
import { Loader2, CheckCircle, XCircle, Users, Filter } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";
import { useMemo } from "react";

// Project selector
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
      className="h-10 px-3 bg-background/50 border border-border rounded-lg text-sm transition-all min-w-[200px]"
    >
      <option value="">All My Projects</option>
      {projects.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name}
        </option>
      ))}
    </select>
  );
}

export default function ProjectRequestsPage() {
  const { user } = useAuth();
  const [approvedOrg, setApprovedOrg] = useState<ManagerOrgRequest | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);
  const [actioningId, setActioningId] = useState<string | null>(null);

  // Fetch approved organization and projects
  useEffect(() => {
    const fetchProjects = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        // Fetch manager's approved organization
        const reqsRes = await managerOrganization.getMyRequests();
        const approved = reqsRes.requests?.find((r) => r.status === "APPROVED");

        if (approved) {
          setApprovedOrg(approved);
          const res = await managerProjects.getMyProjects(approved.org_id);
          setProjects(res.projects || []);
        }
      } catch (err) {
        console.error("Failed to fetch projects:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProjects();
  }, [user]);

  // Fetch requests
  const fetchRequests = async () => {
    if (!approvedOrg) return;

    try {
      setIsLoadingRequests(true);
      
      if (selectedProjectId) {
        // Fetch requests for specific project
        const res = await managerProjectManagerRequests.getPending(selectedProjectId, approvedOrg.org_id);
        setRequests(res.requests || []);
      } else {
        // Fetch requests for all projects
        const allRequests: any[] = [];
        for (const project of projects) {
          try {
            const res = await managerProjectManagerRequests.getPending(project.id, approvedOrg.org_id);
            allRequests.push(...(res.requests || []));
          } catch (err) {
            // Skip projects where we can't fetch requests (non-creators)
            console.debug(`Skipping project ${project.id}:`, err);
          }
        }
        setRequests(allRequests);
      }
    } catch (err) {
      console.error("Failed to fetch requests:", err);
      setRequests([]);
    } finally {
      setIsLoadingRequests(false);
    }
  };

  useEffect(() => {
    if (approvedOrg && projects.length > 0) {
      fetchRequests();
    }
  }, [selectedProjectId, approvedOrg, projects.length]);

  // Handle approve/reject
  const handleAction = async (requestId: string, projectId: string, decision: 'ACTIVE' | 'REJECTED') => {
    if (!approvedOrg) return;
    
    setActioningId(requestId);
    try {
      await managerProjectManagerRequests.decide(requestId, decision, projectId, approvedOrg.org_id);
      toast.success(`Request ${decision === 'ACTIVE' ? 'approved' : 'rejected'}!`);
      fetchRequests(); // Refresh
    } catch (err: any) {
      console.error("Action failed:", err);
      toast.error(err.response?.data?.error || "Action failed");
    } finally {
      setActioningId(null);
    }
  };

  // Table columns
  const columns: Column<any>[] = useMemo(
    () => [
      {
        key: "manager_name",
        label: "Manager",
        sortable: true,
        render: (val) => <span className="font-medium">{val}</span>,
      },
      {
        key: "manager_email",
        label: "Email",
        render: (val) => <span className="text-sm text-muted-foreground">{val}</span>,
      },
      {
        key: "manager_phone",
        label: "Phone",
        render: (val) => <span className="text-sm text-muted-foreground">{val}</span>,
      },
      {
        key: "assigned_at",
        label: "Requested",
        sortable: true,
        render: (val) => val ? new Date(val).toLocaleDateString() : '-',
      },
      {
        key: "status",
        label: "Status",
        width: "120px",
        render: (val) => (
          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
            val === 'ACTIVE' ? 'bg-green-500/20 text-green-400' :
            val === 'REJECTED' ? 'bg-red-500/20 text-red-400' :
            'bg-amber-500/20 text-amber-400'
          }`}>
            {val}
          </span>
        ),
      },
      {
        key: "id",
        label: "Actions",
        width: "150px",
        render: (id, row) =>
          row.status === 'PENDING' ? (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2 text-green-400 border-green-500/20 hover:bg-green-500/10"
                onClick={() => handleAction(id, row.project_id, 'ACTIVE')}
                disabled={actioningId === id}
              >
                {actioningId === id ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <CheckCircle size={14} />
                )}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2 text-red-400 border-red-500/20 hover:bg-red-500/10"
                onClick={() => handleAction(id, row.project_id, 'REJECTED')}
                disabled={actioningId === id}
              >
                <XCircle size={14} />
              </Button>
            </div>
          ) : null,
      },
    ],
    [actioningId]
  );

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pt-12 md:pt-0 pb-12">
      <DashboardHeader userName={user?.name?.split(" ")[0]} title="Project Join Requests" />

      {/* Controls */}
      <div className="glass-card rounded-2xl p-4 flex items-center gap-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Filter size={16} />
          <span className="text-sm">Filter:</span>
        </div>
        <ProjectSelector projects={projects} selected={selectedProjectId} onSelect={setSelectedProjectId} />
      </div>

      {/* Requests Table */}
      {isLoadingRequests ? (
        <div className="glass-card rounded-2xl p-12 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="ml-2 text-muted-foreground">Loading requests...</span>
        </div>
      ) : (
        <div className="glass-card rounded-2xl p-6">
          <DataTable
            data={requests}
            columns={columns}
            searchable
            searchKeys={["manager_name", "manager_email", "manager_phone"]}
            emptyMessage="No pending join requests"
          />
        </div>
      )}
    </div>
  );
}
