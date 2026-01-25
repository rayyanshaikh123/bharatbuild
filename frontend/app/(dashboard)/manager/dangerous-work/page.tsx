"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Loader2, ArrowLeft, CheckCircle, Clock, Info } from "lucide-react";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { managerDangerousWork, managerProjects, DangerousTask, DangerousWorkStatistics, Project } from "@/lib/api/manager";
import { managerOrganization } from "@/lib/api/manager";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ManagerDangerousWorkPage() {
  const [activeTab, setActiveTab] = useState<"overview" | "tasks">("overview");
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>("");
  
  const [stats, setStats] = useState<DangerousWorkStatistics | null>(null);
  const [tasks, setTasks] = useState<DangerousTask[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [loadingData, setLoadingData] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      fetchProjectData(selectedProject);
    }
  }, [selectedProject]);

  const fetchInitialData = async () => {
    try {
      setIsLoading(true);
      const orgRes = await managerOrganization.getMyOrganizations();
      if (orgRes.organizations && orgRes.organizations.length > 0) {
        const orgId = orgRes.organizations[0].id;
        const res = await managerProjects.getMyProjects(orgId);
        setProjects(res.projects || []);
        if (res.projects && res.projects.length > 0) {
          setSelectedProject(res.projects[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to fetch initial data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProjectData = async (projectId: string) => {
    try {
      setLoadingData(true);
      const [statsRes, tasksRes] = await Promise.all([
        managerDangerousWork.getStatistics(projectId),
        managerDangerousWork.getTasks(projectId)
      ]);
      setStats(statsRes);
      setTasks(tasksRes.dangerous_tasks || []);
    } catch (err) {
      console.error("Failed to fetch project data:", err);
    } finally {
      setLoadingData(false);
    }
  };

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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/manager">
            <Button variant="outline" size="sm">
              <ArrowLeft size={16} className="mr-2" /> Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-foreground uppercase italic">
              Dangerous <span className="text-red-500">Work</span>
            </h1>
            <p className="text-muted-foreground mt-1">
              Compliance and safety oversight
            </p>
          </div>
        </div>

        {/* Project Selector */}
        {projects.length > 0 && (
          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger className="w-[200px] md:w-[300px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-12">
           <Info className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
           <p>No projects assigned.</p>
        </div>
      ) : (
        <>
          {/* Tabs */}
          <div className="flex gap-2 border-b border-border pb-1">
            <TabButton active={activeTab === "overview"} onClick={() => setActiveTab("overview")}>
              Statistics Overview
            </TabButton>
            <TabButton active={activeTab === "tasks"} onClick={() => setActiveTab("tasks")}>
              Task Definitions
            </TabButton>
          </div>

          {loadingData ? (
             <div className="py-12 flex justify-center">
               <Loader2 className="h-8 w-8 animate-spin text-primary" />
             </div>
          ) : (
            <>
              {activeTab === "overview" && stats && (
                <div className="space-y-6">
                  {/* Key Metrics */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard 
                      label="Active Tasks" 
                      value={stats.statistics.active_tasks}
                      icon={<AlertTriangle size={20} className="text-orange-500" />}
                      subtext="Currently ongoing"
                    />
                    <StatCard 
                      label="Pending Requests" 
                      value={stats.statistics.pending_requests}
                      icon={<Clock size={20} className="text-blue-500" />}
                      subtext="Awaiting approval"
                    />
                    <StatCard 
                      label="Approved" 
                      value={stats.statistics.approved_requests}
                      icon={<CheckCircle size={20} className="text-green-500" />}
                      subtext="Total approved"
                    />
                     <StatCard 
                      label="Avg Response" 
                      value={`${stats.statistics.avg_approval_time_minutes || 0}m`}
                      icon={<Clock size={20} className="text-purple-500" />}
                      subtext="Approval time"
                    />
                  </div>

                  {/* Labour Compliance */}
                  <div className="bg-card border border-border rounded-xl p-6">
                    <h3 className="font-bold text-lg mb-4">Labour Compliance Top Risks</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="text-xs text-muted-foreground uppercase border-b">
                          <tr>
                            <th className="py-2 text-left">Labour Name</th>
                            <th className="py-2 text-left">Skill</th>
                            <th className="py-2 text-center">Requests</th>
                            <th className="py-2 text-center">Approved</th>
                            <th className="py-2 text-center">Expired</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stats.labour_compliance.map((row) => (
                            <tr key={row.id} className="border-b last:border-0 hover:bg-muted/50">
                              <td className="py-3 font-medium">{row.name}</td>
                              <td className="py-3 text-muted-foreground">{row.skill_type}</td>
                              <td className="py-3 text-center">{row.total_requests}</td>
                              <td className="py-3 text-center text-green-600 font-bold">{row.approved_requests}</td>
                              <td className="py-3 text-center text-red-500">{row.expired_requests}</td>
                            </tr>
                          ))}
                          {stats.labour_compliance.length === 0 && (
                            <tr>
                              <td colSpan={5} className="py-4 text-center text-muted-foreground italic">No data available</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "tasks" && (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {tasks.map((task) => (
                    <div key={task.id} className="p-4 bg-card border border-border rounded-xl">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-bold max-w-[80%]">{task.name}</h4>
                        <span className={`px-2 py-0.5 text-[10px] rounded-full font-bold uppercase ${
                          task.is_active ? "bg-green-500/10 text-green-600" : "bg-slate-500/10 text-slate-500"
                        }`}>
                          {task.is_active ? "Active" : "Inactive"}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mb-4 line-clamp-2">
                         {task.description}
                      </p>
                      <div className="pt-3 border-t text-xs flex justify-between text-muted-foreground">
                        <span>Created by: {task.created_by_name}</span>
                        <span>Total Requests: {task.total_requests}</span>
                      </div>
                    </div>
                  ))}
                  {tasks.length === 0 && (
                     <div className="col-span-full py-12 text-center text-muted-foreground">
                       <p>No dangerous tasks defined for this project.</p>
                     </div>
                  )}
                </div>
              )}
            </>
          )}
        </>
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
