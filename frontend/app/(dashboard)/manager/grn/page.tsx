"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/components/providers/AuthContext";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DataTable, Column } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/badge";
import { managerGrn, managerProjects, managerOrganization, Project } from "@/lib/api/manager";
import { Loader2, Package, CheckCircle2, XCircle, Clock, Filter, CheckSquare, Eye } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useRouter } from "next/navigation";

// Reuse Types
interface GRN {
  id: string;
  project_id: string;
  purchase_order_id: string;
  material_request_id: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  created_at: string;
  po_number: string;
  vendor_name: string;
  material_request_title: string;
  received_by_name: string;
  reviewed_by_name?: string;
  manager_feedback?: string;
}

// Project Selector Component
function ProjectSelector({
  projects,
  selectedId,
  onSelect,
}: {
  projects: Project[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="glass-card rounded-xl p-4 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Filter size={16} className="text-muted-foreground" />
        <span className="text-sm font-medium">Select Project</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {projects.map((project) => (
          <button
            key={project.id}
            onClick={() => onSelect(project.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              selectedId === project.id
                ? "bg-primary text-primary-foreground"
                : "bg-muted/50 hover:bg-muted text-foreground"
            }`}
          >
            {project.name}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function ManagerGRNPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [grns, setGRNs] = useState<GRN[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingGRNs, setIsLoadingGRNs] = useState(false);

  // Fetch projects on mount
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setIsLoading(true);
        // Get org first
        const orgRes = await managerOrganization.getMyRequests();
        const approvedOrg = orgRes.requests.find(r => r.status === 'APPROVED');
        
        if (approvedOrg?.org_id) {
          const res = await managerProjects.getMyProjects(approvedOrg.org_id);
          // Filter only active projects
          const activeProjects = (res.projects || []).filter(p => p.my_status === 'ACTIVE' || p.is_creator);
          setProjects(activeProjects);
          if (activeProjects.length > 0) {
            setSelectedProjectId(activeProjects[0].id);
          }
        }
      } catch (err) {
        console.error("Failed to fetch projects:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProjects();
  }, []);

  // Fetch GRNs when project changes
  useEffect(() => {
    const fetchGRNs = async () => {
      if (!selectedProjectId) return;
      try {
        setIsLoadingGRNs(true);
        const res = await managerGrn.getProjectGrns(selectedProjectId);
        setGRNs(res.grns || []);
      } catch (err) {
        console.error("Failed to fetch GRNs:", err);
        setGRNs([]);
      } finally {
        setIsLoadingGRNs(false);
      }
    };
    fetchGRNs();
  }, [selectedProjectId]);

  const columns: Column<GRN>[] = useMemo(() => [
    {
      key: "po_number",
      label: "PO Details",
      render: (value, row) => (
        <div>
          <p className="font-mono font-medium">{row.po_number}</p>
          <p className="text-xs text-muted-foreground">{row.vendor_name}</p>
        </div>
      ),
    },
    {
      key: "material_request_title",
      label: "Material",
      render: (value, row) => (
        <div>
          <p className="font-medium">{row.material_request_title}</p>
          <p className="text-xs text-muted-foreground">Recv by: {row.received_by_name}</p>
        </div>
      ),
    },
    {
      key: "created_at",
      label: "Date",
      render: (value) => new Date(value).toLocaleDateString(),
    },
    {
      key: "status",
      label: "Status",
      render: (value, row) => {
         if (row.status === "APPROVED") {
             return (
                 <Badge className="bg-green-500/10 text-green-600 gap-1 hover:bg-green-500/20 pointer-events-none">
                     <CheckCircle2 size={12} /> Approved
                 </Badge>
             );
         }
         if (row.status === "REJECTED") {
            return (
                <Badge className="bg-red-500/10 text-red-600 gap-1 hover:bg-red-500/20 pointer-events-none">
                    <XCircle size={12} /> Rejected
                </Badge>
            );
        }
         return (
             <Badge className="bg-yellow-500/10 text-yellow-600 gap-1 hover:bg-yellow-500/20 pointer-events-none">
                 <Clock size={12} /> Pending Review
             </Badge>
         );
      }
    },
    {
      key: "id",
      label: "Action",
      render: (value, row) => (
        <Button 
          size="sm"
          className={row.status === "PENDING" ? "bg-primary" : "bg-muted hover:bg-muted/80 text-foreground"}
          onClick={() => router.push(`/manager/grn/${row.id}`)}
        >
          {row.status === "PENDING" ? (
            <>
              <CheckSquare size={14} className="mr-2" /> Verify
            </>
          ) : (
            <>
              <Eye size={14} className="mr-2" /> View
            </>
          )}
        </Button>
      )
    },
  ], [router]);

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pt-12 md:pt-0 pb-12">
      <DashboardHeader
        userName={user?.name?.split(" ")[0]}
        title="Good Receipt Notes (GRN)"
      />

      {projects.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center">
          <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-bold text-muted-foreground mb-2">No Active Projects</h3>
          <p className="text-sm text-muted-foreground">
            Join or create a project to manage GRNs.
          </p>
        </div>
      ) : (
        <>
          <ProjectSelector
            projects={projects}
            selectedId={selectedProjectId}
            onSelect={setSelectedProjectId}
          />

          {isLoadingGRNs ? (
            <div className="glass-card rounded-2xl p-8 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="ml-2 text-muted-foreground">Loading GRNs...</span>
            </div>
          ) : grns.length === 0 ? (
            <div className="glass-card rounded-2xl p-12 text-center">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-bold text-muted-foreground mb-2">No GRNs Found</h3>
              <p className="text-sm text-muted-foreground">
                No items found for this project.
              </p>
            </div>
          ) : (
            <div className="glass-card rounded-2xl p-6">
                <DataTable
                data={grns}
                columns={columns}
                searchKeys={["po_number", "material_request_title", "vendor_name"]}
                />
            </div>
          )}
        </>
      )}
    </div>
  );
}
