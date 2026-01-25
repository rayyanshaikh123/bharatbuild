"use client";

import { useEffect, useState } from "react";
import { Shield, Loader2, ArrowLeft, Building2, Briefcase, Plus, X, Check, Trash2 } from "lucide-react";
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
      {activeTab === "requests" ? (
        <div className="bg-card border border-border rounded-2xl p-6">
          <h3 className="text-lg font-bold text-foreground mb-4 uppercase tracking-wide">
            Pending Approval ({pendingRequests.length})
          </h3>
          
          {pendingRequests.length === 0 ? (
            <div className="text-center py-12">
              <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No pending requests found.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingRequests.map((req) => (
                <div key={req.id} className="flex items-center gap-4 p-4 bg-muted/30 border border-border/50 rounded-xl">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                    <Shield size={20} />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-foreground">{req.name}</h4>
                    <p className="text-xs text-muted-foreground">{req.email} • {req.organization_name}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-red-500/30 text-red-600 hover:bg-red-500/10"
                      disabled={isProcessing === req.id}
                      onClick={() => handleDecision(req.id, "REJECT")}
                    >
                      <X size={16} className="mr-1" /> Reject
                    </Button>
                    <Button
                      size="sm"
                      disabled={isProcessing === req.id}
                      onClick={() => handleDecision(req.id, "APPROVE")}
                    >
                      {isProcessing === req.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Check size={16} className="mr-1" /> Approve</>}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Project Selector */}
          {projects.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-between">
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

          {/* Engineers List */}
          <div className="bg-card border border-border rounded-2xl p-6">
             <h3 className="text-lg font-bold text-foreground mb-4 uppercase tracking-wide">
               Assigned Engineers ({projectEngineers.length})
             </h3>
             
             {isLoadingProject ? (
               <div className="flex justify-center py-8">
                 <Loader2 className="h-6 w-6 animate-spin text-primary" />
               </div>
             ) : projectEngineers.length === 0 ? (
               <div className="text-center py-12">
                 <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                 <p className="text-muted-foreground">No QA Engineers assigned to this project.</p>
               </div>
             ) : (
               <div className="grid md:grid-cols-2 gap-4">
                 {projectEngineers.map((eng) => (
                   <div key={eng.id} className="p-4 border border-border rounded-xl flex items-center justify-between">
                     <div className="flex items-center gap-3">
                       <div className="w-10 h-10 bg-green-500/10 rounded-full flex items-center justify-center text-green-600">
                         <Shield size={20} />
                       </div>
                       <div>
                         <h4 className="font-bold text-foreground">{eng.name}</h4>
                         <p className="text-xs text-muted-foreground">Assigned: {new Date(eng.assigned_at).toLocaleDateString()}</p>
                       </div>
                     </div>
                     <Button
                       size="sm"
                       variant="ghost"
                       disabled={isProcessing === eng.qa_engineer_id}
                       onClick={() => handleRemoveFromProject(eng.qa_engineer_id)}
                       className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                     >
                       {isProcessing === eng.qa_engineer_id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 size={16} />}
                     </Button>
                   </div>
                 ))}
               </div>
             )}
          </div>
        </div>
      )}
    </div>
  );

  function handleDecision(id: string, action: "APPROVE" | "REJECT") {
    handleOrgDecision(id, action);
  }
}

function AssignEngineerDialog({ onAssign, isProcessing }: { onAssign: (id: string) => void, isProcessing: boolean }) {
  const [qaId, setQaId] = useState("");
  // Note: ideally we fetch list of APPROVED qa engineers in organization to populate this list
  // For simplicity, inputting ID for now as per minimal implementation, usually would be a dropdown of available engineers
  // But wait, owner can view all site engineers. Manager should ideally see list of APPROVED org engineers.
  
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
