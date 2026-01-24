"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/providers/AuthContext";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DataTable, Column } from "@/components/ui/DataTable";
import { managerProjectJoinRequests, managerProjects, Project } from "@/lib/api/manager";
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
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);
  const [actioningId, setActioningId] = useState<string | null>(null);

  // Fetch projects
  useEffect(() => {
    const fetchProjects = async () => {
      if (!user?.orgId) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const res = await managerProjects.getMyProjects(user.orgId);
        setProjects(res.projects || []);
      } catch (err) {
        console.error("Failed to fetch projects:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProjects();
  }, [user?.orgId]);

  // Fetch requests
  const fetchRequests = async () => {
    try {
      setIsLoadingRequests(true);
      const res = await managerProjectJoinRequests.getPendingForMyProjects(selectedProjectId || undefined);
      setRequests(res.requests || []);
    } catch (err) {
      console.error("Failed to fetch requests:", err);
    } finally {
      setIsLoadingRequests(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [selectedProjectId]);

  // Handle approve/reject
  const handleAction = async (requestId: string, decision: 'APPROVED' | 'REJECTED') => {
    setActioningId(requestId);
    try {
      await managerProjectJoinRequests.reviewRequest(requestId, decision);
      toast.success(`Request ${decision.toLowerCase()}!`);
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
        key: "project_name",
        label: "Project",
        sortable: true,
      },
      {
        key: "requested_at",
        label: "Requested",
        sortable: true,
        render: (val) => new Date(val).toLocaleDateString(),
      },
      {
        key: "status",
        label: "Status",
        width: "120px",
        render: (val) => (
          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
            val === 'APPROVED' ? 'bg-green-500/20 text-green-400' :
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
                onClick={() => handleAction(id, 'APPROVED')}
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
                onClick={() => handleAction(id, 'REJECTED')}
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
            searchKeys={["manager_name", "manager_email", "project_name"]}
            emptyMessage="No pending join requests"
          />
        </div>
      )}
    </div>
  );
}
