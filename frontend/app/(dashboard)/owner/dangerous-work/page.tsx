"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Loader2, ArrowLeft, CheckCircle, Clock, XCircle, Search, FileText } from "lucide-react";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { ownerDangerousWork, ownerOrganization, DangerousTask, DangerousWorkStatistics } from "@/lib/api/owner";

export default function OwnerDangerousWorkPage() {
  const [activeTab, setActiveTab] = useState<"overview" | "tasks" | "compliance">("overview");
  const [stats, setStats] = useState<DangerousWorkStatistics | null>(null);
  const [tasks, setTasks] = useState<DangerousTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        // Dynamically import to avoid cycle issues if any, though standard import is fine usually
        const { ownerOrganization } = await import("@/lib/api/owner");
        const orgRes = await ownerOrganization.getAll();
        
        if (orgRes.organizations && orgRes.organizations.length > 0) {
          const orgId = orgRes.organizations[0].id;
          
          const [statsRes, tasksRes] = await Promise.all([
            ownerDangerousWork.getStatistics(orgId),
            ownerDangerousWork.getTasks(orgId)
          ]);

          setStats(statsRes);
          setTasks(tasksRes.dangerous_tasks || []);
        }
      } catch (err) {
        console.error("Failed to fetch dangerous work data:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pt-12 md:pt-0">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/owner">
          <Button variant="outline" size="sm">
            <ArrowLeft size={16} className="mr-2" /> Back
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-black tracking-tight text-foreground uppercase italic">
            Dangerous <span className="text-red-500">Work</span> Compliance
          </h1>
          <p className="text-muted-foreground mt-1">
            Monitor and audit high-risk activities across your organization
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border pb-1">
        <TabButton active={activeTab === "overview"} onClick={() => setActiveTab("overview")}>
          Overview
        </TabButton>
        <TabButton active={activeTab === "tasks"} onClick={() => setActiveTab("tasks")}>
          Active Tasks
        </TabButton>
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && stats && (
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard 
              label="Active Tasks" 
              value={stats.organization_statistics.active_tasks}
              icon={<AlertTriangle size={20} className="text-orange-500" />}
              subtext="Currently ongoing"
            />
            <StatCard 
              label="Pending Requests" 
              value={stats.organization_statistics.pending_requests}
              icon={<Clock size={20} className="text-blue-500" />}
              subtext="Awaiting approval"
            />
            <StatCard 
              label="Approval Rate" 
              value={`${stats.organization_statistics.approval_rate_percentage}%`}
              icon={<CheckCircle size={20} className="text-green-500" />}
              subtext="Of total requests"
            />
            <StatCard 
              label="Avg Approval Time" 
              value={`${stats.organization_statistics.avg_approval_time_minutes}m`}
              icon={<Clock size={20} className="text-purple-500" />}
              subtext="Response time"
            />
          </div>

          {/* Project Breakdown */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-card border border-border rounded-xl p-6">
              <h3 className="font-bold text-lg mb-4">Project Compliance</h3>
              <div className="space-y-4">
                {stats.project_breakdown.map((proj) => (
                  <div key={proj.id} className="flex justify-between items-center p-3 bg-muted/20 rounded-lg">
                     <div>
                       <div className="font-semibold">{proj.name}</div>
                       <div className="text-xs text-muted-foreground flex gap-2">
                         <span>Tasks: {proj.dangerous_tasks}</span>
                         <span>Requests: {proj.total_requests}</span>
                       </div>
                     </div>
                     <div className="text-right">
                       <span className={`text-sm font-bold ${
                         proj.pending_requests > 0 ? "text-orange-500" : "text-green-500"
                       }`}>
                         {proj.pending_requests} Pending
                       </span>
                     </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-6">
              <h3 className="font-bold text-lg mb-4">Top Dangerous Tasks</h3>
              <div className="space-y-4">
               {stats.top_dangerous_tasks.map((task) => (
                 <div key={task.id} className="flex justify-between items-center p-3 bg-muted/20 rounded-lg border-l-4 border-red-500">
                   <div>
                     <div className="font-semibold">{task.name}</div>
                     <div className="text-xs text-muted-foreground">{task.project_name}</div>
                   </div>
                   <div className="text-right">
                     <div className="text-sm font-bold">{task.request_count} Requests</div>
                     <div className="text-xs text-green-600">{task.approved_count} Approved</div>
                   </div>
                 </div>
               ))}
               {stats.top_dangerous_tasks.length === 0 && (
                 <p className="text-muted-foreground text-sm">No recorded dangerous tasks yet.</p>
               )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tasks Tab */}
      {activeTab === "tasks" && (
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tasks.map((task) => (
              <div key={task.id} className="p-4 border border-border rounded-xl hover:border-primary/50 transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-bold max-w-[70%]">{task.name}</h4>
                  <span className={`px-2 py-0.5 text-[10px] rounded-full font-bold uppercase ${
                    task.is_active ? "bg-green-500/10 text-green-600" : "bg-slate-500/10 text-slate-500"
                  }`}>
                    {task.is_active ? "Active" : "Inactive"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mb-4 line-clamp-2">
                  {task.description || "No description provided."}
                </p>
                <div className="pt-4 border-t border-border/50 flex justify-between text-xs">
                   <div>
                     <span className="block text-muted-foreground">Requests</span>
                     <span className="font-bold">{task.total_requests}</span>
                   </div>
                   <div>
                     <span className="block text-muted-foreground">Approved</span>
                     <span className="font-bold text-green-600">{task.approved_requests}</span>
                   </div>
                   <div>
                     <span className="block text-muted-foreground">Pending</span>
                     <span className="font-bold text-orange-600">{task.pending_requests}</span>
                   </div>
                </div>
              </div>
            ))}
            {tasks.length === 0 && (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                <AlertTriangle className="h-12 w-12 mx-auto mb-2 opacity-20" />
                <p>No dangerous tasks defined.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon, subtext }: { label: string, value: string | number, icon: any, subtext: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex justify-between items-start mb-2">
        <span className="text-muted-foreground text-xs font-semibold uppercase">{label}</span>
        {icon}
      </div>
      <div className="text-2xl font-black text-foreground">{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{subtext}</div>
    </div>
  );
}

function TabButton({ children, active, onClick }: { children: React.ReactNode, active: boolean, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
        active 
          ? "border-b-2 border-primary text-primary" 
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}
