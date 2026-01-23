"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/components/providers/AuthContext";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DataTable, Column } from "@/components/ui/DataTable";
import { 
  managerProjects, 
  Project,
  WageRate, 
  WageRecord,
  managerWageRates,
  managerWages,
  managerOrganization, 
} from "@/lib/api/manager";
import { 
  Loader2, 
  Coins, 
  Filter, 
  Plus, 
  Trash2, 
  Edit2, 
  Save, 
  X,
  CheckCircle,
  XCircle,
  PlayCircle
} from "lucide-react";
import { Button } from "@/components/ui/Button";

// Project selector
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
      className="h-10 px-3 bg-background/50 border border-border rounded-lg text-sm transition-all min-w-[200px]"
    >
      <option value="">Select a Project</option>
      {projects.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name}
        </option>
      ))}
    </select>
  );
}

export default function ManagerWagesPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"rates" | "processing" | "history">("rates");
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  
  // State for Rate Management
  const [wageRates, setWageRates] = useState<WageRate[]>([]);
  const [isAddingRate, setIsAddingRate] = useState(false);
  const [newRate, setNewRate] = useState({ skill_type: "UNSKILLED", category: "General", hourly_rate: 0 });
  const [editingRateId, setEditingRateId] = useState<string | null>(null);
  const [editRateValue, setEditRateValue] = useState(0);

  // State for Wage Processing
  const [unprocessedAttendance, setUnprocessedAttendance] = useState<any[]>([]);
  const [selectedAttendanceIds, setSelectedAttendanceIds] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // State for Wage History
  const [wageHistory, setWageHistory] = useState<WageRecord[]>([]);

  const [isLoading, setIsLoading] = useState(false);

  // Initial Project Load
  useEffect(() => {
    const fetchProjects = async () => {
      // Fetch approved organization
      const orgRes = await managerOrganization.getMyRequests();
      const approvedOrg = orgRes.requests.find(r => r.status === 'APPROVED');
      
      if (approvedOrg?.org_id) {
        const res = await managerProjects.getMyProjects(approvedOrg.org_id);
        setProjects(res.projects || []);
      }
    };
    
    if (user) {
        fetchProjects();
    }
  }, [user]);

  // Data Fetching based on Tab & Project
  useEffect(() => {
    if (!selectedProjectId) {
      setWageRates([]);
      setUnprocessedAttendance([]);
      setWageHistory([]);
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      try {
        if (activeTab === "rates") {
          const res = await managerWageRates.getAll(selectedProjectId);
          setWageRates(res.wage_rates || []);
        } else if (activeTab === "processing") {
          const res = await managerWages.getUnprocessedAttendance(selectedProjectId);
          setUnprocessedAttendance(res.attendance || []);
        } else if (activeTab === "history") {
          const res = await managerWages.getHistory({ project_id: selectedProjectId });
          setWageHistory(res.wages || []);
        }
      } catch (err) {
        console.error("Failed to fetch data:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [selectedProjectId, activeTab]);

  // Rate Management Handlers
  const handleAddRate = async () => {
    if (!selectedProjectId) return;
    try {
      await managerWageRates.create({ ...newRate, project_id: selectedProjectId });
      setIsAddingRate(false);
      const res = await managerWageRates.getAll(selectedProjectId);
      setWageRates(res.wage_rates || []);
      setNewRate({ skill_type: "UNSKILLED", category: "General", hourly_rate: 0 });
    } catch (err) {
      console.error("Failed to create rate:", err);
    }
  };

  const handleUpdateRate = async (id: string) => {
    try {
      await managerWageRates.update(id, editRateValue);
      setEditingRateId(null);
      const res = await managerWageRates.getAll(selectedProjectId!);
      setWageRates(res.wage_rates || []);
    } catch (err) {
      console.error("Failed to update rate:", err);
    }
  };

  const handleDeleteRate = async (id: string) => {
    if (!confirm("Are you sure? This cannot be undone.")) return;
    try {
      await managerWageRates.delete(id);
      const res = await managerWageRates.getAll(selectedProjectId!);
      setWageRates(res.wage_rates || []);
    } catch (err) {
      console.error("Failed to delete rate:", err);
    }
  };

  // Processing Handlers
  const handleGenerateWages = async () => {
    if (selectedAttendanceIds.length === 0) return;
    setIsProcessing(true);
    try {
      const wageData = selectedAttendanceIds.map(id => ({ attendance_id: id }));
      await managerWages.generate(wageData);
      
      // Refresh list
      const res = await managerWages.getUnprocessedAttendance(selectedProjectId!);
      setUnprocessedAttendance(res.attendance || []);
      setSelectedAttendanceIds([]);
      setActiveTab("history"); // Switch to history to see generated wages
    } catch (err) {
      console.error("Failed to generate wages:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleAttendanceSelection = (id: string) => {
    setSelectedAttendanceIds(prev => 
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  // History Review Handlers
  const handleReviewWage = async (id: string, status: "APPROVED" | "REJECTED") => {
    try {
      await managerWages.review(id, status);
      const res = await managerWages.getHistory({ project_id: selectedProjectId! });
      setWageHistory(res.wages || []);
    } catch (err) {
      console.error("Failed to review wage:", err);
    }
  };

  return (
    <div className="space-y-8 pt-12 md:pt-0 pb-12">
      <DashboardHeader userName={user?.name?.split(" ")[0]} title="Wage Management" />

      {/* Controls Bar */}
      <div className="glass-card rounded-2xl p-4 flex flex-wrap items-center gap-4">
        <ProjectSelector projects={projects} selected={selectedProjectId} onSelect={setSelectedProjectId} />
        
        <div className="flex bg-muted/30 p-1 rounded-lg ml-auto">
          {["rates", "processing", "history"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all capitalize ${
                activeTab === tab ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab === "rates" ? "Wage Rates" : tab === "processing" ? "Process Wages" : "History"}
            </button>
          ))}
        </div>
      </div>

      <div className="glass-card rounded-2xl p-6">
        {!selectedProjectId ? (
          <div className="text-center py-12 text-muted-foreground">
            <Coins className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>Select a project to manage wages</p>
          </div>
        ) : (
          <>
            {/* WAGE RATES TAB */}
            {activeTab === "rates" && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Project Wage Rates</h3>
                  <Button size="sm" onClick={() => setIsAddingRate(true)}>
                    <Plus size={16} className="mr-2" /> Add Rate
                  </Button>
                </div>

                {isAddingRate && (
                  <div className="p-4 bg-muted/30 rounded-lg flex items-end gap-3 animate-in fade-in slide-in-from-top-2">
                    <div>
                      <label className="text-xs font-medium mb-1 block">Skill Type</label>
                      <select 
                        className="h-9 rounded-md border bg-background px-3 text-sm"
                        value={newRate.skill_type}
                        onChange={(e) => setNewRate({...newRate, skill_type: e.target.value})}
                      >
                        <option value="UNSKILLED">Unskilled</option>
                        <option value="SEMI_SKILLED">Semi-Skilled</option>
                        <option value="SKILLED">Skilled</option>
                        <option value="HIGHLY_SKILLED">Highly Skilled</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium mb-1 block">Category</label>
                      <input 
                        className="h-9 rounded-md border bg-background px-3 text-sm"
                        value={newRate.category}
                        onChange={(e) => setNewRate({...newRate, category: e.target.value})}
                        placeholder="e.g. Mason, Helper"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium mb-1 block">Hourly Rate (₹)</label>
                      <input 
                        type="number"
                        className="h-9 rounded-md border bg-background px-3 text-sm w-32"
                        value={newRate.hourly_rate}
                        onChange={(e) => setNewRate({...newRate, hourly_rate: Number(e.target.value)})}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleAddRate}>Save</Button>
                      <Button size="sm" variant="outline" onClick={() => setIsAddingRate(false)}>Cancel</Button>
                    </div>
                  </div>
                )}

                <div className="grid gap-4">
                  {wageRates.map((rate) => (
                    <div key={rate.id} className="flex items-center justify-between p-4 bg-muted/10 rounded-lg border border-border/50">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{rate.category}</span>
                          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{rate.skill_type}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {editingRateId === rate.id ? (
                          <div className="flex items-center gap-2">
                            <input 
                              type="number" 
                              className="h-8 w-24 px-2 rounded border bg-background text-sm"
                              value={editRateValue}
                              onChange={(e) => setEditRateValue(Number(e.target.value))}
                              autoFocus
                            />
                            <button onClick={() => handleUpdateRate(rate.id)} className="text-green-500 hover:bg-green-500/10 p-1 rounded"><Save size={16}/></button>
                            <button onClick={() => setEditingRateId(null)} className="text-red-500 hover:bg-red-500/10 p-1 rounded"><X size={16}/></button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-4">
                            <span className="font-mono font-medium">₹{rate.hourly_rate}/hr</span>
                            <div className="flex gap-1">
                              <button 
                                onClick={() => { setEditingRateId(rate.id); setEditRateValue(rate.hourly_rate); }}
                                className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded transition"
                              >
                                <Edit2 size={14} />
                              </button>
                              <button 
                                onClick={() => handleDeleteRate(rate.id)}
                                className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded transition"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {wageRates.length === 0 && !isAddingRate && (
                    <div className="text-center py-8 text-muted-foreground bg-muted/5 rounded-lg border border-dashed">
                      No wage rates configured. Add one to start.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* PROCESSING TAB */}
            {activeTab === "processing" && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Unprocessed Attendance</h3>
                  <Button 
                    onClick={handleGenerateWages} 
                    disabled={selectedAttendanceIds.length === 0 || isProcessing}
                  >
                    {isProcessing ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <PlayCircle className="w-4 h-4 mr-2" />
                    )}
                    Generate Payroll ({selectedAttendanceIds.length})
                  </Button>
                </div>

                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/30">
                      <tr>
                        <th className="p-3 text-left w-10">
                          <input 
                            type="checkbox"
                            onChange={(e) => {
                              if (e.target.checked) setSelectedAttendanceIds(unprocessedAttendance.map(a => a.id));
                              else setSelectedAttendanceIds([]);
                            }}
                            checked={selectedAttendanceIds.length === unprocessedAttendance.length && unprocessedAttendance.length > 0}
                          />
                        </th>
                        <th className="p-3 text-left">Labour</th>
                        <th className="p-3 text-left">Date</th>
                        <th className="p-3 text-left">Hours</th>
                        <th className="p-3 text-left">Skill/Category</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {unprocessedAttendance.map((att) => (
                        <tr key={att.id} className="hover:bg-muted/10">
                          <td className="p-3">
                            <input 
                              type="checkbox"
                              checked={selectedAttendanceIds.includes(att.id)}
                              onChange={() => toggleAttendanceSelection(att.id)}
                            />
                          </td>
                          <td className="p-3 font-medium">{att.labour_name}</td>
                          <td className="p-3">{new Date(att.attendance_date).toLocaleDateString()}</td>
                          <td className="p-3">{att.work_hours} hrs</td>
                          <td className="p-3">
                            {att.skill_type} <span className="text-muted-foreground">-</span> {att.category || "General"}
                          </td>
                        </tr>
                      ))}
                      {unprocessedAttendance.length === 0 && (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-muted-foreground">
                            No approved attendance records pending processing.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* HISTORY TAB */}
            {activeTab === "history" && (
              <DataTable
                data={wageHistory}
                columns={[
                  { key: "labour_name", label: "Labour", sortable: true },
                  { key: "created_at", label: "Date", render: (v) => new Date(v).toLocaleDateString() },
                  { 
                    key: "total_amount", 
                    label: "Amount", 
                    sortable: true,
                    render: (v) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(v) 
                  },
                  { 
                    key: "status", 
                    label: "Status",
                    render: (v) => (
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                        v === "APPROVED" ? "bg-green-500/10 text-green-500" :
                        v === "REJECTED" ? "bg-red-500/10 text-red-500" : "bg-yellow-500/10 text-yellow-500"
                      }`}>{v}</span>
                    )
                  },
                  {
                    key: "id",
                    label: "Action",
                    render: (id, row) => row.status === "PENDING" ? (
                      <div className="flex gap-2">
                        <button onClick={() => handleReviewWage(id, "APPROVED")} className="text-green-500 hover:bg-green-500/10 p-1 rounded"><CheckCircle size={16}/></button>
                        <button onClick={() => handleReviewWage(id, "REJECTED")} className="text-red-500 hover:bg-red-500/10 p-1 rounded"><XCircle size={16}/></button>
                      </div>
                    ) : null
                  }
                ]}
                searchable
                searchKeys={["labour_name"]}
                emptyMessage="No wage history found."
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
