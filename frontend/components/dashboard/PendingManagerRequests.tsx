"use client";

import { useEffect, useState } from "react";
import { Users, Loader2, Check, X, Mail, Phone, Clock, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ownerRequests, ManagerRequest, ownerPurchaseManagerRequests, PurchaseManagerRequest } from "@/lib/api/owner";
import { Badge } from "@/components/ui/badge";

interface PendingManagerRequestsProps {
  organizationId: string | null;
}

export function PendingManagerRequests({ organizationId }: PendingManagerRequestsProps) {
  const [managerRequests, setManagerRequests] = useState<ManagerRequest[]>([]);
  const [pmRequests, setPmRequests] = useState<PurchaseManagerRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchRequests = async () => {
    if (!organizationId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      
      // Fetch Manager requests
      const managerRes = await ownerRequests.getPending(organizationId).catch(() => ({ managers: [] }));
      setManagerRequests(managerRes.managers || []);
      
      // Fetch PO Manager requests (separate catch to handle if route doesn't exist)
      const pmRes = await ownerPurchaseManagerRequests.getPending(organizationId).catch(() => ({ purchase_managers: [] }));
      setPmRequests(pmRes.purchase_managers || []);
    } catch (err) {
      console.error("Failed to fetch requests:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [organizationId]);

  const handleManagerDecision = async (requestId: string, status: "APPROVED" | "REJECTED") => {
    setProcessingId(requestId);
    try {
      await ownerRequests.updateStatus(requestId, status);
      setManagerRequests(prev => prev.filter(r => r.id !== requestId));
    } catch (err) {
      console.error("Failed to update manager request:", err);
    } finally {
      setProcessingId(null);
    }
  };

  const handlePMDecision = async (requestId: string, status: "APPROVED" | "REJECTED") => {
    setProcessingId(requestId);
    try {
      await ownerPurchaseManagerRequests.updateStatus(requestId, status);
      setPmRequests(prev => prev.filter(r => r.id !== requestId));
    } catch (err) {
      console.error("Failed to update PM request:", err);
    } finally {
      setProcessingId(null);
    }
  };

  if (!organizationId) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-6">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  const totalRequests = managerRequests.length + pmRequests.length;

  if (totalRequests === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Clock className="h-10 w-10 mx-auto mb-3 opacity-30" />
        <p>No pending requests</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Manager Requests */}
      {managerRequests.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Users size={18} className="text-blue-500" />
            <h4 className="font-semibold text-sm">
              Manager Requests
              <Badge variant="secondary" className="ml-2">{managerRequests.length}</Badge>
            </h4>
          </div>
          <div className="space-y-2">
            {managerRequests.map((request) => (
              <div
                key={request.id}
                className="flex items-center gap-4 p-4 bg-muted/30 border border-border/50 rounded-xl"
              >
                <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center text-blue-500">
                  <Users size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <h5 className="font-semibold text-foreground truncate">{request.manager_name || "Unknown"}</h5>
                  <div className="flex gap-3 text-xs text-muted-foreground mt-1">
                    {request.manager_email && (
                      <span className="flex items-center gap-1 truncate">
                        <Mail size={12} />{request.manager_email}
                      </span>
                    )}
                    {request.manager_phone && (
                      <span className="flex items-center gap-1">
                        <Phone size={12} />{request.manager_phone}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={processingId === request.id}
                    onClick={() => handleManagerDecision(request.id, "REJECTED")}
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
                    onClick={() => handleManagerDecision(request.id, "APPROVED")}
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
      )}

      {/* Purchase Manager Requests */}
      {pmRequests.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <ShoppingCart size={18} className="text-purple-500" />
            <h4 className="font-semibold text-sm">
              Purchase Manager Requests
              <Badge variant="secondary" className="ml-2">{pmRequests.length}</Badge>
            </h4>
          </div>
          <div className="space-y-2">
            {pmRequests.map((request) => (
              <div
                key={request.id}
                className="flex items-center gap-4 p-4 bg-muted/30 border border-border/50 rounded-xl"
              >
                <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center text-purple-500">
                  <ShoppingCart size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <h5 className="font-semibold text-foreground truncate">{request.purchase_manager_name}</h5>
                  <div className="flex gap-3 text-xs text-muted-foreground mt-1">
                    {request.purchase_manager_email && (
                      <span className="flex items-center gap-1 truncate">
                        <Mail size={12} />{request.purchase_manager_email}
                      </span>
                    )}
                    {request.purchase_manager_phone && (
                      <span className="flex items-center gap-1">
                        <Phone size={12} />{request.purchase_manager_phone}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={processingId === request.id}
                    onClick={() => handlePMDecision(request.id, "REJECTED")}
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
                    onClick={() => handlePMDecision(request.id, "APPROVED")}
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
      )}
    </div>
  );
}
