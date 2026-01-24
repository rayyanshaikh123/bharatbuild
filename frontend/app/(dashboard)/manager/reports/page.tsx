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

  const fetchReport = async (type: string) => {
    setIsLoading(true);
    setSelectedReport(type);
    setReportData(null);
    
    try {
        const filters = selectedProjectId ? { project_id: selectedProjectId } : {};
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

  const downloadReport = (type: string) => {
    const filters = selectedProjectId ? { project_id: selectedProjectId } : {};
    switch (type) {
        case "financial": managerReports.downloadFinancialPDF(filters); break;
        case "progress": managerReports.downloadProgressPDF(filters); break;
        case "attendance": managerReports.downloadAttendancePDF(filters); break;
        case "materials": managerReports.downloadMaterialsPDF(filters); break;
        case "audit": managerReports.downloadAuditPDF(filters); break;
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
        <div className="animate-in fade-in slide-in-from-bottom-4">
            <div className="flex items-center justify-between mb-4">
                <Button variant="ghost" onClick={() => { setSelectedReport(null); setReportData(null); }}>
                    ← Back to Reports
                </Button>
                <h2 className="text-xl font-bold capitalize">{selectedReport} Report</h2>
            </div>
            
            <div className="glass-card rounded-xl p-6 mb-6">
                <h3 className="font-semibold mb-2">Report Summary</h3>
                <pre className="text-xs bg-muted/30 p-4 rounded-lg overflow-auto max-h-48">
                    {JSON.stringify(reportData.summary, null, 2)}
                </pre>
            </div>

            <div className="glass-card rounded-xl p-6">
                <h3 className="font-semibold mb-4">Detailed Records ({reportData.details?.length || 0})</h3>
                <div className="overflow-auto max-h-[500px]">
                    <pre className="text-xs text-muted-foreground">
                        {JSON.stringify(reportData.details, null, 2)}
                    </pre>
                </div>
            </div>
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
