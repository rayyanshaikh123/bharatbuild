"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/components/providers/AuthContext";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DataTable, Column } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/badge";
import { managerGrn, managerProjects, managerOrganization, Project } from "@/lib/api/manager";
import { Loader2, Package, CheckCircle2, XCircle, Clock, Filter, CheckSquare } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";

// Reuse Types (should be imported but defining here for speed if not exported from po-manager api)
interface GRN {
  id: string;
  project_id: string;
  purchase_order_id: string;
  material_request_id: string;
  site_engineer_id: string;
  grn_number: string;
  challan_number?: string;
  challan_photo?: string;
  item_photo?: string;
  vehicle_number?: string;
  received_at: string;
  remarks?: string;
  quality_check_status: "PENDING" | "PASSED" | "FAILED";
  quality_check_remarks?: string;
  status: "PENDING" | "VERIFIED" | "REJECTED";
  verified_by?: string;
  verified_at?: string;
  created_at: string;
  // Joins
  project_name?: string;
  po_number?: string;
  vendor_name?: string;
  material_request_title?: string;
  engineer_name?: string;
  verified_by_name?: string;
  quantity_received?: number;
  unit?: string;
}

// Project Selector Component (Reused logic)
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
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [grns, setGRNs] = useState<GRN[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingGRNs, setIsLoadingGRNs] = useState(false);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

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
          setProjects(res.projects || []);
          if (res.projects && res.projects.length > 0) {
            setSelectedProjectId(res.projects[0].id);
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

  const handleVerify = async (grnId: string) => {
    const remarks = window.prompt("Enter remarks for verification (optional):");
    if (remarks === null) return; // Cancelled

    setVerifyingId(grnId);
    try {
      await managerGrn.verify(grnId, remarks);
      toast.success("GRN Verified Successfully");
      // Refresh list
      const res = await managerGrn.getProjectGrns(selectedProjectId!);
      setGRNs(res.grns || []);
    } catch (err: any) {
      console.error("Failed to verify:", err);
      toast.error(err.response?.data?.error || "Failed to verify GRN");
    } finally {
      setVerifyingId(null);
    }
  };

  const columns: Column<GRN>[] = useMemo(() => [
    {
      key: "grn_number",
      label: "GRN Number",
      render: (value, row) => <span className="font-mono font-medium">{row.grn_number}</span>,
    },
    {
      key: "po_number",
      label: "PO Number",
      render: (value, row) => <span className="font-mono text-sm">{row.po_number}</span>,
    },
    {
      key: "material_request_title",
      label: "Material",
      render: (value, row) => (
        <div>
          <p className="font-medium">{row.material_request_title}</p>
          <p className="text-xs text-muted-foreground">{row.vendor_name}</p>
        </div>
      ),
    },
    {
      key: "quantity_received",
      label: "Status",
      render: (value, row) => (
         <div className="flex flex-col gap-1">
             <span className="text-sm font-semibold">{row.quantity_received} {row.unit}</span>
             {row.quality_check_status === "PASSED" ? (
                <span className="text-[10px] text-green-500 font-bold flex items-center gap-1">
                    <CheckCircle2 size={10} /> QC Passed
                </span>
             ) : row.quality_check_status === "FAILED" ? (
                <span className="text-[10px] text-red-500 font-bold flex items-center gap-1">
                    <XCircle size={10} /> QC Failed
                </span>
             ) : (
                <span className="text-[10px] text-yellow-500 font-bold flex items-center gap-1">
                    <Clock size={10} /> QC Pending
                </span>
             )}
         </div>
      ),
    },
    {
      key: "status",
      label: "Verification",
      render: (value, row) => {
         if (row.status === "VERIFIED") {
             return (
                 <Badge className="bg-green-500/10 text-green-600 gap-1 hover:bg-green-500/20">
                     <CheckCircle2 size={12} /> Verified
                 </Badge>
             );
         }
         return (
             <Button 
                size="sm" 
                onClick={() => handleVerify(row.id)}
                disabled={!!verifyingId}
                className="h-7 text-xs bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary border-0"
             >
                 {verifyingId === row.id ? <Loader2 size={12} className="animate-spin mr-1"/> : <CheckSquare size={12} className="mr-1"/>}
                 Verify
             </Button>
         );
      }
    },
  ], [verifyingId]);

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
        title="GRN Verification"
      />

      {projects.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center">
          <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-bold text-muted-foreground mb-2">No Projects</h3>
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
                No items pending verification.
              </p>
            </div>
          ) : (
            <DataTable
              data={grns}
              columns={columns}
              searchKeys={["grn_number", "po_number", "material_request_title", "vendor_name"]}
            />
          )}
        </>
      )}
    </div>
  );
}
