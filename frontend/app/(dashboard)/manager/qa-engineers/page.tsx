"use client";

import { useEffect, useState, useMemo } from "react";
import { Shield, Loader2, ArrowLeft, Briefcase, Plus, X, Check, Trash2, Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import {
  managerQAEngineerRequests,
  managerOrganization,
  managerProjects,
  QAEngineerRequest,
  ProjectQAEngineer,
  Project
} from "@/lib/api/manager";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable, Column } from "@/components/ui/DataTable";

export default function ManagerQAEngineersPage() {
  const [activeTab, setActiveTab] = useState<"requests" | "assignments">("requests");
  const [pendingRequests, setPendingRequests] = useState<QAEngineerRequest[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [projectEngineers, setProjectEngineers] = useState<ProjectQAEngineer[]>([]);
  
  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [isLoadingProject, setIsLoadingProject] = useState(false);

  // Stats
  const [approvedQAs, setApprovedQAs] = useState<QAEngineerRequest[]>([]); // For assignment dropdown

  const pendingColumns: Column<QAEngineerRequest>[] = useMemo(
    () => [
      {
        key: "name",
        label: "Engineer Name",
        sortable: true,
        render: (value: string) => <span className="font-semibold">{value}</span>,
      },
      {
        key: "email",
        label: "Contact",
        render: (_: any, row: QAEngineerRequest) => (
            <div className="flex flex-col text-sm text-muted-foreground">
                <span className="flex items-center gap-1"><Mail size={12}/> {row.email}</span>
                {row.phone && <span className="flex items-center gap-1"><Phone size={12}/> {row.phone}</span>}
            </div>
        )
      },
      {
        key: "organization_name",
        label: "Organization",
        render: (value: string) => <span className="text-sm">{value}</span>
      },
      {
          key: "id",
          label: "Actions",
          width: "180px",
          render: (id: string) => (
            <div className="flex gap-2">
                <Button
                    size="sm"
                    variant="outline"
                    className="border-red-500/30 text-red-600 hover:bg-red-500/10 h-8"
                    disabled={isProcessing === id}
                    onClick={() => handleDecision(id, "REJECT")}
                >
                    <X size={14} className="mr-1" /> Reject
                </Button>
                <Button
                    size="sm"
                    className="h-8"
                    disabled={isProcessing === id}
                    onClick={() => handleDecision(id, "APPROVE")}
                >
                    {isProcessing === id ? <Loader2 className="h-3 w-3 animate-spin" /> : <><Check size={14} className="mr-1" /> Approve</>}
                </Button>
            </div>
          )
      }
    ],
    [isProcessing]
  );

  const assignedColumns: Column<ProjectQAEngineer>[] = useMemo(
      () => [
        {
          key: "name",
          label: "Engineer",
          sortable: true,
          render: (value: string) => (
             <div className="flex items-center gap-2">
                 <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                     <Shield size={14} />
                 </div>
                 <span className="font-medium">{value}</span>
             </div>
          )
        },
        {
          key: "assigned_at",
          label: "Assigned Date",
          sortable: true,
          render: (value: string) => <span className="text-sm">{new Date(value).toLocaleDateString()}</span>
        },
        {
            key: "qa_engineer_id",
            label: "Actions",
            width: "100px",
            render: (id: string, row: ProjectQAEngineer) => (
                <Button
                    size="sm"
                    variant="ghost"
                    disabled={isProcessing === id}
                    onClick={() => handleRemoveFromProject(id)}
                    className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                >
                    {isProcessing === id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 size={16} />}
                </Button>
            )
        }
      ],
      [isProcessing]
  );

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedProject && activeTab === "assignments") {
      fetchProjectEngineers(selectedProject);
    }
  }, [selectedProject, activeTab]);

  const fetchInitialData = async () => {
    try {
      setIsLoading(true);
      // 1. Get Organization
      const orgRes = await managerOrganization.getMyOrganizations();
      if (orgRes.organizations && orgRes.organizations.length > 0) {
        const orgId = orgRes.organizations[0].org_id;

        // 2. Get Pending Requests
        const requestsRes = await managerQAEngineerRequests.getOrgPending();
        setPendingRequests(requestsRes.pending_engineers || []);

        // 3. Get Projects (for assignments tab)
        const projectsRes = await managerProjects.getMyProjects(orgId);
        setProjects(projectsRes.projects || []);
        if (projectsRes.projects.length > 0) {
          setSelectedProject(projectsRes.projects[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to fetch data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProjectEngineers = async (projectId: string) => {
    try {
      setIsLoadingProject(true);
      const res = await managerQAEngineerRequests.getProjectEngineers(projectId);
      setProjectEngineers(res.qa_engineers || []);
    } catch (err) {
      console.error("Failed to fetch project engineers:", err);
    } finally {
      setIsLoadingProject(false);
    }
  };

  const handleOrgDecision = async (requestId: string, action: "APPROVE" | "REJECT") => {
    try {
      setIsProcessing(requestId);
      await managerQAEngineerRequests.updateOrgStatus(requestId, action);
      // Refresh list
      const res = await managerQAEngineerRequests.getOrgPending();
      setPendingRequests(res.pending_engineers || []);
    } catch (err) {
      console.error("Failed to update status:", err);
    } finally {
      setIsProcessing(null);
    }
  };

  const handleAssignToProject = async (qaEngineerId: string) => {
    if (!selectedProject) return;
    try {
      setIsProcessing("assign");
      await managerQAEngineerRequests.assignToProject(selectedProject, qaEngineerId);
      fetchProjectEngineers(selectedProject);
    } catch (err) {
      console.error("Failed to assign engineer:", err);
    } finally {
      setIsProcessing(null);
    }
  };

  const handleRemoveFromProject = async (qaEngineerId: string) => {
    if (!selectedProject) return;
    try {
      setIsProcessing(qaEngineerId);
      await managerQAEngineerRequests.removeFromProject(selectedProject, qaEngineerId);
      fetchProjectEngineers(selectedProject);
    } catch (err) {
      console.error("Failed to remove engineer:", err);
    } finally {
      setIsProcessing(null);
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
      <div className="flex items-center gap-4">
        <Link href="/manager">
          <Button variant="outline" size="sm">
            <ArrowLeft size={16} className="mr-2" /> Back
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-black tracking-tight text-foreground uppercase italic">
            QA <span className="text-primary">Engineers</span>
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage organization requests and project assignments
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border pb-1">
        <button
          onClick={() => setActiveTab("requests")}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
            activeTab === "requests"
              ? "border-b-2 border-primary text-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Organization Requests
          {pendingRequests.length > 0 && (
            <span className="ml-2 px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full">
              {pendingRequests.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("assignments")}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
            activeTab === "assignments"
              ? "border-b-2 border-primary text-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Project Assignments
        </button>
      </div>

      {/* Content */}
      <div className="bg-card border border-border rounded-2xl p-6">
        {activeTab === "requests" ? (
           <>
              <h3 className="text-lg font-bold text-foreground mb-4 uppercase tracking-wide">
                Pending Approval ({pendingRequests.length})
              </h3>
              <DataTable
                 data={pendingRequests}
                 columns={pendingColumns}
                 searchable
                 searchKeys={["name", "email", "organization_name"]}
                 emptyMessage="No pending requests found."
              />
           </>
        ) : (
           <div className="space-y-6">
            {/* Project Selector */}
            {projects.length > 0 && (
                <div className="bg-muted/30 border border-border rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Briefcase className="text-muted-foreground" size={20} />
                    <span className="font-semibold text-foreground">Select Project:</span>
                    <Select value={selectedProject} onValueChange={setSelectedProject}>
                    <SelectTrigger className="w-[200px]">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {projects.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                    </SelectContent>
                    </Select>
                </div>
                
                <AssignEngineerDialog 
                    onAssign={handleAssignToProject} 
                    isProcessing={isProcessing === "assign"}
                />
                </div>
            )}

            <div>
                <h3 className="text-lg font-bold text-foreground mb-4 uppercase tracking-wide">
                Assigned Engineers ({projectEngineers.length})
                </h3>
                {isLoadingProject ? (
                    <div className="flex justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                ) : (
                    <DataTable
                        data={projectEngineers}
                        columns={assignedColumns}
                        searchable
                        searchKeys={["name", "email"]}
                        emptyMessage="No QA Engineers assigned to this project."
                    />
                )}
            </div>
           </div>
        )}
      </div>
    </div>
  );

  function handleDecision(id: string, action: "APPROVE" | "REJECT") {
    handleOrgDecision(id, action);
  }

  // Define handleOrgDecision if it wasn't captured in previous context or ensure it is accessible. 
  // It was defined in the component scope in previous versions. 
  // We need to make sure we didn't remove it or scope it out.
  // Ideally, handleDecision calls the handleOrgDecision defined in the component.
}

// Dialog Component
function AssignEngineerDialog({ onAssign, isProcessing }: { onAssign: (id: string) => void, isProcessing: boolean }) {
  const [qaId, setQaId] = useState("");
  
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>
          <Plus size={16} className="mr-2" /> Assign Engineer
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign QA Engineer</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label>QA Engineer ID</Label>
            <input 
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Enter QA Engineer ID"
              value={qaId} 
              onChange={(e) => setQaId(e.target.value)} 
            />
            <p className="text-xs text-muted-foreground">Enter the ID of an approved QA Engineer from your organization.</p>
          </div>
          <Button 
            className="w-full" 
            disabled={!qaId || isProcessing}
            onClick={() => onAssign(qaId)}
          >
            {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Assign to Project
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
