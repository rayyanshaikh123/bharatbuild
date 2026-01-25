"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/AuthContext";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import {
  managerMaterialStock,
  MaterialStock,
  MaterialConsumption,
  managerOrganization,
  managerProjects,
} from "@/lib/api/manager";
import { Button } from "@/components/ui/Button";
import {
  Package,
  TrendingDown,
  TrendingUp,
  Calendar,
  Loader2,
  AlertCircle,
  Search,
  Filter,
} from "lucide-react";
import { toast } from "sonner";

export default function MaterialStockPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [stock, setStock] = useState<MaterialStock[]>([]);
  const [consumption, setConsumption] = useState<MaterialConsumption[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [isLoadingStock, setIsLoadingStock] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"stock" | "consumption">("stock");

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setIsLoadingProjects(true);

        // Get approved organization
        const orgsRes = await managerOrganization.getMyOrganizations();
        const approvedOrg = orgsRes.organizations.find(
          (org: any) => org.status === "APPROVED",
        );

        if (!approvedOrg) {
          setIsLoadingProjects(false);
          return;
        }

        const res = await managerProjects.getMyProjects(approvedOrg.org_id);
        const activeProjects = res.projects.filter(
          (p: any) =>
            p.my_status === "ACTIVE" &&
            (p.status === "ACTIVE" || p.status === "PLANNED"),
        );
        setProjects(activeProjects);

        if (activeProjects.length > 0) {
          setSelectedProject(activeProjects[0].id);
        }
      } catch (err) {
        console.error("Failed to fetch projects:", err);
        toast.error("Failed to load projects");
      } finally {
        setIsLoadingProjects(false);
      }
    };

    fetchProjects();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      fetchMaterialData();
    }
  }, [selectedProject]);

  const fetchMaterialData = async () => {
    if (!selectedProject) return;

    try {
      setIsLoadingStock(true);
      const [stockRes, consumptionRes] = await Promise.all([
        managerMaterialStock.getProjectStock(selectedProject),
        managerMaterialStock.getConsumptionHistory(selectedProject),
      ]);

      setStock(stockRes.stock);
      setConsumption(consumptionRes.consumption);
    } catch (err) {
      console.error("Failed to fetch material data:", err);
      toast.error("Failed to load material data");
    } finally {
      setIsLoadingStock(false);
    }
  };

  const filteredStock = stock.filter(
    (item) =>
      item.material_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const filteredConsumption = consumption.filter(
    (item) =>
      item.material_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.engineer_name?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  if (isLoadingProjects) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin h-8 w-8 text-primary" />
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="min-h-screen p-6">
        <DashboardHeader
          title="Material Stock"
          subtitle="View material inventory and consumption"
        />
        <div className="max-w-2xl mx-auto mt-20 text-center">
          <Package size={64} className="mx-auto text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold mb-2">No Active Projects</h3>
          <p className="text-muted-foreground mb-6">
            You need to have active projects to view material stock
          </p>
          <Button onClick={() => router.push("/manager/projects")}>
            Go to Projects
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <DashboardHeader
        title="Material Stock Management"
        subtitle="Track material inventory and consumption across projects"
      />

      <div className="max-w-7xl mx-auto mt-6 space-y-6">
        {/* Project Selector */}
        <div className="glass-card rounded-2xl p-6">
          <label className="block text-sm font-medium mb-2">
            Select Project
          </label>
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="w-full md:w-96 p-3 rounded-xl bg-background border border-border text-sm focus:ring-2 focus:ring-primary/30 outline-none"
          >
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-border">
          <button
            onClick={() => setActiveTab("stock")}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === "stock"
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Current Stock
          </button>
          <button
            onClick={() => setActiveTab("consumption")}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === "consumption"
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Consumption History
          </button>
        </div>

        {/* Search */}
        <div className="glass-card rounded-2xl p-4">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              size={18}
            />
            <input
              type="text"
              placeholder={`Search ${activeTab === "stock" ? "materials" : "consumption records"}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-background border border-border text-sm focus:ring-2 focus:ring-primary/30 outline-none"
            />
          </div>
        </div>

        {isLoadingStock ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="animate-spin h-8 w-8 text-primary" />
          </div>
        ) : activeTab === "stock" ? (
          <StockView stock={filteredStock} />
        ) : (
          <ConsumptionView consumption={filteredConsumption} />
        )}
      </div>
    </div>
  );
}

function StockView({ stock }: { stock: MaterialStock[] }) {
  if (stock.length === 0) {
    return (
      <div className="glass-card rounded-2xl p-12 text-center">
        <Package size={48} className="mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">No material stock available</p>
        <p className="text-sm text-muted-foreground mt-2">
          Stock will appear here after GRNs are approved
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

function StockCard({ item }: { item: MaterialStock }) {
  const isLowStock = item.available_quantity < 10;

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
            {item.available_quantity.toFixed(2)}
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
  consumption: MaterialConsumption[];
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
          Records will appear here when DPRs with material usage are approved
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
                      {record.quantity_used.toFixed(2)}
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
