"use client";

import { useState } from "react";
import { useAuth } from "@/components/providers/AuthContext";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { ownerReports, ReportFilters } from "@/lib/api/reports";
import { Button } from "@/components/ui/Button";
import {
  BarChart,
  TrendingUp,
  Users,
  Package,
  FileText,
  Download,
  Calendar,
  Loader2,
  DollarSign,
} from "lucide-react";

type ReportType = "financial" | "progress" | "attendance" | "materials" | "audit";

const reportTypes = [
  {
    id: "financial" as ReportType,
    name: "Financial Report",
    description: "Budget, costs, and financial overview",
    icon: TrendingUp,
    color: "text-green-400",
  },
  {
    id: "progress" as ReportType,
    name: "Project Progress",
    description: "Task completion and project status",
    icon: BarChart,
    color: "text-blue-400",
  },
  {
    id: "attendance" as ReportType,
    name: "Attendance & Workforce",
    description: "Labour attendance and workforce data",
    icon: Users,
    color: "text-purple-400",
  },
  {
    id: "materials" as ReportType,
    name: "Materials Report",
    description: "Material requests and bills",
    icon: Package,
    color: "text-amber-400",
  },
  {
    id: "audit" as ReportType,
    name: "Audit & Compliance",
    description: "Audit logs and compliance tracking",
    icon: FileText,
    color: "text-red-400",
  },
];

