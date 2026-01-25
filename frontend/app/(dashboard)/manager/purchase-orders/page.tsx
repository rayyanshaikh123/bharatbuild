"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/providers/AuthContext";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DataTable } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/badge";
import { managerPurchaseOrders, managerProjects, managerOrganization, Project } from "@/lib/api/manager";
import { Loader2, ShoppingCart, Filter, Eye, Download } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useRouter } from "next/navigation";

// Project Selector
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

export default function ManagerPurchaseOrdersPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [pos, setPos] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingPOs, setLoadingPOs] = useState(false);

  // Fetch projects
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setIsLoading(true);
        const orgRes = await managerOrganization.getMyRequests();
        const approvedOrg = orgRes.requests.find(r => r.status === 'APPROVED');
        
        if (approvedOrg?.org_id) {
          const res = await managerProjects.getMyProjects(approvedOrg.org_id);
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

  // Fetch POs
  useEffect(() => {
    const fetchPOs = async () => {
      if (!selectedProjectId) return;
      try {
        setLoadingPOs(true);
        const res = await managerPurchaseOrders.getAll(selectedProjectId);
        setPos(res.purchase_orders || []);
      } catch (err) {
        console.error("Failed to fetch POs:", err);
        setPos([]);
      } finally {
        setLoadingPOs(false);
      }
    };
    fetchPOs();
  }, [selectedProjectId]);

  const columns = [
    {
      key: "po_number",
      label: "PO Number",
      render: (val: string) => <span className="font-mono font-medium">{val}</span>
    },
    {
      key: "vendor_name",
      label: "Vendor",
    },
    {
      key: "total_amount",
      label: "Amount",
      render: (val: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(val),
    },
    {
      key: "status",
      label: "Status",
      render: (val: string) => (
        <Badge variant={val === "SENT" ? "default" : "secondary"}>
          {val}
        </Badge>
      )
    },
    {
      key: "created_at",
      label: "Date",
      render: (val: string) => new Date(val).toLocaleDateString(),
    },
    {
      key: "id",
      label: "Action",
      render: (val: string) => (
        <Button 
          size="sm" 
          variant="ghost"
          onClick={() => router.push(`/manager/purchase-orders/${val}`)}
        >
          <Eye size={16} className="mr-2" /> Details
        </Button>
      )
    }
  ];

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
        title="Purchase Orders"
      />

      <div className="flex items-center gap-2 p-4 bg-blue-500/10 text-blue-600 rounded-xl mb-6">
        <ShoppingCart size={20} />
        <p className="text-sm font-medium">Managers have Read-Only access to Purchase Orders. Contact Purchase Manager for changes.</p>
      </div>

      {projects.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center">
          <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-bold text-muted-foreground mb-2">No Active Projects</h3>
        </div>
      ) : (
        <>
          <ProjectSelector
            projects={projects}
            selectedId={selectedProjectId}
            onSelect={setSelectedProjectId}
          />

          {loadingPOs ? (
            <div className="glass-card rounded-2xl p-8 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : pos.length === 0 ? (
            <div className="glass-card rounded-2xl p-12 text-center">
              <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-bold text-muted-foreground mb-2">No Purchase Orders</h3>
            </div>
          ) : (
            <div className="glass-card rounded-2xl p-6">
              <DataTable
                data={pos}
                columns={columns}
                searchKeys={["po_number", "vendor_name"]}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
