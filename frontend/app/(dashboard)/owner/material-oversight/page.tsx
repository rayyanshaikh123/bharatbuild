"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/AuthContext";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { ownerMaterialOversight, InvestmentSummary } from "@/lib/api/owner";
import { Button } from "@/components/ui/Button";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  AlertCircle,
  Loader2,
  Eye,
  BarChart3,
} from "lucide-react";
import { toast } from "sonner";

export default function MaterialOversightPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [summary, setSummary] = useState<InvestmentSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchInvestmentSummary();
  }, []);

  const fetchInvestmentSummary = async () => {
    try {
      setIsLoading(true);
      const res = await ownerMaterialOversight.getInvestmentSummary();
      setSummary(res);
    } catch (err) {
      console.error("Failed to fetch investment summary:", err);
      toast.error("Failed to load investment summary");
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

  if (!summary || summary.projects.length === 0) {
    return (
      <div className="min-h-screen p-6">
        <DashboardHeader
          title="Material Oversight"
          subtitle="Monitor investments and material stock across all projects"
        />
        <div className="max-w-2xl mx-auto mt-20 text-center">
          <Package size={64} className="mx-auto text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold mb-2">No Projects</h3>
          <p className="text-muted-foreground mb-6">
            Create projects to start tracking material investments
          </p>
          <Button onClick={() => router.push("/owner/projects")}>
            Go to Projects
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
      <DashboardHeader
        title="Material Investment Oversight"
        subtitle="Monitor material investments and stock across all projects"
      />

      <div className="max-w-7xl mx-auto mt-6 space-y-6">
        {/* Overall Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="glass-card rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-muted-foreground">
                Total Budget
              </h3>
              <DollarSign className="text-blue-500" size={20} />
            </div>
            <p className="text-3xl font-bold">
              {formatCurrency(summary.summary.total_budget)}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Across {summary.projects.length} project
              {summary.projects.length !== 1 ? "s" : ""}
            </p>
          </div>

          <div className="glass-card rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-muted-foreground">
                Total Invested
              </h3>
              <TrendingDown className="text-green-500" size={20} />
            </div>
            <p className="text-3xl font-bold text-green-500">
              {formatCurrency(summary.summary.total_invested)}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Material purchases approved
            </p>
          </div>

          <div className="glass-card rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-muted-foreground">
                Budget Utilized
              </h3>
              <BarChart3 className="text-orange-500" size={20} />
            </div>
            <p className="text-3xl font-bold text-orange-500">
              {summary.summary.overall_percentage}%
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Overall utilization
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-3">
          <Button
            onClick={() => router.push("/owner/material-oversight/grn-audit")}
            variant="outline"
            className="gap-2"
          >
            <Eye size={16} />
            GRN Audit Trail
          </Button>
        </div>

        {/* Projects Table */}
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-border">
            <h2 className="text-xl font-bold">Project-wise Investment</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Material investment breakdown by project
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/30">
                <tr>
                  <th className="text-left text-xs font-semibold text-muted-foreground p-4">
                    Project Name
                  </th>
                  <th className="text-left text-xs font-semibold text-muted-foreground p-4">
                    Status
                  </th>
                  <th className="text-left text-xs font-semibold text-muted-foreground p-4">
                    Manager
                  </th>
                  <th className="text-right text-xs font-semibold text-muted-foreground p-4">
                    Budget
                  </th>
                  <th className="text-right text-xs font-semibold text-muted-foreground p-4">
                    Invested
                  </th>
                  <th className="text-right text-xs font-semibold text-muted-foreground p-4">
                    Utilized %
                  </th>
                  <th className="text-center text-xs font-semibold text-muted-foreground p-4">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {summary.projects.map((project) => {
                  const utilizationPercent = project.budget_used_percentage;
                  const isHighUtilization = utilizationPercent > 80;
                  const isMediumUtilization =
                    utilizationPercent > 50 && utilizationPercent <= 80;

                  return (
                    <tr
                      key={project.id}
                      className="border-b border-border/50 hover:bg-muted/20"
                    >
                      <td className="p-4">
                        <div className="font-medium text-sm">
                          {project.project_name}
                        </div>
                      </td>
                      <td className="p-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            project.status === "ACTIVE"
                              ? "bg-green-500/10 text-green-500"
                              : project.status === "COMPLETED"
                                ? "bg-blue-500/10 text-blue-500"
                                : project.status === "PLANNED"
                                  ? "bg-yellow-500/10 text-yellow-500"
                                  : "bg-gray-500/10 text-gray-500"
                          }`}
                        >
                          {project.status}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="text-sm text-muted-foreground">
                          {project.manager_name || "-"}
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <div className="text-sm font-mono">
                          {formatCurrency(project.budget)}
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <div className="text-sm font-mono text-green-500">
                          {formatCurrency(project.current_invested)}
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div
                            className={`text-sm font-bold ${
                              isHighUtilization
                                ? "text-red-500"
                                : isMediumUtilization
                                  ? "text-orange-500"
                                  : "text-green-500"
                            }`}
                          >
                            {utilizationPercent.toFixed(1)}%
                          </div>
                          {isHighUtilization && (
                            <AlertCircle size={14} className="text-red-500" />
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              router.push(
                                `/owner/material-oversight/projects/${project.id}`,
                              )
                            }
                          >
                            <Eye size={14} className="mr-1" />
                            Details
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Budget Utilization Warning */}
        {summary.projects.some((p) => p.budget_used_percentage > 80) && (
          <div className="glass-card rounded-2xl p-6 border-l-4 border-red-500">
            <div className="flex items-start gap-3">
              <AlertCircle className="text-red-500 mt-0.5" size={20} />
              <div>
                <h3 className="font-semibold text-red-500 mb-1">
                  High Budget Utilization Alert
                </h3>
                <p className="text-sm text-muted-foreground">
                  Some projects have exceeded 80% budget utilization. Review
                  material purchases and consider budget adjustments.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
