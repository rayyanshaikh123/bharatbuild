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
  const [filters, setFilters] = useState<ReportFilters>({
    start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    end_date: new Date().toISOString().split("T")[0],
  });

  const fetchReport = async (type: ReportType) => {
    setIsLoading(true);
    try {
      let data;
      switch (type) {
        case "financial":
          data = await ownerReports.getFinancial(filters);
          break;
        case "progress":
          data = await ownerReports.getProgress(filters);
          break;
        case "attendance":
          data = await ownerReports.getAttendance(filters);
          break;
        case "materials":
          data = await ownerReports.getMaterials(filters);
          break;
        case "audit":
          data = await ownerReports.getAudit(filters);
          break;
      }
      setReportData(data);
    } catch (error) {
      console.error("Failed to fetch report:", error);
    } finally {
      setIsLoading(false);
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
    fetchReport(type);
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
                onClick={() => fetchReport(selectedReport)}
                disabled={isLoading}
                size="sm"
              >
                Refresh Report
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
          <div>
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
            <div className="glass-card rounded-2xl p-6">
              <h3 className="text-xl font-bold mb-4">
                {reportTypes.find((r) => r.id === selectedReport)?.name}
              </h3>
              
              {/* Summary Section */}
              {reportData.summary && (
                <div className="mb-6 p-4 bg-muted/20 rounded-lg">
                  <h4 className="font-semibold mb-2">Summary</h4>
                  <pre className="text-sm text-muted-foreground overflow-auto">
                    {JSON.stringify(reportData.summary, null, 2)}
                  </pre>
                </div>
              )}

              {/* Details Section */}
              {reportData.details && reportData.details.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Details ({reportData.details.length} items)</h4>
                  <div className="max-h-96 overflow-auto">
                    <pre className="text-xs text-muted-foreground">
                      {JSON.stringify(reportData.details, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {!reportData.summary && (!reportData.details || reportData.details.length === 0) && (
                <p className="text-center text-muted-foreground py-8">
                  No data available for the selected period
                </p>
              )}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
