"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/components/providers/AuthContext";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DataTable, Column } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/badge";
import { managerOrganization, managerProjects, Project } from "@/lib/api/manager";
import { managerAudit } from "@/lib/api/audit";
import type { AuditLog, AuditCategory, AuditAction } from "@/types/ledger";
import {
  Loader2,
  History,
  Filter,
  AlertCircle,
  CheckCircle,
  XCircle,
  Edit,
  Trash,
  Plus,
} from "lucide-react";

// Category badge component
function CategoryBadge({ category }: { category: AuditCategory }) {
  const colors: Record<AuditCategory, string> = {
    PROJECT: "bg-blue-500/20 text-blue-400",
    PLAN: "bg-purple-500/20 text-purple-400",
    MATERIAL: "bg-cyan-500/20 text-cyan-400",
    WAGE: "bg-green-500/20 text-green-400",
    ATTENDANCE: "bg-amber-500/20 text-amber-400",
    LEDGER: "bg-rose-500/20 text-rose-400",
    USER: "bg-indigo-500/20 text-indigo-400",
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${colors[category] || "bg-muted text-muted-foreground"}`}>
      {category}
    </span>
  );
}

// Action badge component
function ActionBadge({ action }: { action: AuditAction }) {
  const config: Record<AuditAction, { icon: typeof CheckCircle; color: string }> = {
    CREATE: { icon: Plus, color: "text-green-400" },
    UPDATE: { icon: Edit, color: "text-blue-400" },
    DELETE: { icon: Trash, color: "text-red-400" },
    APPROVE: { icon: CheckCircle, color: "text-emerald-400" },
    REJECT: { icon: XCircle, color: "text-rose-400" },
  };

  const { icon: Icon, color } = config[action] || { icon: AlertCircle, color: "text-muted-foreground" };

  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${color}`}>
      <Icon size={12} />
      {action}
    </span>
  );
}

