"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/components/providers/AuthContext";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DataTable, Column } from "@/components/ui/DataTable";
import {  managerProjects, Project, LabourRequest, managerLabourRequests, managerOrganization } from "@/lib/api/manager";
import { Loader2, Users, Filter, Briefcase } from "lucide-react";

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
      <option value="">Select a Project</option>
      {projects.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name}
        </option>
      ))}
    </select>
  );
}

export default function ManagerLabourRequestsPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [requests, setRequests] = useState<LabourRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDataLoading, setIsDataLoading] = useState(false);

  // Initial Data Fetch
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        // Fetch approved organization
        const orgRes = await managerOrganization.getMyRequests();
        const approvedOrg = orgRes.requests.find(r => r.status === 'APPROVED');
        
        if (approvedOrg?.org_id) {
          const res = await managerProjects.getMyProjects(approvedOrg.org_id);
          setProjects(res.projects || []);
        }
      } catch (err) {
        console.error("Failed to fetch projects", err);
      } finally {
        setIsLoading(false);
      }
    };
    
    if (user) {
        fetchProjects();
    }
  }, [user]);

  // Fetch Requests
  useEffect(() => {
    if (!selectedProjectId) {
      setRequests([]);
      return;
    }

    const fetchRequests = async () => {
      try {
        setIsDataLoading(true);
        const res = await managerLabourRequests.getByProject(selectedProjectId);
        setRequests(res.labour_requests || []);
      } catch (err) {
        console.error("Failed to fetch labour requests", err);
      } finally {
        setIsDataLoading(false);
      }
    };

    fetchRequests();
  }, [selectedProjectId]);

  // Columns
  const columns: Column<LabourRequest>[] = useMemo(
    () => [
      {
        key: "labour_type",
        label: "Type",
        sortable: true,
        render: (val) => (
          <div className="flex items-center gap-2">
            <Briefcase size={14} className="text-muted-foreground" />
            <span className="font-medium">{val}</span>
          </div>
        )
      },
      {
        key: "required_count",
        label: "Count",
        width: "100px",
        render: (val) => <span className="font-mono bg-muted/50 px-2 py-0.5 rounded">{val}</span>,
      },
      {
        key: "request_date",
        label: "Required On",
        sortable: true,
        render: (val) => new Date(val).toLocaleDateString(),
      },
      {
        key: "status",
        label: "Status",
        width: "120px",
        render: (val) => (
          <span className={`text-xs px-2 py-1 rounded font-medium ${
            val === "APPROVED" ? "bg-green-500/20 text-green-400" :
            val === "REJECTED" ? "bg-red-500/20 text-red-400" :
            "bg-amber-500/20 text-amber-400"
          }`}>
            {val}
          </span>
        ),
      },
      {
        key: "created_at",
        label: "Requested At",
        render: (val) => new Date(val).toLocaleString(),
      },
    ],
    []
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
      <DashboardHeader userName={user?.name?.split(" ")[0]} title="Labour Requests" />

      {/* Controls Bar */}
      <div className="glass-card rounded-2xl p-4 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Filter size={16} />
          <span className="text-sm">Filter:</span>
        </div>
        <ProjectSelector projects={projects} selected={selectedProjectId} onSelect={setSelectedProjectId} />
      </div>

      {/* Main Content */}
      <div className="glass-card rounded-2xl p-6">
        {!selectedProjectId ? (
          <div className="text-center py-12 text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>Select a project to view labour requests</p>
          </div>
        ) : isDataLoading ? (
          <div className="text-center py-12">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
            <p className="text-sm text-muted-foreground mt-2">Loading requests...</p>
          </div>
        ) : (
          <DataTable
            data={requests}
            columns={columns}
            searchable
            searchKeys={["labour_type"]}
            emptyMessage="No labour requests found"
          />
        )}
      </div>
    </div>
  );
}
