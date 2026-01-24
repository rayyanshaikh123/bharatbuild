"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/components/providers/AuthContext";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DataTable, Column } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/badge";
import { poManagerRequests, poManagerProjects, MaterialRequest, Project } from "@/lib/api/po-manager";
import { Loader2, Package, Filter, FileText, Plus, Eye } from "lucide-react";
import { Button } from "@/components/ui/Button";
import Link from "next/link";

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
      <option value="">All Projects</option>
      {projects.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name}
        </option>
      ))}
    </select>
  );
}

export default function MaterialRequestsPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [requests, setRequests] = useState<MaterialRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);

  // Fetch projects
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await poManagerProjects.getMyProjects();
        setProjects(res.projects);
      } catch (err) {
        console.error("Failed to fetch projects:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProjects();
  }, []);

  // Fetch requests when project changes
  useEffect(() => {
    if (!selectedProjectId) {
      setRequests([]);
      return;
    }
    
    const fetchRequests = async () => {
      try {
        setIsLoadingRequests(true);
        const res = await poManagerRequests.getApproved(selectedProjectId);
        setRequests(res.requests);
      } catch (err) {
        console.error("Failed to fetch requests:", err);
        setRequests([]);
      } finally {
        setIsLoadingRequests(false);
      }
    };
    fetchRequests();
  }, [selectedProjectId]);

  // Table columns
  const columns: Column<MaterialRequest>[] = useMemo(
    () => [
      {
        key: "title",
        label: "Material",
        sortable: true,
        render: (value: string, row: MaterialRequest) => (
          <div>
            <div className="font-medium">{value}</div>
            <div className="text-xs text-muted-foreground">{row.category}</div>
          </div>
        ),
      },
      {
        key: "quantity",
        label: "Qty",
        width: "80px",
        render: (value: number) => (
          <span className="font-mono bg-muted/50 px-2 py-0.5 rounded">{value}</span>
        ),
      },
      {
        key: "project_name",
        label: "Project",
        render: (value: string) => <span className="text-sm">{value}</span>,
      },
      {
        key: "engineer_name",
        label: "Requested By",
        render: (value: string) => <span className="text-sm">{value}</span>,
      },
      {
        key: "has_po",
        label: "PO Status",
        width: "140px",
        render: (_: unknown, row: MaterialRequest) => {
          if (row.has_po) {
            return (
              <Badge variant="outline" className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                PO: {row.po_number} ({row.po_status})
              </Badge>
            );
          }
          return (
            <Badge variant="outline" className="bg-amber-500/20 text-amber-400 border-amber-500/30">
              Pending PO
            </Badge>
          );
        },
      },
      {
        key: "created_at",
        label: "Requested On",
        width: "120px",
        render: (value: string) => new Date(value).toLocaleDateString(),
      },
      {
        key: "actions",
        label: "Actions",
        width: "120px",
        render: (_: unknown, row: MaterialRequest) => {
          if (row.has_po) {
            return (
              <Link href={`/po-manager/purchase-orders`}>
                <Button size="sm" variant="outline" className="gap-1">
                  <Eye size={14} />
                  View PO
                </Button>
              </Link>
            );
          }
          return (
            <Link href={`/po-manager/purchase-orders/create?requestId=${row.id}&projectId=${row.project_id}`}>
              <Button size="sm" className="gap-1">
                <Plus size={14} />
                Create PO
              </Button>
            </Link>
          );
        },
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
      <DashboardHeader userName={user?.name?.split(" ")[0]} title="Material Requests" />

      {/* Filters Bar */}
      <div className="glass-card rounded-2xl p-4 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Filter size={16} />
          <span className="text-sm">Filter:</span>
        </div>
        <ProjectSelector 
          projects={projects} 
          selected={selectedProjectId} 
          onSelect={setSelectedProjectId} 
        />
      </div>

      {/* Info Banner */}
      <div className="glass-card rounded-2xl p-4 bg-blue-500/5 border-blue-500/20">
        <div className="flex items-center gap-3">
          <Package className="w-5 h-5 text-blue-400" />
          <p className="text-sm text-muted-foreground">
            These are <strong>approved</strong> material requests awaiting Purchase Order generation.
          </p>
        </div>
      </div>

      {/* Requests Table */}
      {!selectedProjectId ? (
        <div className="glass-card rounded-2xl p-12 flex flex-col items-center justify-center text-center">
          <Package className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium mb-2">Select a Project</h3>
          <p className="text-muted-foreground">Please select a project from the filter above to view material requests.</p>
        </div>
      ) : isLoadingRequests ? (
        <div className="glass-card rounded-2xl p-12 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="ml-2 text-muted-foreground">Loading requests...</span>
        </div>
      ) : (
        <DataTable
          data={requests}
          columns={columns}
          searchable
          searchKeys={["title", "project_name", "engineer_name", "category"]}
          emptyMessage="No approved material requests found for this project."
          itemsPerPage={15}
        />
      )}
    </div>
  );
}
