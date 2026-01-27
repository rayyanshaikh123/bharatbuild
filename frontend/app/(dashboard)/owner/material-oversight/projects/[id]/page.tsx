"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/AuthContext";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import {
  ownerMaterialOversight,
  MaterialStockOverview,
  GRNOverview,
  MaterialConsumptionRecord,
  ownerProjects,
  ownerOrganization,
} from "@/lib/api/owner";
import { Button } from "@/components/ui/Button";
import {
  ArrowLeft,
  Package,
  FileText,
  TrendingDown,
  Calendar,
  Loader2,
  AlertCircle,
  CheckCircle,
  Clock,
} from "lucide-react";
import { toast } from "sonner";

export default function ProjectMaterialDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [project, setProject] = useState<any>(null);
  const [stock, setStock] = useState<MaterialStockOverview[]>([]);
  const [grns, setGrns] = useState<GRNOverview[]>([]);
  const [consumption, setConsumption] = useState<MaterialConsumptionRecord[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"stock" | "grns" | "consumption">(
    "stock",
  );

  useEffect(() => {
    fetchProjectData();
  }, [projectId]);

  const fetchProjectData = async () => {
    try {
      setIsLoading(true);

      // Get organization first
      const orgRes = await ownerOrganization.get();
      if (!orgRes.organization) {
        toast.error("No organization found");
        setIsLoading(false);
        return;
      }

      const [projectRes, stockRes, grnsRes, consumptionRes] = await Promise.all(
        [
          ownerProjects.getById(projectId, orgRes.organization.id),
          ownerMaterialOversight.getProjectStock(projectId),
          ownerMaterialOversight.getProjectGRNs(projectId),
          ownerMaterialOversight.getProjectConsumption(projectId),
        ],
      );

      setProject(projectRes.project);
      setStock(stockRes.stock);
      setGrns(grnsRes.grns);
      setConsumption(consumptionRes.consumption);
    } catch (err) {
      console.error("Failed to fetch project data:", err);
      toast.error("Failed to load project details");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin h-8 w-8 text-primary" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen p-6">
        <div className="text-center mt-20">
          <AlertCircle size={64} className="mx-auto text-red-500 mb-4" />
          <h3 className="text-xl font-semibold mb-2">Project Not Found</h3>
          <Button onClick={() => router.push("/owner/material-oversight")}>
            Back to Overview
          </Button>
        </div>
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="min-h-screen p-6">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => router.push("/owner/material-oversight")}
          className="mb-4"
        >
          <ArrowLeft size={16} className="mr-2" />
          Back to Overview
        </Button>

        <DashboardHeader
          title={project.name}
          subtitle="Material stock and consumption details"
        />
      </div>

      <div className="max-w-7xl mx-auto space-y-6">
        {/* Project Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="glass-card rounded-2xl p-6">
            <div className="text-sm text-muted-foreground mb-2">Budget</div>
            <div className="text-2xl font-bold">
              {formatCurrency(project.budget)}
            </div>
          </div>

          <div className="glass-card rounded-2xl p-6">
            <div className="text-sm text-muted-foreground mb-2">Invested</div>
            <div className="text-2xl font-bold text-green-500">
              {formatCurrency(project.current_invested || 0)}
            </div>
          </div>

          <div className="glass-card rounded-2xl p-6">
            <div className="text-sm text-muted-foreground mb-2">Materials</div>
            <div className="text-2xl font-bold">{stock.length}</div>
          </div>

          <div className="glass-card rounded-2xl p-6">
            <div className="text-sm text-muted-foreground mb-2">GRNs</div>
            <div className="text-2xl font-bold">{grns.length}</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-border">
          <button
            onClick={() => setActiveTab("stock")}
            className={`px-6 py-3 font-medium transition-colors flex items-center gap-2 ${
              activeTab === "stock"
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Package size={18} />
            Material Stock
          </button>
          <button
            onClick={() => setActiveTab("grns")}
            className={`px-6 py-3 font-medium transition-colors flex items-center gap-2 ${
              activeTab === "grns"
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <FileText size={18} />
            GRNs ({grns.length})
          </button>
          <button
            onClick={() => setActiveTab("consumption")}
            className={`px-6 py-3 font-medium transition-colors flex items-center gap-2 ${
              activeTab === "consumption"
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <TrendingDown size={18} />
            Consumption
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === "stock" && <StockView stock={stock} />}
        {activeTab === "grns" && (
          <GRNsView grns={grns} formatCurrency={formatCurrency} />
        )}
        {activeTab === "consumption" && (
          <ConsumptionView consumption={consumption} />
        )}
      </div>
    </div>
  );
}

function StockView({ stock }: { stock: MaterialStockOverview[] }) {
  if (stock.length === 0) {
    return (
      <div className="glass-card rounded-2xl p-12 text-center">
        <Package size={48} className="mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">No material stock available</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {stock.map((item) => {
        const isLowStock = item.available_quantity < 10;
        return (
          <div
            key={item.id}
            className="glass-card rounded-2xl p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-1">
                  {item.material_name}
                </h3>
                {item.category && (
                  <p className="text-xs text-muted-foreground">
                    {item.category}
                  </p>
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
                <span className="text-sm text-muted-foreground">
                  {item.unit}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Available Stock
              </p>
            </div>

            {isLowStock && (
              <div className="flex items-center gap-2 text-xs text-orange-500 mb-3">
                <AlertCircle size={14} />
                <span>Low Stock Warning</span>
              </div>
            )}

            <div className="text-xs text-muted-foreground">
              Last updated:{" "}
              {new Date(item.last_updated_at).toLocaleDateString()}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function GRNsView({
  grns,
  formatCurrency,
}: {
  grns: GRNOverview[];
  formatCurrency: (n: number) => string;
}) {
  if (grns.length === 0) {
    return (
      <div className="glass-card rounded-2xl p-12 text-center">
        <FileText size={48} className="mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">No GRNs found</p>
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
                PO Number
              </th>
              <th className="text-left text-xs font-semibold text-muted-foreground p-4">
                Vendor
              </th>
              <th className="text-right text-xs font-semibold text-muted-foreground p-4">
                Amount
              </th>
              <th className="text-left text-xs font-semibold text-muted-foreground p-4">
                Status
              </th>
              <th className="text-left text-xs font-semibold text-muted-foreground p-4">
                Received By
              </th>
              <th className="text-left text-xs font-semibold text-muted-foreground p-4">
                Reviewed By
              </th>
              <th className="text-left text-xs font-semibold text-muted-foreground p-4">
                Reviewed At
              </th>
            </tr>
          </thead>
          <tbody>
            {grns.map((grn) => (
              <tr
                key={grn.id}
                className="border-b border-border/50 hover:bg-muted/20"
              >
                <td className="p-4">
                  <div className="font-mono text-sm font-medium">
                    {grn.po_number}
                  </div>
                </td>
                <td className="p-4">
                  <div className="text-sm">{grn.vendor_name}</div>
                </td>
                <td className="p-4 text-right">
                  <div className="text-sm font-mono">
                    {formatCurrency(grn.po_amount)}
                  </div>
                </td>
                <td className="p-4">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      grn.status === "APPROVED"
                        ? "bg-green-500/10 text-green-500"
                        : grn.status === "REJECTED"
                          ? "bg-red-500/10 text-red-500"
                          : "bg-yellow-500/10 text-yellow-500"
                    }`}
                  >
                    {grn.status === "APPROVED" && <CheckCircle size={12} />}
                    {grn.status === "PENDING" && <Clock size={12} />}
                    {grn.status === "REJECTED" && <AlertCircle size={12} />}
                    {grn.status}
                  </span>
                </td>
                <td className="p-4">
                  <div className="text-sm text-muted-foreground">
                    {grn.received_by_name}
                  </div>
                </td>
                <td className="p-4">
                  <div className="text-sm text-muted-foreground">
                    {grn.reviewed_by_name || "-"}
                  </div>
                </td>
                <td className="p-4">
                  <div className="text-sm text-muted-foreground">
                    {grn.reviewed_at
                      ? new Date(grn.reviewed_at).toLocaleDateString()
                      : "-"}
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
                <td className="p-4 text-right">
                  <div>
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
