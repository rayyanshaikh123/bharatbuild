"use client";

import { useEffect, useState } from "react";
import { Check, X, Loader2, ShoppingCart } from "lucide-react";
import { managerPurchaseManagerRequests, PurchaseManagerProjectRequest } from "@/lib/api/manager";
import { toast } from "sonner";

interface ProjectPurchaseManagerRequestsListProps {
  projectId: string;
  organizationId: string;
}

export function ProjectPurchaseManagerRequestsList({ projectId, organizationId }: ProjectPurchaseManagerRequestsListProps) {
  const [requests, setRequests] = useState<PurchaseManagerProjectRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchRequests = async () => {
    try {
      setIsLoading(true);
      const res = await managerPurchaseManagerRequests.getPending(projectId, organizationId);
      // Backend returns object with purchase_manager_requests array
      setRequests(res.purchase_manager_requests || []);
    } catch (err) {
      console.error("Failed to fetch PO manager requests:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (projectId && organizationId) {
      fetchRequests();
    }
  }, [projectId, organizationId]);

  const handleDecision = async (requestId: string, decision: "APPROVED" | "REJECTED") => {
    setProcessingId(requestId);
    try {
      await managerPurchaseManagerRequests.updateStatus(requestId, decision, projectId, organizationId);
      toast.success(`Purchase Manager request ${decision === 'APPROVED' ? 'approved' : 'rejected'}!`);
      // Remove from list
      setRequests(prev => prev.filter(r => r.id !== requestId));
    } catch (err: any) {
      console.error(`Failed to ${decision} PO manager:`, err);
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
        No pending purchase manager requests.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {requests.map((req) => (
        <div key={req.id} className="glass-card rounded-xl p-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center text-purple-600">
              <ShoppingCart size={18} />
            </div>
            <div>
              <p className="font-bold text-sm text-foreground">{req.purchase_manager_name || "Unknown PM"}</p>
              <div className="flex flex-col text-xs text-muted-foreground">
                <span>{req.purchase_manager_email}</span>
                {req.purchase_manager_phone && <span>{req.purchase_manager_phone}</span>}
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
