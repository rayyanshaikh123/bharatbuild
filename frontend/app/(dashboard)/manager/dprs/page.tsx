"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/components/providers/AuthContext";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DataTable, Column } from "@/components/ui/DataTable";
import { managerProjects, Project, managerOrganization } from "@/lib/api/manager";
import { managerDpr } from "@/lib/api/dpr";
import {
  Loader2,
  Filter,
  Eye,
  CheckCircle,
  AlertCircle,
  Clock,
} from "lucide-react";
import { useRouter } from "next/navigation";

// Status badge component (Aligned with Owner Design)
function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { color: string; label: string }> = {
    PENDING: { color: "bg-amber-500/20 text-amber-400 border-amber-500/20", label: "Pending" },
    APPROVED: { color: "bg-green-500/20 text-green-400 border-green-500/20", label: "Approved" },
    REJECTED: { color: "bg-red-500/20 text-red-400 border-red-500/20", label: "Rejected" },
  };

  const { color, label } = config[status] || { color: "bg-muted text-muted-foreground", label: status };

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${color}`}>
      {label}
    </span>
  );
}

// Project selector component
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
      className="h-10 px-3 bg-background/50 border border-border rounded-lg text-sm text-foreground focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
    >
      <option value="">Select a project</option>
      {projects.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name}
        </option>
      ))}
    </select>
  );
}

// Status filter component (Added to match Owner Design)
function StatusFilter({
  selected,
  onSelect,
}: {
  selected: string | null;
  onSelect: (status: string | null) => void;
}) {
  const statuses = [null, "PENDING", "APPROVED", "REJECTED"];

  return (
    <div className="flex items-center gap-1 p-1 bg-muted/30 rounded-lg">
      {statuses.map((status) => (
        <button
          key={status ?? "all"}
          onClick={() => onSelect(status)}
          className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-all ${
            selected === status
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          }`}
        >
          {status ?? "All"}
        </button>
      ))}
    </div>
  );
}

export default function ManagerDprPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [dprs, setDprs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingDprs, setIsLoadingDprs] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  // Fetch projects on mount
  useEffect(() => {
    const fetchProjects = async () => {
      let currentOrgId = (user as any)?.orgId;

      if (!currentOrgId && user) {
        try {
           // Fallback: fetch approved organization directly
           const orgRes = await managerOrganization.getMyRequests();
           const approved = orgRes.requests?.find(r => r.status === 'APPROVED');
           if (approved) currentOrgId = approved.org_id;
        } catch (err) {
           console.error("Failed to fetch organization context:", err);
        }
      }

      if (!currentOrgId) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const res = await managerProjects.getMyProjects(currentOrgId);
        setProjects(res.projects || []);
      } catch (err) {
        console.error("Failed to fetch projects:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProjects();
  }, [user]);

  // Fetch DPRs when project or status filter changes
  useEffect(() => {
    const fetchDprs = async () => {
      if (!selectedProjectId) {
        setDprs([]);
        return;
      }
      
      try {
        setIsLoadingDprs(true);
        let res;

        if (statusFilter === "PENDING") {
          res = await managerDpr.getPending(selectedProjectId);
        } else if (statusFilter === "APPROVED") {
           res = await managerDpr.getApproved(selectedProjectId);
        } else if (statusFilter === "REJECTED") {
           res = await managerDpr.getRejected(selectedProjectId);
        } else {
           res = await managerDpr.getAll(selectedProjectId);
        }

        setDprs(res.dprs || []);
      } catch (err) {
        console.error("Failed to fetch DPRs:", err);
      } finally {
        setIsLoadingDprs(false);
      }
    };

    fetchDprs();
  }, [selectedProjectId, statusFilter]);

  // Table columns
  const columns: Column<any>[] = useMemo(
    () => [
      {
        key: "report_date", // Changed from 'date' to 'report_date' to match Owner/API common
        label: "Date",
        sortable: true,
        width: "120px",
        render: (value: string) => new Date(value).toLocaleDateString("en-IN"),
      },
      {
        key: "project_name",
        label: "Project",
        sortable: true,
        render: (value: string) => (
          <div className="font-medium text-foreground">{value}</div>
        ),
      },
       {
        key: "status",
        label: "Status",
        width: "120px",
        render: (value: string) => <StatusBadge status={value} />,
      },
      {
        key: "work_description",
        label: "Work Description",
        render: (value: string) => (
          <div className="max-w-md truncate" title={value}>
            {value}
          </div>
        ),
      },
      {
        key: "manpower_total",
        label: "Manpower",
        width: "100px",
        render: (value: number) => (
          <span className="font-mono text-sm">{value || "-"}</span>
        ),
      },
      {
        key: "submitted_by_name",
        label: "Submitted By",
        width: "150px",
        render: (value: string) => (
          <span className="text-sm">{value}</span>
        ),
      },
      {
        key: "actions",
        label: "View",
        width: "80px",
        render: (_: any, row: any) => (
          <button 
            onClick={() => router.push(`/manager/dprs/${row.id}`)}
            className="p-2 hover:bg-muted rounded-full transition-colors text-muted-foreground hover:text-foreground"
            title="View Details"
          >
            <Eye size={16} />
          </button>
        ),
      },
    ],
    [router]
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
      <DashboardHeader userName={user?.name?.split(" ")[0]} title="Daily Progress Reports" />

      {/* Filters Bar */}
      <div className="glass-card rounded-2xl p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Filter size={16} />
            <span>Filters:</span>
          </div>
          <ProjectSelector projects={projects} selected={selectedProjectId} onSelect={setSelectedProjectId} />
          {selectedProjectId && (
            <StatusFilter selected={statusFilter} onSelect={setStatusFilter} />
          )}
        </div>
      </div>

      {/* DPR Table */}
      {isLoadingDprs ? (
        <div className="glass-card rounded-2xl p-12 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="ml-2 text-muted-foreground">Loading DPRs...</span>
        </div>
      ) : (
        <DataTable
          data={dprs}
          columns={columns}
          searchable={true}
          searchKeys={["project_name", "work_description", "submitted_by_name"]}
          emptyMessage={selectedProjectId ? "No DPRs found for this project." : "Select a project to view DPRs."}
          itemsPerPage={15}
        />
      )}
    </div>
  );
}

