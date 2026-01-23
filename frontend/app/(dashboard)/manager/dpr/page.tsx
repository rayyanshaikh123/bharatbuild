"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/components/providers/AuthContext";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DataTable, Column } from "@/components/ui/DataTable";
import { managerOrganization, managerProjects, Project } from "@/lib/api/manager";
import { managerDpr } from "@/lib/api/dpr";
import {
  Loader2,
  FileText,
  Filter,
  Eye,
  Calendar,
  MapPin,
  CheckCircle,
  AlertCircle,
  Clock,
} from "lucide-react";

// Helper for status badge
function StatusBadge({ status }: { status: string }) {
  const config = {
    APPROVED: { color: "bg-green-500/20 text-green-400", label: "Approved", icon: CheckCircle },
    PENDING: { color: "bg-amber-500/20 text-amber-400", label: "Pending", icon: Clock },
    REJECTED: { color: "bg-red-500/20 text-red-400", label: "Rejected", icon: AlertCircle },
  };

  const { color, label, icon: Icon } = config[status as keyof typeof config] || {
    color: "bg-gray-500/20 text-gray-400",
    label: status,
    icon: AlertCircle,
  };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${color}`}>
      <Icon size={12} />
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

export default function ManagerDprPage() {
  const { user } = useAuth();
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [dprs, setDprs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingDprs, setIsLoadingDprs] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch organization and projects
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setIsLoading(true);
        const orgsRes = await managerOrganization.getMyOrganizations();
        if (orgsRes.organizations && orgsRes.organizations.length > 0) {
          const orgId = orgsRes.organizations[0].org_id;
           if (!orgId) {
             console.error("Organization ID missing in response", orgsRes.organizations[0]);
             setError("Invalid organization data");
             return;
          }
          setOrganizationId(orgId);
          const projectsRes = await managerProjects.getMyProjects(orgId);
          setProjects(projectsRes.projects || []);
        } else {
             setProjects([]);
        }
      } catch (err) {
        console.error("Failed to fetch initial data:", err);
        setError("Failed to load organization data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitialData();
  }, []);

  // Fetch DPRs
  useEffect(() => {
    // DPR API requires a project ID, so only fetch if project is selected
    if (!selectedProjectId) {
      setDprs([]);
      return;
    }

    const fetchDprs = async () => {
      try {
        setIsLoadingDprs(true);
        const res = await managerDpr.getAll(selectedProjectId);
        setDprs(res.dprs);
      } catch (err) {
        console.error("Failed to fetch DPRs:", err);
        setError("Failed to load DPRs");
      } finally {
        setIsLoadingDprs(false);
      }
    };

    fetchDprs();
  }, [selectedProjectId]);

  // Table columns
  const columns: Column<any>[] = useMemo(
    () => [
      {
        key: "date",
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
          <span className="text-sm text-muted-foreground line-clamp-1">{value}</span>
        ),
      },
      {
        key: "manpower_total",
        label: "Manpower",
        width: "100px",
        render: (value: number) => (
          <span className="font-mono text-sm">{value}</span>
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
          <button className="p-2 hover:bg-muted rounded-full transition-colors text-muted-foreground hover:text-foreground">
            <Eye size={16} />
          </button>
        ),
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
      <DashboardHeader userName={user?.name?.split(" ")[0]} title="Daily Progress Reports" />

      {/* Filters Bar */}
      <div className="glass-card rounded-2xl p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Filter size={16} />
              <span>Filters:</span>
            </div>
            <ProjectSelector projects={projects} selected={selectedProjectId} onSelect={setSelectedProjectId} />
          </div>
        </div>
      </div>

      {/* Stats Cards could go here */}

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
          emptyMessage="No DPRs found."
          itemsPerPage={15}
        />
      )}
    </div>
  );
}
