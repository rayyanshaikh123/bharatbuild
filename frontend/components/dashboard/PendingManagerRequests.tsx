"use client";

import { useEffect, useState } from "react";
import { Users, Loader2, Check, X, Mail, Phone, Clock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ownerRequests, ManagerRequest } from "@/lib/api/owner";

interface PendingManagerRequestsProps {
  organizationId: string | null;
}

export function PendingManagerRequests({ organizationId }: PendingManagerRequestsProps) {
  const [requests, setRequests] = useState<ManagerRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchRequests = async () => {
    if (!organizationId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const response = await ownerRequests.getPending(organizationId);
      setRequests(response.managers || []);
    } catch (err) {
      console.error("Failed to fetch requests:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [organizationId]);

  const handleDecision = async (requestId: string, status: "APPROVED" | "REJECTED") => {
    setProcessingId(requestId);
    try {
      await ownerRequests.updateStatus(requestId, status);
      // Remove from list after processing
      setRequests(prev => prev.filter(r => r.id !== requestId));
    } catch (err) {
      console.error("Failed to update request:", err);
    } finally {
      setProcessingId(null);
    }
  };

  if (!organizationId) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-2xl p-6 flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  if (requests.length === 0) {
    return null; // Don't show section if no pending requests
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-yellow-500/10 rounded-xl flex items-center justify-center text-yellow-600">
          <Clock size={20} />
        </div>
        <div>
          <h3 className="text-lg font-bold text-foreground uppercase tracking-wide">
            Pending Manager Requests
          </h3>
          <p className="text-sm text-muted-foreground">
            {requests.length} manager{requests.length > 1 ? "s" : ""} waiting for approval
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {requests.map((request) => (
          <div
            key={request.id}
            className="flex items-center gap-4 p-4 bg-muted/30 border border-border/50 rounded-xl"
          >
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
              <Users size={24} />
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-foreground">{request.manager_name || "Unknown"}</h4>
              <div className="flex gap-4 text-xs text-muted-foreground mt-1">
                {request.manager_email && (
                  <span className="flex items-center gap-1">
                    <Mail size={12} />
                    {request.manager_email}
                  </span>
                )}
                {request.manager_phone && (
                  <span className="flex items-center gap-1">
                    <Phone size={12} />
                    {request.manager_phone}
                  </span>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={processingId === request.id}
                onClick={() => handleDecision(request.id, "REJECTED")}
                className="text-xs border-red-500/30 text-red-600 hover:bg-red-500/10"
              >
                {processingId === request.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <X size={16} />
                )}
              </Button>
              <Button
                size="sm"
                disabled={processingId === request.id}
                onClick={() => handleDecision(request.id, "APPROVED")}
                className="text-xs"
              >
                {processingId === request.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Check size={16} className="mr-1" /> Approve
                  </>
                )}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