// Project filter component
function ProjectFilter({
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
      value={selected ?? ""}
      onChange={(e) => onSelect(e.target.value || null)}
      className="h-10 px-3 bg-background/50 border border-border rounded-lg text-sm text-foreground focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
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

// Category filter component
function CategoryFilter({
  selected,
  onSelect,
}: {
  selected: AuditCategory | null;
  onSelect: (category: AuditCategory | null) => void;
}) {
  const categories: (AuditCategory | null)[] = [null, "PROJECT", "PLAN", "MATERIAL", "WAGE", "ATTENDANCE", "LEDGER"];

  return (
    <div className="flex items-center gap-1 p-1 bg-muted/30 rounded-lg overflow-x-auto">
      {categories.map((cat) => (
        <button
          key={cat ?? "all"}
          onClick={() => onSelect(cat)}
          className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-all ${
            selected === cat
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          }`}
        >
          {cat ?? "All"}
        </button>
      ))}
    </div>
  );
}

// Format date/time helper
function formatDateTime(dateStr: string) {
  const date = new Date(dateStr);
  return {
    date: date.toLocaleDateString("en-IN"),
    time: date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
  };
}

export default function ManagerAuditPage() {
  const { user } = useAuth();
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [audits, setAudits] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingAudits, setIsLoadingAudits] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [projectFilter, setProjectFilter] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<AuditCategory | null>(null);

  // Fetch organization and projects
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setIsLoading(true);
        // Use getMyRequests instead of getMyOrganizations - it returns org_id
        const reqsRes = await managerOrganization.getMyRequests();
        const approved = reqsRes.requests?.find(r => r.status === "APPROVED");
        
        if (approved && approved.org_id) {
          setOrganizationId(approved.org_id);
          const projectsRes = await managerProjects.getMyProjects(approved.org_id);
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

  // Fetch audits with filters
  useEffect(() => {
    if (!organizationId) return;

    const fetchAudits = async () => {
      try {
        setIsLoadingAudits(true);
        const res = await managerAudit.getLogs({
          project_id: projectFilter ?? undefined,
          category: categoryFilter ?? undefined,
          limit: 100,
        });
        setAudits(res.audits);
      } catch (err) {
        console.error("Failed to fetch audits:", err);
        setError("Failed to load audit logs");
      } finally {
        setIsLoadingAudits(false);
      }
    };

    fetchAudits();
  }, [organizationId, projectFilter, categoryFilter]);

  // Table columns
  const columns: Column<AuditLog>[] = useMemo(
    () => [
      {
        key: "created_at",
        label: "When",
        sortable: true,
        width: "150px",
        render: (value: string) => {
          const { date, time } = formatDateTime(value);
          return (
            <div className="text-sm">
              <div className="font-medium">{date}</div>
              <div className="text-xs text-muted-foreground">{time}</div>
            </div>
          );
        },
      },
      {
        key: "category",
        label: "Category",
        width: "120px",
        render: (value: AuditCategory) => <CategoryBadge category={value} />,
      },
      {
        key: "action",
        label: "Action",
        width: "100px",
        render: (value: AuditAction) => {
          const actionColors: Record<string, string> = {
            CREATE: "bg-green-500/20 text-green-400 border-green-500/30",
            UPDATE: "bg-blue-500/20 text-blue-400 border-blue-500/30",
            DELETE: "bg-red-500/20 text-red-400 border-red-500/30",
            APPROVE: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
            REJECT: "bg-rose-500/20 text-rose-400 border-rose-500/30",
          };
          const colors = actionColors[value] || "bg-muted/50 text-muted-foreground";
          return <Badge variant="outline" className={colors}>{value}</Badge>;
        },
      },
      {
        key: "entity_type",
        label: "Entity",
        width: "130px",
        render: (value: string) => (
          <span className="text-sm font-medium capitalize">{value?.replace(/_/g, " ")}</span>
        ),
      },
      {
        key: "project_name",
        label: "Project",
        render: (value: string | null) =>
          value ? (
            <span className="text-sm">{value}</span>
          ) : (
            <span className="text-muted-foreground text-sm">—</span>
          ),
      },
      {
        key: "acted_by_role",
        label: "By",
        width: "130px",
        render: (value: string) => {
          const roleColors: Record<string, string> = {
            OWNER: "bg-purple-500/20 text-purple-400 border-purple-500/30",
            MANAGER: "bg-blue-500/20 text-blue-400 border-blue-500/30",
            SITE_ENGINEER: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
            LABOUR: "bg-amber-500/20 text-amber-400 border-amber-500/30",
          };
          const colors = roleColors[value?.toUpperCase()] || "bg-muted/50 text-muted-foreground";
          const displayRole = value?.replace(/_/g, " ") || "Unknown";
          return <Badge variant="outline" className={colors}>{displayRole}</Badge>;
        },
      },
      {
        key: "change_summary",
        label: "Summary",
        render: (value: string | null) =>
          value ? (
            <span className="text-sm text-muted-foreground">{value}</span>
          ) : (
            <span className="text-muted-foreground text-sm">—</span>
          ),
      },
    ],
    []
  );

  // Calculate summary stats
  const stats = useMemo(() => {
    const byAction: Record<string, number> = {};
    audits.forEach((a) => {
      byAction[a.action] = (byAction[a.action] || 0) + 1;
    });
    return { byAction, total: audits.length };
  }, [audits]);

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pt-12 md:pt-0 pb-12">
      <DashboardHeader userName={user?.name?.split(" ")[0]} title="Project Audit Logs" />

      {/* Filters Bar */}
      <div className="glass-card rounded-2xl p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Filter size={16} />
            <span>Filters:</span>
          </div>
          <ProjectFilter projects={projects} selected={projectFilter} onSelect={setProjectFilter} />
          <CategoryFilter selected={categoryFilter} onSelect={setCategoryFilter} />
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/20">
              <History className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Events</p>
              <p className="text-2xl font-bold text-foreground">{stats.total}</p>
            </div>
          </div>
        </div>
        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/20">
              <Plus className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Creates</p>
              <p className="text-2xl font-bold text-foreground">{stats.byAction["CREATE"] || 0}</p>
            </div>
          </div>
        </div>
        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/20">
              <Edit className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Updates</p>
              <p className="text-2xl font-bold text-foreground">{stats.byAction["UPDATE"] || 0}</p>
            </div>
          </div>
        </div>
        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/20">
              <CheckCircle className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Approvals</p>
              <p className="text-2xl font-bold text-foreground">{stats.byAction["APPROVE"] || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Audit Table */}
      {isLoadingAudits ? (
        <div className="glass-card rounded-2xl p-12 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="ml-2 text-muted-foreground">Loading audit logs...</span>
        </div>
      ) : (
        <DataTable
          data={audits}
          columns={columns}
          searchable={true}
          searchKeys={["entity_type", "project_name", "acted_by_role"]}
          emptyMessage="No audit logs found for your assigned projects."
          itemsPerPage={15}
        />
      )}
    </div>
  );
}
