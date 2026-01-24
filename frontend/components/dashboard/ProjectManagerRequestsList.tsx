"use client";

import { useEffect, useState } from "react";
import { Check, X, Loader2, User } from "lucide-react";
import { managerProjectManagerRequests } from "@/lib/api/manager";
import { toast } from "sonner";

interface ManagerRequest {
  id: string;
  manager_id: string;
  status: string;
  manager_name?: string;
  manager_email?: string;
  manager_phone?: string;
  assigned_at?: string;
}

interface ProjectManagerRequestsListProps {
  projectId: string;
  organizationId: string;
}

export function ProjectManagerRequestsList({ projectId, organizationId }: ProjectManagerRequestsListProps) {
  const [requests, setRequests] = useState<ManagerRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchRequests = async () => {
    try {
      setIsLoading(true);
      const res = await managerProjectManagerRequests.getPending(projectId, organizationId);
      // Filter to only show PENDING requests
      const pendingRequests = (res.requests || []).filter(r => r.status === 'PENDING');
      setRequests(pendingRequests);
    } catch (err) {
      console.error("Failed to fetch manager requests:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (projectId && organizationId) {
      fetchRequests();
    }
  }, [projectId, organizationId]);

  const handleDecision = async (requestId: string, decision: "ACTIVE" | "REJECTED") => {
    setProcessingId(requestId);
    try {
      await managerProjectManagerRequests.decide(requestId, decision, projectId, organizationId);
      toast.success(`Manager request ${decision === 'ACTIVE' ? 'approved' : 'rejected'}!`);
      // Remove from list
      setRequests(prev => prev.filter(r => r.id !== requestId));
    } catch (err: any) {
      console.error(`Failed to ${decision} manager:`, err);
      toast.error(err.response?.data?.error || `Failed to ${decision.toLowerCase()} request`);
    } finally {
      setProcessingId(null);
    }
  };

  if (isLoading) {
    return <div className="py-4"><Loader2 className="animate-spin mx-auto text-primary" /></div>;
  }

  if (requests.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground text-sm border border-dashed border-border rounded-xl">
        No pending manager join requests.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {requests.map((req) => (
        <div key={req.id} className="glass-card rounded-xl p-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
              <User size={18} />
            </div>
            <div>
              <p className="font-bold text-sm text-foreground">{req.manager_name || "Unknown Manager"}</p>
              <div className="flex flex-col text-xs text-muted-foreground">
                <span>{req.manager_email}</span>
                {req.manager_phone && <span>{req.manager_phone}</span>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleDecision(req.id, "ACTIVE")}
              disabled={!!processingId}
              className="w-8 h-8 rounded-full bg-green-500/10 text-green-500 flex items-center justify-center hover:bg-green-500 hover:text-white transition-colors"
              title="Approve"
            >
              {processingId === req.id ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            </button>
            <button
              onClick={() => handleDecision(req.id, "REJECTED")}
              disabled={!!processingId}
              className="w-8 h-8 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors"
              title="Reject"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
