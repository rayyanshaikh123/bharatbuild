"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/components/providers/AuthContext";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DataTable, Column } from "@/components/ui/DataTable";
import { ownerOrganization, ownerProjects, ownerDpr, Project, DprEntry } from "@/lib/api/owner";
import { Loader2, FileText, Filter, Calendar, Eye } from "lucide-react";

// Status badge component
function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { color: string; label: string }> = {
    PENDING: { color: "bg-amber-500/20 text-amber-400 border-amber-500/20", label: "Pending" },
    APPROVED: { color: "bg-green-500/20 text-green-400 border-green-500/20", label: "Approved" },
    REJECTED: { color: "bg-red-500/20 text-red-400 border-red-500/20", label: "Rejected" },
  };

  const { color, label } = config[status] || config.PENDING;

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${color}`}>
      {label}
    </span>
  );
}

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

// Status filter
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

export default function OwnerDprPage() {
  const { user } = useAuth();
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [dprs, setDprs] = useState<DprEntry[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [isLoadingDprs, setIsLoadingDprs] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  // Fetch organization and projects
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setIsLoadingProjects(true);
        const orgRes = await ownerOrganization.get();
        if (orgRes.organization) {
          setOrganizationId(orgRes.organization.id);
          const projectsRes = await ownerProjects.getAll(orgRes.organization.id);
          setProjects(projectsRes.projects || []);
        }
      } catch (err) {
        console.error("Failed to fetch projects:", err);
        setError("Failed to load projects");
      } finally {
        setIsLoadingProjects(false);
      }
    };

    fetchInitialData();
  }, []);

  // Fetch DPRs when project or status filter changes
  useEffect(() => {
    if (!selectedProjectId) {
      setDprs([]);
      return;
    }

    const fetchDprs = async () => {
      try {
        setIsLoadingDprs(true);
        let res;
        
        if (statusFilter === "PENDING") {
          res = await ownerDpr.getPending(selectedProjectId);
        } else if (statusFilter === "APPROVED") {
          res = await ownerDpr.getApproved(selectedProjectId);
        } else if (statusFilter === "REJECTED") {
          res = await ownerDpr.getRejected(selectedProjectId);
        } else {
          res = await ownerDpr.getAll(selectedProjectId);
        }
        
        setDprs(res.dprs || []);
      } catch (err) {
        console.error("Failed to fetch DPRs:", err);
        setError("Failed to load DPRs");
      } finally {
        setIsLoadingDprs(false);
      }
    };

    fetchDprs();
  }, [selectedProjectId, statusFilter]);

  // Table columns
  const columns: Column<DprEntry>[] = useMemo(
    () => [
      {
        key: "report_date",
        label: "Date",
        sortable: true,
        width: "120px",
        render: (value: string) => new Date(value).toLocaleDateString("en-IN"),
      },
      {
        key: "engineer_name",
        label: "Engineer",
        width: "150px",
        render: (value: string) => value || "-",
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
        key: "labour_count",
        label: "Labour",
        width: "80px",
        render: (value: number) => value || "-",
      },
      {
        key: "status",
        label: "Status",
        width: "120px",
        render: (value: string) => <StatusBadge status={value} />,
      },
      {
        key: "submitted_at",
        label: "Submitted",
        sortable: true,
        width: "150px",
        render: (value: string) => new Date(value).toLocaleString("en-IN", {
          dateStyle: "short",
          timeStyle: "short",
        }),
      },
      {
        key: "actions",
        label: "View",
        width: "80px",
        render: (_: any, row: any) => (
          <button 
            onClick={() => window.location.href = `/owner/dpr/${row.id}`}
            className="p-2 hover:bg-muted rounded-full transition-colors text-muted-foreground hover:text-foreground"
            title="View Details"
          >
            <Eye size={16} />
          </button>
        ),
      },
    ],
    []
  );

  if (isLoadingProjects) {
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
        title="Daily Progress Reports"
      />

      {/* Filters Bar */}
      <div className="glass-card rounded-2xl p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Filter size={16} />
            <span>Filters:</span>
          </div>
          <ProjectSelector
            projects={projects}
            selected={selectedProjectId}
            onSelect={setSelectedProjectId}
          />
          {selectedProjectId && (
            <StatusFilter selected={statusFilter} onSelect={setStatusFilter} />
          )}
        </div>
      </div>

      {/* DPR Table */}
      {!selectedProjectId ? (
        <div className="glass-card rounded-2xl p-12 text-center">
          <FileText className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-semibold text-muted-foreground">Select a Project</h3>
          <p className="text-sm text-muted-foreground/60 mt-2">
            Choose a project from the dropdown to view its daily progress reports.
          </p>
        </div>
      ) : isLoadingDprs ? (
        <div className="glass-card rounded-2xl p-12 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="ml-2 text-muted-foreground">Loading DPRs...</span>
        </div>
      ) : (
        <DataTable
          data={dprs}
          columns={columns}
          searchable={true}
          searchKeys={["work_description", "engineer_name", "materials_used"]}
          emptyMessage="No DPRs found for this project."
          itemsPerPage={15}
        />
      )}
    </div>
  );
}
