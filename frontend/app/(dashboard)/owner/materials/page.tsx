"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/components/providers/AuthContext";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DataTable, Column } from "@/components/ui/DataTable";
import { ownerOrganization, ownerProjects, ownerMaterials, Project, MaterialRequest, MaterialBill } from "@/lib/api/owner";
import { Loader2, Filter, Eye } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { BillImageModal } from "@/components/dashboard/BillImageModal";

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
      className="h-10 px-3 bg-background/50 border border-border rounded-lg text-sm"
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

export default function OwnerMaterialsPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"requests" | "bills">("requests");
  const [requests, setRequests] = useState<MaterialRequest[]>([]);
  const [bills, setBills] = useState<MaterialBill[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewBill, setViewBill] = useState<MaterialBill | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const orgRes = await ownerOrganization.get();
      if (orgRes.organization) {
        const projectsRes = await ownerProjects.getAll(orgRes.organization.id);
        setProjects(projectsRes.projects || []);
      }
      setIsLoading(false);
    };
    fetchData();
  }, []);

  useEffect(() => {
    const fetchMaterials = async () => {
      const filters = selectedProjectId ? { project_id: selectedProjectId } : undefined;
      if (activeTab === "requests") {
        const res = await ownerMaterials.getRequests(filters);
        setRequests(res.requests || []);
      } else {
        const res = await ownerMaterials.getBills(filters);
        setBills(res.bills || []);
      }
    };
    fetchMaterials();
  }, [selectedProjectId, activeTab]);

  const requestColumns: Column<MaterialRequest>[] = useMemo(
    () => [
      {
        key: "title",
        label: "Material",
        sortable: true,
      },
      {
        key: "category",
        label: "Category",
        width: "120px",
      },
      {
        key: "quantity",
        label: "Quantity",
        width: "100px",
        render: (value: number) => value,
      },
      {
        key: "project_name",
        label: "Project",
        render: (value: string) => value || "-",
      },
      {
        key: "engineer_name",
        label: "Engineer",
        render: (value: string) => value || "-",
      },
      {
        key: "status",
        label: "Status",
        width: "120px",
        render: (value: string) => (
          <span className={`text-xs px-2 py-1 rounded ${value === "APPROVED" ? "bg-green-500/20 text-green-400" : value === "REJECTED" ? "bg-red-500/20 text-red-400" : "bg-amber-500/20 text-amber-400"}`}>
            {value}
          </span>
        ),
      },
    ],
    []
  );

  const billColumns: Column<MaterialBill>[] = useMemo(
    () => [
      {
        key: "bill_number",
        label: "Bill #",
        sortable: true,
        width: "120px",
      },
      {
        key: "vendor_name",
        label: "Vendor",
      },
      {
        key: "category",
        label: "Category",
      },
      {
        key: "total_amount",
        label: "Amount",
        sortable: true,
        width: "140px",
        render: (value: number) =>
          new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 0,
          }).format(value),
      },
      {
        key: "project_name",
        label: "Project",
        render: (value: string) => value || "-",
      },
      { 
        key: "status",
        label: "Status",
        width: "120px",
        render: (value: string) => (
          <span className={`text-xs px-2 py-1 rounded ${value === "APPROVED" ? "bg-green-500/20 text-green-400" : value === "REJECTED" ? "bg-red-500/20 text-red-400" : "bg-amber-500/20 text-amber-400"}`}>
            {value}
          </span>
        ),
      },
      {
        key: "id",
        label: "Actions",
        width: "100px",
        render: (id: string, row: MaterialBill) => (
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-3 text-primary border-primary/20 hover:bg-primary/10"
            onClick={() => setViewBill(row)}
          >
            <Eye size={14} className="mr-1" /> View
          </Button>
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
      <DashboardHeader userName={user?.name?.split(" ")[0]} title="Materials Management" />
      
      <div className="glass-card rounded-2xl p-4 flex items-center gap-4">
        <Filter size={16} className="text-muted-foreground" />
        <ProjectSelector projects={projects} selected={selectedProjectId} onSelect={setSelectedProjectId} />
        
        <div className="flex gap-2 ml-auto">
          <button
            onClick={() => setActiveTab("requests")}
            className={`px-4 py-2 rounded-lg transition ${activeTab === "requests" ? "bg-primary text-primary-foreground" : "bg-muted/50"}`}
          >
            Requests
          </button>
          <button
            onClick={() => setActiveTab("bills")}
            className={`px-4 py-2 rounded-lg transition ${activeTab === "bills" ? "bg-primary text-primary-foreground" : "bg-muted/50"}`}
          >
            Bills
          </button>
        </div>
      </div>

      {activeTab === "requests" ? (
        <DataTable
          data={requests}
          columns={requestColumns}
          searchable={true}
          searchKeys={["title", "project_name", "engineer_name"]}
          emptyMessage="No material requests found"
          itemsPerPage={15}
        />
      ) : (
        <DataTable
          data={bills}
          columns={billColumns}
          searchable={true}
          searchKeys={["bill_number", "vendor_name", "category", "project_name"]}
          emptyMessage="No material bills found"
          itemsPerPage={15}
        />
      )}

      {/* Bill Image Modal */}
      {viewBill && (
        <BillImageModal
          bill={viewBill}
          onClose={() => setViewBill(null)}
        />
      )}
    </div>
  );
}
