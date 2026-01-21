"use client";

import { useEffect, useState } from "react";
import { Check, X, Loader2, User } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";
import { ProjectManager } from "@/lib/api/owner";

interface ProjectManagerApprovalListProps {
  organizationId: string;
  projectId: string;
}

export function ProjectManagerApprovalList({ organizationId, projectId }: ProjectManagerApprovalListProps) {
  const [requests, setRequests] = useState<ProjectManager[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        setIsLoading(true);
        // Fetch pending managers for this project
        const res = await api.get<{ managers: ProjectManager[] }>(
          `/owner/project/project-managers/pending?projectId=${projectId}&organizationId=${organizationId}`
        );
        setRequests(res.managers || []);
      } catch (err) {
        console.error("Failed to fetch pending managers:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRequests();
  }, [projectId, organizationId]);

  const handleDecision = async (managerId: string, decision: "ACTIVE" | "REJECTED") => {
    setProcessingId(managerId);
    try {
      // NOTE: Endpoint mocked as it's missing in backend v1
      await api.patch(`/owner/project/project-managers/${managerId}/status`, {
        projectId,
        organizationId,
        status: decision
      });
      
      setRequests(prev => prev.filter(r => r.manager_id !== managerId));
    } catch (err) {
      console.error(`Failed to ${decision} manager:`, err);
      alert(`Failed to ${decision.toLowerCase()} request. Backend endpoint may be missing.`);
    } finally {
      setProcessingId(null);
    }
  };

  if (isLoading) return <div className="py-4"><Loader2 className="animate-spin mx-auto text-primary" /></div>;

  if (requests.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground text-sm border border-dashed border-border rounded-xl">
        No pending manager requests for this project.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {requests.map((req) => (
        <div key={req.id} className="glass-card rounded-xl p-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-secondary rounded-lg flex items-center justify-center text-secondary-foreground">
              <User size={18} />
            </div>
            <div>
              <p className="font-bold text-sm text-foreground">{req.manager_name || "Unknown Manager"}</p>
              <p className="text-xs text-muted-foreground">{req.manager_email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleDecision(req.manager_id, "ACTIVE")}
              disabled={!!processingId}
              className="w-8 h-8 rounded-full bg-green-500/10 text-green-500 flex items-center justify-center hover:bg-green-500 hover:text-white transition-colors"
            >
              {processingId === req.manager_id ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            </button>
            <button
              onClick={() => handleDecision(req.manager_id, "REJECTED")}
              disabled={!!processingId}
              className="w-8 h-8 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