export default function OwnerReportsPage() {
  const { user } = useAuth();
  const [selectedReport, setSelectedReport] = useState<ReportType | null>(null);
  const [reportData, setReportData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<ReportFilters>({
    start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    end_date: new Date().toISOString().split("T")[0],
  });

  const fetchReport = async (type: ReportType, pageNum = 1) => {
    setIsLoading(true);
    try {
      let data;
      const apiFilters = { ...filters, page: pageNum, limit: 50 };
      
      switch (type) {
        case "financial":
          data = await ownerReports.getFinancial(apiFilters);
          break;
        case "progress":
          data = await ownerReports.getProgress(apiFilters);
          break;
        case "attendance":
          data = await ownerReports.getAttendance(apiFilters);
          break;
        case "materials":
          data = await ownerReports.getMaterials(apiFilters);
          break;
        case "audit":
          data = await ownerReports.getAudit(apiFilters);
          break;
      }
      setReportData(data);
    } catch (error) {
      console.error("Failed to fetch report:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1) return;
    setPage(newPage);
    if (selectedReport) {
      fetchReport(selectedReport, newPage);
    }
  };

  const downloadPDF = async () => {
    if (!selectedReport) return;
    
    setIsDownloading(true);
    try {
      switch (selectedReport) {
        case "financial":
          await ownerReports.downloadFinancialPDF(filters);
          break;
        case "progress":
          await ownerReports.downloadProgressPDF(filters);
          break;
        case "attendance":
          await ownerReports.downloadAttendancePDF(filters);
          break;
        case "materials":
          await ownerReports.downloadMaterialsPDF(filters);
          break;
        case "audit":
          await ownerReports.downloadAuditPDF(filters);
          break;
      }
    } catch (error) {
      console.error("Failed to download PDF:", error);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleReportSelect = (type: ReportType) => {
    setSelectedReport(type);
    setReportData(null);
    setPage(1);
    fetchReport(type, 1);
  };

  return (
    <div className="space-y-8 pt-12 md:pt-0 pb-12">
      <DashboardHeader userName={user?.name?.split(" ")[0]} title="Reports & Analytics" />

      {/* Date Range Filters */}
      <div className="glass-card rounded-2xl p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Date Range:</span>
          </div>
          <input
            type="date"
            value={filters.start_date}
            onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}
            className="h-10 px-3 bg-background/50 border border-border rounded-lg text-sm"
          />
          <span className="text-muted-foreground">to</span>
          <input
            type="date"
            value={filters.end_date}
            onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
            className="h-10 px-3 bg-background/50 border border-border rounded-lg text-sm"
          />
          {selectedReport && (
            <>
              <Button
                onClick={() => {
                  setPage(1);
                  fetchReport(selectedReport, 1);
                }}
                disabled={isLoading}
                size="sm"
              >
                Refresh
              </Button>
              <Button
                onClick={downloadPDF}
                disabled={isDownloading || !reportData}
                variant="outline"
                size="sm"
              >
                {isDownloading ? (
                  <>
                    <Loader2 size={16} className="mr-2 animate-spin" />
                    Downloading...
                  </>
                ) : (
                  <>
                    <Download size={16} className="mr-2" />
                    Download PDF
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Report Type Selection */}
      {!selectedReport ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reportTypes.map((report) => (
            <button
              key={report.id}
              onClick={() => handleReportSelect(report.id)}
              className="glass-card rounded-xl p-6 text-left hover:border-primary/50 transition-all cursor-pointer"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-muted/30">
                  <report.icon className={`w-6 h-6 ${report.color}`} />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg mb-1">{report.name}</h3>
                  <p className="text-sm text-muted-foreground">{report.description}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <>
          {/* Back button */}
          <div className="mb-6">
            <Button variant="outline" onClick={() => {
              setSelectedReport(null);
              setReportData(null);
            }}>
              ← Back to Reports
            </Button>
          </div>

          {/* Report Content */}
          {isLoading ? (
            <div className="glass-card rounded-2xl p-12 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-3 text-muted-foreground">Loading report...</span>
            </div>
          ) : reportData ? (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
              
              {/* Financial Report UI */}
              {selectedReport === "financial" && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="glass-card p-4 rounded-xl">
                      <p className="text-sm text-muted-foreground">Total Budget</p>
                      <p className="text-2xl font-bold">₹{reportData.summary.total_budget?.toLocaleString()}</p>
                    </div>
                    <div className="glass-card p-4 rounded-xl">
                      <p className="text-sm text-muted-foreground">Invested</p>
                      <p className="text-2xl font-bold text-blue-600">₹{reportData.summary.total_invested?.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">{reportData.summary.budget_utilization}% utilized</p>
                    </div>
                    <div className="glass-card p-4 rounded-xl">
                      <p className="text-sm text-muted-foreground">Material Costs</p>
                      <p className="text-2xl font-bold text-amber-600">₹{reportData.summary.total_material_cost?.toLocaleString()}</p>
                    </div>
                    <div className="glass-card p-4 rounded-xl">
                      <p className="text-sm text-muted-foreground">Wage Costs</p>
                      <p className="text-2xl font-bold text-purple-600">₹{reportData.summary.total_wages?.toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="glass-card rounded-xl p-6">
                    <h3 className="font-bold mb-4">Project Breakdown</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="p-3 text-left">Project</th>
                            <th className="p-3 text-right">Budget</th>
                            <th className="p-3 text-right">Invested</th>
                            <th className="p-3 text-right">Materials</th>
                            <th className="p-3 text-right">Wages</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {reportData.breakdown?.by_project?.map((p: any) => (
                            <tr key={p.id}>
                              <td className="p-3 font-medium">{p.name}</td>
                              <td className="p-3 text-right">₹{parseFloat(p.budget).toLocaleString()}</td>
                              <td className="p-3 text-right">₹{parseFloat(p.current_invested).toLocaleString()}</td>
                              <td className="p-3 text-right">₹{parseFloat(p.material_cost).toLocaleString()}</td>
                              <td className="p-3 text-right">₹{parseFloat(p.wage_cost).toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}

              {/* Progress Report UI */}
              {selectedReport === "progress" && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="glass-card p-4 rounded-xl">
                      <p className="text-sm text-muted-foreground">Total Tasks</p>
                      <p className="text-2xl font-bold">{reportData.summary.plan_items.total}</p>
                    </div>
                    <div className="glass-card p-4 rounded-xl">
                      <p className="text-sm text-muted-foreground">Completed</p>
                      <p className="text-2xl font-bold text-green-600">{reportData.summary.plan_items.completed}</p>
                      <p className="text-xs text-muted-foreground">{reportData.summary.plan_items.completion_percentage}% done</p>
                    </div>
                    <div className="glass-card p-4 rounded-xl">
                      <p className="text-sm text-muted-foreground">Delayed</p>
                      <p className="text-2xl font-bold text-red-600">{reportData.summary.plan_items.delayed}</p>
                    </div>
                    <div className="glass-card p-4 rounded-xl">
                      <p className="text-sm text-muted-foreground">In Progress</p>
                      <p className="text-2xl font-bold text-blue-600">{reportData.summary.plan_items.in_progress}</p>
                    </div>
                  </div>

                  {reportData.delayed_items?.length > 0 && (
                    <div className="glass-card rounded-xl p-6">
                      <h3 className="font-bold mb-4 text-red-600">Delayed Items</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-muted/50">
                            <tr>
                              <th className="p-3 text-left">Task</th>
                              <th className="p-3 text-left">Project</th>
                              <th className="p-3 text-left">End Date</th>
                              <th className="p-3 text-left">Delay</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {reportData.delayed_items.map((item: any) => (
                              <tr key={item.id}>
                                <td className="p-3 font-medium">{item.task_name}</td>
                                <td className="p-3 text-muted-foreground">{item.project_name}</td>
                                <td className="p-3">{new Date(item.period_end).toLocaleDateString()}</td>
                                <td className="p-3 text-red-600 font-bold">{item.delay_days} days</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Attendance Report UI */}
              {selectedReport === "attendance" && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="glass-card p-4 rounded-xl">
                      <p className="text-sm text-muted-foreground">Total Hours</p>
                      <p className="text-2xl font-bold">{Math.round(reportData.summary.total_hours)} hrs</p>
                    </div>
                    <div className="glass-card p-4 rounded-xl">
                      <p className="text-sm text-muted-foreground">Unique Workers</p>
                      <p className="text-2xl font-bold text-blue-600">{reportData.summary.unique_labours}</p>
                    </div>
                    <div className="glass-card p-4 rounded-xl">
                      <p className="text-sm text-muted-foreground">Avg Hours/Worker</p>
                      <p className="text-2xl font-bold">{Math.round(reportData.summary.avg_hours_per_labour)} hrs</p>
                    </div>
                    <div className="glass-card p-4 rounded-xl">
                      <p className="text-sm text-muted-foreground">Manual Entries</p>
                      <p className="text-2xl font-bold text-amber-600">{reportData.summary.manual_entries}</p>
                    </div>
                  </div>

                  <div className="glass-card rounded-xl p-6">
                    <h3 className="font-bold mb-4">Project Breakdown</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="p-3 text-left">Project</th>
                            <th className="p-3 text-right">Total Hours</th>
                            <th className="p-3 text-right">Workers</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {reportData.breakdown?.by_project?.map((p: any) => (
                            <tr key={p.id}>
                              <td className="p-3 font-medium">{p.name}</td>
                              <td className="p-3 text-right">{Math.round(p.total_hours)}</td>
                              <td className="p-3 text-right">{p.unique_labours}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}

              {/* Materials Report UI */}
              {selectedReport === "materials" && (
                <>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="glass-card p-6 rounded-xl">
                      <h4 className="font-bold mb-4">Requests</h4>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="bg-muted/30 p-2 rounded">
                          <p className="text-xs text-muted-foreground">Total</p>
                          <p className="text-xl font-bold">{reportData.summary.requests.total_requests}</p>
                        </div>
                        <div className="bg-green-500/10 p-2 rounded text-green-700">
                          <p className="text-xs">Approved</p>
                          <p className="text-xl font-bold">{reportData.summary.requests.approved}</p>
                        </div>
                        <div className="bg-yellow-500/10 p-2 rounded text-yellow-700">
                          <p className="text-xs">Pending</p>
                          <p className="text-xl font-bold">{reportData.summary.requests.pending}</p>
                        </div>
                      </div>
                    </div>
                    <div className="glass-card p-6 rounded-xl">
                      <h4 className="font-bold mb-4">Bills</h4>
                      <div className="grid grid-cols-2 gap-4">
                         <div>
                            <p className="text-sm text-muted-foreground">Total Amount</p>
                            <p className="text-2xl font-bold text-green-600">₹{parseFloat(reportData.summary.bills.total_approved_amount).toLocaleString()}</p>
                         </div>
                         <div className="grid grid-cols-2 gap-2 text-center">
                            <div className="bg-muted/30 p-2 rounded">
                                <p className="text-xs">Total</p>
                                <p className="font-bold">{reportData.summary.bills.total_bills}</p>
                            </div>
                            <div className="bg-red-500/10 p-2 rounded text-red-600">
                                <p className="text-xs">Orphan</p>
                                <p className="font-bold">{reportData.summary.bills.orphan_bills}</p>
                            </div>
                         </div>
                      </div>
                    </div>
                  </div>

                  <div className="glass-card rounded-xl p-6">
                    <h3 className="font-bold mb-4">Category Breakdown</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="p-3 text-left">Category</th>
                            <th className="p-3 text-right">Requests</th>
                            <th className="p-3 text-right">Quantity</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {reportData.breakdown?.by_category?.map((c: any, i: number) => (
                            <tr key={i}>
                              <td className="p-3 font-medium">{c.category}</td>
                              <td className="p-3 text-right">{c.request_count}</td>
                              <td className="p-3 text-right">{parseFloat(c.total_quantity).toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}

              {/* Audit Report UI */}
              {selectedReport === "audit" && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="glass-card p-4 rounded-xl">
                       <p className="text-sm text-muted-foreground">Total Audits</p>
                       <p className="text-2xl font-bold">{reportData.summary.total_audits}</p>
                    </div>
                    <div className="glass-card p-4 rounded-xl">
                       <p className="text-sm text-muted-foreground">Unique Users</p>
                       <p className="text-2xl font-bold">{reportData.summary.unique_users}</p>
                    </div>
                    <div className="glass-card p-4 rounded-xl">
                       <p className="text-sm text-muted-foreground">Categories</p>
                       <p className="text-2xl font-bold">{reportData.summary.unique_categories}</p>
                    </div>
                  </div>

                  <div className="glass-card rounded-xl p-6">
                    <h3 className="font-bold mb-4">Recent Audit Logs</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="p-3 text-left">Action</th>
                            <th className="p-3 text-left">Category</th>
                            <th className="p-3 text-left">Role</th>
                            <th className="p-3 text-right">Time</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {reportData.recent_audits?.map((log: any) => (
                            <tr key={log.id}>
                              <td className="p-3 font-medium">{log.action}</td>
                              <td className="p-3 text-muted-foreground">{log.category}</td>
                              <td className="p-3"><span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-bold">{log.acted_by_role}</span></td>
                              <td className="p-3 text-right text-muted-foreground">{new Date(log.created_at).toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  
                  {/* Pagination Controls */}
                  {reportData.pagination && (
                    <div className="flex items-center justify-between mt-4">
                      <p className="text-sm text-muted-foreground">
                        Showing {(reportData.pagination.page - 1) * reportData.pagination.limit + 1} to {Math.min(reportData.pagination.page * reportData.pagination.limit, reportData.pagination.total)} of {reportData.pagination.total} entries
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePageChange(page - 1)}
                          disabled={page <= 1 || isLoading}
                        >
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePageChange(page + 1)}
                          disabled={page >= reportData.pagination.total_pages || isLoading}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}

                </>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <p>No data found for the selected period.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
