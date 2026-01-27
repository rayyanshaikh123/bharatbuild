"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/components/providers/AuthContext";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DataTable, Column } from "@/components/ui/DataTable";
// ... imports
import { 
  ownerOrganization, 
  ownerProjects, 
  ownerMaterials, 
  ownerMaterialOversight,
  Project, 
  MaterialRequest, 
  MaterialBill,
  MaterialStockOverview,
  MaterialConsumptionRecord
} from "@/lib/api/owner";
import { 
  Loader2, 
  Filter, 
  Eye, 
  Package, 
  TrendingDown, 
  Calendar, 
  AlertCircle 
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { BillImageModal } from "@/components/dashboard/BillImageModal";
import { toast } from "sonner";

// ... ProjectSelector component
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
      className="h-10 px-3 bg-background/50 border border-border rounded-lg text-sm bg-card text-foreground"
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
  const [activeTab, setActiveTab] = useState<"requests" | "bills" | "stock" | "consumption">("requests");
  
  // Data States
  const [requests, setRequests] = useState<MaterialRequest[]>([]);
  const [bills, setBills] = useState<MaterialBill[]>([]);
  const [stock, setStock] = useState<MaterialStockOverview[]>([]);
  const [consumption, setConsumption] = useState<MaterialConsumptionRecord[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [viewBill, setViewBill] = useState<MaterialBill | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const orgRes = await ownerOrganization.get();
        if (orgRes.organization) {
          const projectsRes = await ownerProjects.getAll(orgRes.organization.id);
          setProjects(projectsRes.projects || []);
        }
      } catch (err) {
        console.error("Failed to fetch initial data:", err);
        // toast.error("Failed to load projects"); // Optional: don't spam on init
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    const fetchTabContent = async () => {
      setIsLoadingData(true);
      try {
        const filters = selectedProjectId ? { project_id: selectedProjectId } : undefined;

        if (activeTab === "requests") {
          const res = await ownerMaterials.getRequests(filters);
          setRequests(res.requests || []);
        } else if (activeTab === "bills") {
          const res = await ownerMaterials.getBills(filters);
          setBills(res.bills || []);
        } else if (activeTab === "stock") {
          if (selectedProjectId) {
            const res = await ownerMaterialOversight.getProjectStock(selectedProjectId);
            setStock(res.stock || []);
          } else {
            setStock([]);
          }
        } else if (activeTab === "consumption") {
          if (selectedProjectId) {
             const res = await ownerMaterialOversight.getProjectConsumption(selectedProjectId);
             setConsumption(res.consumption || []);
          } else {
            setConsumption([]);
          }
        }
      } catch (err) {
        console.error("Failed to fetch tab data:", err);
        toast.error("Failed to load data");
      } finally {
        setIsLoadingData(false);
      }
    };
    fetchTabContent();
  }, [selectedProjectId, activeTab]);

  const requestColumns: Column<MaterialRequest>[] = useMemo(
    () => [
      { key: "title", label: "Material", sortable: true },
      { key: "category", label: "Category", width: "120px" },
      { key: "quantity", label: "Quantity", width: "100px", render: (value: number) => value },
      { key: "project_name", label: "Project", render: (value: string) => value || "-" },
      { key: "engineer_name", label: "Engineer", render: (value: string) => value || "-" },
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
      { key: "bill_number", label: "Bill #", sortable: true, width: "120px" },
      { key: "vendor_name", label: "Vendor" },
      { key: "category", label: "Category" },
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
          }).format(Number(value) || 0), // Safe number casting
      },
      { key: "project_name", label: "Project", render: (value: string) => value || "-" },
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
      
      <div className="glass-card rounded-2xl p-4 flex flex-col md:flex-row items-center gap-4">
        <div className="flex items-center gap-4 w-full md:w-auto">
          <Filter size={16} className="text-muted-foreground" />
          <ProjectSelector projects={projects} selected={selectedProjectId} onSelect={setSelectedProjectId} />
        </div>
        
        <div className="flex gap-2 ml-auto overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
          <button
            onClick={() => setActiveTab("requests")}
            className={`px-4 py-2 rounded-lg transition whitespace-nowrap ${activeTab === "requests" ? "bg-primary text-primary-foreground" : "bg-muted/50 hover:bg-muted/80"}`}
          >
            Requests
          </button>
          <button
            onClick={() => setActiveTab("bills")}
            className={`px-4 py-2 rounded-lg transition whitespace-nowrap ${activeTab === "bills" ? "bg-primary text-primary-foreground" : "bg-muted/50 hover:bg-muted/80"}`}
          >
            Bills
          </button>
          <button
            onClick={() => setActiveTab("stock")}
            className={`px-4 py-2 rounded-lg transition whitespace-nowrap ${activeTab === "stock" ? "bg-primary text-primary-foreground" : "bg-muted/50 hover:bg-muted/80"}`}
          >
            Stock
          </button>
          <button
            onClick={() => setActiveTab("consumption")}
            className={`px-4 py-2 rounded-lg transition whitespace-nowrap ${activeTab === "consumption" ? "bg-primary text-primary-foreground" : "bg-muted/50 hover:bg-muted/80"}`}
          >
            Consumption
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {isLoadingData ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {activeTab === "requests" && (
            <DataTable
              data={requests}
              columns={requestColumns}
              searchable={true}
              searchKeys={["title", "project_name", "engineer_name"]}
              emptyMessage="No material requests found"
              itemsPerPage={15}
            />
          )}

          {activeTab === "bills" && (
            <DataTable
              data={bills}
              columns={billColumns}
              searchable={true}
              searchKeys={["bill_number", "vendor_name", "category", "project_name"]}
              emptyMessage="No material bills found"
              itemsPerPage={15}
            />
          )}

          {activeTab === "stock" && (
             !selectedProjectId ? (
               <ProjectNotSelectedMessage />
             ) : (
               <StockView stock={stock} />
             )
          )}

          {activeTab === "consumption" && (
            !selectedProjectId ? (
               <ProjectNotSelectedMessage />
             ) : (
               <ConsumptionView consumption={consumption} />
             )
          )}
        </>
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

function ProjectNotSelectedMessage() {
  return (
    <div className="glass-card rounded-2xl p-12 text-center">
      <Package size={48} className="mx-auto text-muted-foreground mb-4" />
      <h3 className="text-xl font-semibold mb-2">Select a Project</h3>
      <p className="text-muted-foreground">
        Please select a specific project to view its stock and consumption history.
      </p>
    </div>
  );
}

function StockView({ stock }: { stock: MaterialStockOverview[] }) {
  if (stock.length === 0) {
    return (
      <div className="glass-card rounded-2xl p-12 text-center">
        <Package size={48} className="mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">No material stock available</p>
        <p className="text-sm text-muted-foreground mt-2">
          Stock will appear here after GRNs are approved.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {stock.map((item) => (
        <StockCard key={item.id} item={item} />
      ))}
    </div>
  );
}

function StockCard({ item }: { item: MaterialStockOverview }) {
  // FIX: Safely cast available_quantity to number to prevent .toFixed() crash if string
  const quantity = parseFloat(item.available_quantity as any) || 0;
  const isLowStock = quantity < 10;

  return (
    <div className="glass-card rounded-2xl p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="font-semibold text-lg mb-1">{item.material_name}</h3>
          {item.category && (
            <p className="text-xs text-muted-foreground">{item.category}</p>
          )}
        </div>
        <Package className="text-primary" size={20} />
      </div>

      <div
        className={`p-4 rounded-xl mb-4 ${
          isLowStock
            ? "bg-orange-500/10 border border-orange-500/20"
            : "bg-green-500/10 border border-green-500/20"
        }`}
      >
        <div className="flex items-baseline gap-2">
          <span
            className={`text-3xl font-bold font-mono ${
              isLowStock ? "text-orange-500" : "text-green-500"
            }`}
          >
            {quantity.toFixed(2)}
          </span>
          <span className="text-sm text-muted-foreground">{item.unit}</span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">Available Stock</p>
      </div>

      {isLowStock && (
        <div className="flex items-center gap-2 text-xs text-orange-500 mb-3">
          <AlertCircle size={14} />
          <span>Low Stock Warning</span>
        </div>
      )}

      <div className="text-xs text-muted-foreground">
        Last updated: {new Date(item.last_updated_at).toLocaleDateString()}
      </div>
    </div>
  );
}

function ConsumptionView({
  consumption,
}: {
  consumption: MaterialConsumptionRecord[];
}) {
  if (consumption.length === 0) {
    return (
      <div className="glass-card rounded-2xl p-12 text-center">
        <TrendingDown
          size={48}
          className="mx-auto text-muted-foreground mb-4"
        />
        <p className="text-muted-foreground">No consumption records</p>
        <p className="text-sm text-muted-foreground mt-2">
          Records will appear here when DPRs with material usage are approved.
        </p>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/30">
            <tr>
              <th className="text-left text-xs font-semibold text-muted-foreground p-4">
                Date
              </th>
              <th className="text-left text-xs font-semibold text-muted-foreground p-4">
                Material
              </th>
              <th className="text-right text-xs font-semibold text-muted-foreground p-4">
                Quantity
              </th>
              <th className="text-left text-xs font-semibold text-muted-foreground p-4">
                Engineer
              </th>
              <th className="text-left text-xs font-semibold text-muted-foreground p-4">
                DPR
              </th>
            </tr>
          </thead>
          <tbody>
            {consumption.map((record) => (
              <tr
                key={record.id}
                className="border-b border-border/50 hover:bg-muted/20"
              >
                <td className="p-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar size={14} className="text-muted-foreground" />
                    {record.report_date
                      ? new Date(record.report_date).toLocaleDateString()
                      : new Date(record.recorded_at).toLocaleDateString()}
                  </div>
                </td>
                <td className="p-4">
                  <div className="font-medium text-sm">
                    {record.material_name}
                  </div>
                </td>
                <td className="p-4">
                  <div className="text-right">
                    <span className="font-mono font-semibold text-sm">
                       {/* Fix safe casting here too just in case */}
                      {(Number(record.quantity_used) || 0).toFixed(2)}
                    </span>
                    <span className="text-xs text-muted-foreground ml-1">
                      {record.unit}
                    </span>
                  </div>
                </td>
                <td className="p-4">
                  <div className="text-sm text-muted-foreground">
                    {record.engineer_name || "-"}
                  </div>
                </td>
                <td className="p-4">
                  <div className="text-sm text-muted-foreground">
                    {record.dpr_title || "-"}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
