"use client";

import { useEffect, useState } from "react";
import { Check, X, Loader2, User } from "lucide-react";
import { managerEngineerRequests, EngineerRequest } from "@/lib/api/manager";

interface ProjectEngineerRequestsListProps {
  projectId: string;
}

export function ProjectEngineerRequestsList({ projectId }: ProjectEngineerRequestsListProps) {
  const [requests, setRequests] = useState<EngineerRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchRequests = async () => {
    try {
      setIsLoading(true);
      const res = await managerEngineerRequests.getPending(projectId);
      setRequests(res.requests || []);
    } catch (err) {
      console.error("Failed to fetch pending engineers:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) {
      fetchRequests();
    }
  }, [projectId]);

  const handleDecision = async (requestId: string, decision: "APPROVED" | "REJECTED") => {
    setProcessingId(requestId);
    try {
      if (decision === "APPROVED") {
        await managerEngineerRequests.approve(requestId);
      } else {
        await managerEngineerRequests.reject(requestId);
      }
      
      // Remove from list
      setRequests(prev => prev.filter(r => r.id !== requestId));
    } catch (err) {
      console.error(`Failed to ${decision} engineer:`, err);
    } finally {
      setProcessingId(null);
    }
  };

  if (isLoading) return <div className="py-4"><Loader2 className="animate-spin mx-auto text-primary" /></div>;

  if (requests.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground text-sm border border-dashed border-border rounded-xl">
        No pending site engineer requests.
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
              <p className="font-bold text-sm text-foreground">{req.engineer_name || "Unknown Engineer"}</p>
              <div className="flex flex-col text-xs text-muted-foreground">
                <span>{req.engineer_email}</span>
                {req.engineer_phone && <span>{req.engineer_phone}</span>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleDecision(req.id, "APPROVED")}
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
