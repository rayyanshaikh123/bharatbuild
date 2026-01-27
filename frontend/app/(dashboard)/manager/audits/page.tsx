"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/components/providers/AuthContext";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DataTable, Column } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/Button";
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
  Eye,
} from "lucide-react";
import { createPortal } from "react-dom";

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
  const [selectedAudit, setSelectedAudit] = useState<AuditLog | null>(null);

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
        render: (value: any, row: AuditLog) => {
          if (!value) return <span className="text-muted-foreground text-sm">—</span>;
          
          // Handle object type (from backend auditLogger)
          if (typeof value === 'object') {
            if (value.changed_fields && Array.isArray(value.changed_fields) && value.changed_fields.length > 0) {
               return (
                 <div className="flex items-center gap-2">
                   <span className="text-sm text-foreground truncate max-w-[150px]">Updated: {value.changed_fields.join(", ")}</span>
                   <button 
                     onClick={() => setSelectedAudit(row)}
                     className="text-primary hover:text-primary/80 transition-colors"
                     title="View Full Details"
                   >
                     <Eye size={16} />
                   </button>
                 </div>
               );
            }
            if (value.action === "CREATE") return (
                 <div className="flex items-center gap-2">
                   <span className="text-sm text-muted-foreground">Created new record</span>
                   <button 
                     onClick={() => setSelectedAudit(row)}
                     className="text-primary hover:text-primary/80 transition-colors"
                     title="View Full Details"
                   >
                     <Eye size={16} />
                   </button>
                 </div>
            );
            return (
               <div className="flex items-center gap-2">
                 <span className="text-sm text-muted-foreground truncate max-w-[150px]">View Details</span>
                 <button 
                     onClick={() => setSelectedAudit(row)}
                     className="text-primary hover:text-primary/80 transition-colors"
                     title="View Full Details"
                   >
                     <Eye size={16} />
                   </button>
               </div>
            );
          }

          // Handle string type (legacy or simple message)
          return <span className="text-sm text-muted-foreground">{String(value)}</span>;
        },
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

      {/* Details Modal */}
      {selectedAudit && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[9999]" onClick={(e) => {
          if (e.target === e.currentTarget) setSelectedAudit(null);
        }}>
          <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-2xl p-6 animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between mb-4 flex-shrink-0">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <History className="text-primary" size={24} />
                Audit Details
              </h3>
              <button onClick={() => setSelectedAudit(null)} className="text-muted-foreground hover:text-foreground">
                <XCircle size={24} />
              </button>
            </div>
            
            <div className="space-y-4 overflow-y-auto flex-1 pr-2">
              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Entity Type</p>
                    <p className="text-sm font-semibold capitalize">{selectedAudit.entity_type.replace(/_/g, " ")}</p>
                 </div>
                 <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Action</p>
                    <ActionBadge action={selectedAudit.action} />
                 </div>
                 <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Project</p>
                    <p className="text-sm">{selectedAudit.project_name || "—"}</p>
                 </div>
                 <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Performed By</p>
                    <p className="text-sm">{selectedAudit.acted_by_role.replace(/_/g, " ")}</p>
                 </div>
              </div>

              <div className="space-y-2">
                 <p className="text-sm font-medium text-foreground">Change Summary</p>
                 {(() => {
                      let content: any = null;
                      try {
                        content = typeof selectedAudit.change_summary === 'string' 
                          ? JSON.parse(selectedAudit.change_summary) 
                          : selectedAudit.change_summary;
                      } catch (e) {
                         return <pre className="text-xs p-2 bg-muted rounded">{String(selectedAudit.change_summary)}</pre>;
                      }

                      if (!content || typeof content !== 'object') return <p className="text-xs text-muted-foreground">No details available</p>;

                      return (
                        <div className="space-y-4">
                          {/* Changed Fields Badge List */}
                          {content.changed_fields && Array.isArray(content.changed_fields) && content.changed_fields.length > 0 && (
                            <div className="flex flex-wrap gap-2 items-center bg-yellow-500/5 p-2 rounded-lg border border-yellow-500/10">
                              <span className="text-xs font-bold text-yellow-600 mr-1">Changed:</span>
                              {content.changed_fields.map((field: string) => (
                                <Badge key={field} variant="outline" className="bg-yellow-500/10 text-yellow-700 hover:bg-yellow-500/20 border-yellow-500/20 text-[10px] px-1.5 py-0.5 h-5">
                                  {field}
                                </Badge>
                              ))}
                            </div>
                          )}

                          {/* Comparison Grid */}
                          {(content.before || content.after) ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                               {/* Before State */}
                               {content.before && (
                                 <div className="bg-red-500/5 border border-red-500/10 rounded-lg p-3">
                                    <div className="flex items-center gap-2 mb-3 border-b border-red-500/10 pb-2">
                                      <div className="w-2 h-2 rounded-full bg-red-500" />
                                      <p className="text-xs font-bold text-red-600 uppercase tracking-wider">Before</p>
                                    </div>
                                    <div className="space-y-1">
                                      {Object.entries(content.before).map(([key, val]) => (
                                        <div key={key} className="grid grid-cols-[1fr_2fr] gap-2 text-xs border-b border-red-500/5 pb-1 last:border-0 hover:bg-red-500/5 px-1 rounded transition-colors">
                                          <span className="font-medium text-muted-foreground truncate" title={key}>{key}</span>
                                          <span className="text-foreground break-words font-mono text-[10px] leading-relaxed">
                                            {val === null ? <span className="text-muted-foreground italic">null</span> : 
                                             typeof val === 'object' ? JSON.stringify(val) : String(val)}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                 </div>
                               )}

                               {/* After State */}
                               {content.after && (
                                 <div className="bg-green-500/5 border border-green-500/10 rounded-lg p-3">
                                    <div className="flex items-center gap-2 mb-3 border-b border-green-500/10 pb-2">
                                      <div className="w-2 h-2 rounded-full bg-green-500" />
                                      <p className="text-xs font-bold text-green-600 uppercase tracking-wider">After</p>
                                    </div>
                                    <div className="space-y-1">
                                      {Object.entries(content.after).map(([key, val]) => (
                                        <div key={key} className="grid grid-cols-[1fr_2fr] gap-2 text-xs border-b border-green-500/5 pb-1 last:border-0 hover:bg-green-500/5 px-1 rounded transition-colors">
                                          <span className="font-medium text-muted-foreground truncate" title={key}>{key}</span>
                                          <span className="text-foreground break-words font-mono text-[10px] leading-relaxed">
                                            {val === null ? <span className="text-muted-foreground italic">null</span> : 
                                             typeof val === 'object' ? JSON.stringify(val) : String(val)}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                 </div>
                               )}
                            </div>
                          ) : (
                             // Fallback for objects without before/after (e.g. custom logs)
                             <div className="p-4 rounded-lg bg-muted/50 border border-border font-mono text-xs overflow-x-auto">
                                <pre>{JSON.stringify(content, null, 2)}</pre>
                             </div>
                          )}
                        </div>
                      );
                  })()}
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-border flex justify-end flex-shrink-0">
               <button onClick={() => setSelectedAudit(null)}>Close</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
