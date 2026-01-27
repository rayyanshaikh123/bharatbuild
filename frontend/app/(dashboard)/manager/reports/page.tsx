"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/providers/AuthContext";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { managerProjects, managerOrganization, Project } from "@/lib/api/manager";
import { managerReports } from "@/lib/api/reports";
import { 
  Loader2, 
  FileText, 
  Download, 
  TrendingUp, 
  DollarSign, 
  Users, 
  Package, 
  Calendar 
} from "lucide-react";
import { Button } from "@/components/ui/Button";

// Report Type Card
function ReportTypeCard({ 
  title, 
  description, 
  icon: Icon, 
  onClickView, 
  onClickDownload,
  isLoading 
}: { 
  title: string;
  description: string;
  icon: any;
  onClickView: () => void;
  onClickDownload: () => void;
  isLoading?: boolean;
}) {
  return (
    <div className="glass-card rounded-xl p-5 hover:border-primary/50 transition-all">
      <div className="flex items-start justify-between mb-4">
        <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
          <Icon size={24} />
        </div>
        <Button variant="ghost" size="sm" onClick={onClickDownload} disabled={isLoading}>
          <Download size={16} />
        </Button>
      </div>
      <h3 className="font-semibold text-lg mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground mb-4">{description}</p>
      <Button className="w-full" onClick={onClickView} disabled={isLoading}>
        View Report
      </Button>
    </div>
  );
}

// Project Selector
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
      className="h-10 px-3 bg-background/50 border border-border rounded-lg text-sm transition-all w-full md:w-64"
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

export default function ManagerReportsPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [reportData, setReportData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        // Use getMyRequests pattern to get org_id
        const reqsRes = await managerOrganization.getMyRequests();
        const approved = reqsRes.requests?.find(r => r.status === "APPROVED");
        
        if (approved && approved.org_id) {
          const res = await managerProjects.getMyProjects(approved.org_id);
          setProjects(res.projects || []);
        }
      } catch (err) {
        console.error("Failed to fetch projects", err);
      } finally {
        setIsInitialLoading(false);
      }
    };
    fetchProjects();
  }, []);

  const fetchReport = async (type: string, pageNum = 1) => {
    setIsLoading(true);
    setSelectedReport(type);
    setReportData(null);
    if (pageNum === 1) setPage(1);
    
    try {
        const filters = {
            ...(selectedProjectId ? { project_id: selectedProjectId } : {}),
            page: pageNum,
            limit: 50
        };
        let res;

        switch (type) {
            case "financial": res = await managerReports.getFinancial(filters); break;
            case "progress": res = await managerReports.getProgress(filters); break;
            case "attendance": res = await managerReports.getAttendance(filters); break;
            case "materials": res = await managerReports.getMaterials(filters); break;
            case "audit": res = await managerReports.getAudit(filters); break;
        }
        setReportData(res);
    } catch (err) {
        console.error("Failed to fetch report", err);
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

  const downloadReport = async (type: string) => {
    const filters = selectedProjectId ? { project_id: selectedProjectId } : {};
    try {
      switch (type) {
          case "financial": await managerReports.downloadFinancialPDF(filters); break;
          case "progress": await managerReports.downloadProgressPDF(filters); break;
          case "attendance": await managerReports.downloadAttendancePDF(filters); break;
          case "materials": await managerReports.downloadMaterialsPDF(filters); break;
          case "audit": await managerReports.downloadAuditPDF(filters); break;
      }
    } catch (err) {
       console.error("Download failed", err);
    }
  };

  return (
    <div className="space-y-8 pt-12 md:pt-0 pb-12">
      <DashboardHeader userName={user?.name?.split(" ")[0]} title="Reports Center" />

      {/* Controls */}
      <div className="glass-card rounded-2xl p-4 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2 text-muted-foreground mr-auto">
          <FileText size={16} />
          <span className="text-sm">Filter Reports:</span>
        </div>
        <ProjectSelector projects={projects} selected={selectedProjectId} onSelect={setSelectedProjectId} />
      </div>

      {selectedReport && reportData ? (
        <div className="animate-in fade-in slide-in-from-bottom-4 space-y-6">
            <div className="flex items-center justify-between mb-4">
                <Button variant="ghost" onClick={() => { setSelectedReport(null); setReportData(null); }}>
                    ← Back to Reports
                </Button>
                <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold capitalize">{selectedReport} Report</h2>
                    <Button variant="outline" size="sm" onClick={() => downloadReport(selectedReport)}>
                        <Download size={16} className="mr-2" /> PDF
                    </Button>
                </div>
            </div>
            
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <ReportTypeCard 
                title="Financial Report" 
                description="Budget utilization, expenses, and cost analysis."
                icon={DollarSign}
                onClickView={() => fetchReport("financial")}
                onClickDownload={() => downloadReport("financial")}
                isLoading={isLoading}
            />
            <ReportTypeCard 
                title="Progress Report" 
                description="Task completion, delays, and schedule tracking."
                icon={TrendingUp}
                onClickView={() => fetchReport("progress")}
                onClickDownload={() => downloadReport("progress")}
                isLoading={isLoading}
            />
            <ReportTypeCard 
                title="Workforce Report" 
                description="Attendance, wages, and labour utilization."
                icon={Users}
                onClickView={() => fetchReport("attendance")}
                onClickDownload={() => downloadReport("attendance")}
                isLoading={isLoading}
            />
            <ReportTypeCard 
                title="Materials Report" 
                description="Material requests, consumption, and inventory."
                icon={Package}
                onClickView={() => fetchReport("materials")}
                onClickDownload={() => downloadReport("materials")}
                isLoading={isLoading}
            />
            <ReportTypeCard 
                title="Audit Log" 
                description="System activities and compliance records."
                icon={FileText}
                onClickView={() => fetchReport("audit")}
                onClickDownload={() => downloadReport("audit")}
                isLoading={isLoading}
            />
        </div>
      )}

      {isLoading && (
        <div className="fixed inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center z-50">
            <Loader2 className="w-12 h-12 animate-spin text-primary" />
        </div>
      )}
    </div>
  );
}
