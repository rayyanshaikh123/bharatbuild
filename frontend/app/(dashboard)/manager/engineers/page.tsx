"use client";

import { useEffect, useState } from "react";
import { Users, Loader2, ArrowLeft, Mail, Phone, Check, X, Clock, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { managerOrganization, managerOrgEngineerRequests, ManagerOrgRequest, EngineerRequest } from "@/lib/api/manager";

export default function ManagerEngineersPage() {
  const [approvedOrg, setApprovedOrg] = useState<ManagerOrgRequest | null>(null);
  const [pendingRequests, setPendingRequests] = useState<EngineerRequest[]>([]);
  const [approvedEngineers, setApprovedEngineers] = useState<EngineerRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      
      const reqsRes = await managerOrganization.getMyRequests();
      const approved = reqsRes.requests?.find(r => r.status === "APPROVED");
      
      if (approved) {
        setApprovedOrg(approved);
        
        // Get pending and accepted engineer requests
        const [pendingRes, acceptedRes] = await Promise.all([
          managerOrgEngineerRequests.getPending(approved.org_id),
          managerOrgEngineerRequests.getAccepted(approved.org_id),
        ]);
        
        setPendingRequests(pendingRes.requests || []);
        setApprovedEngineers(acceptedRes.requests || []);
      }
    } catch (err) {
      console.error("Failed to fetch:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDecision = async (requestId: string, action: "APPROVED" | "REJECTED") => {
    setProcessingId(requestId);
    try {
      await managerOrgEngineerRequests.updateStatus(requestId, action);
      // Refresh data
      fetchData();
    } catch (err) {
      console.error("Failed to update:", err);
    } finally {
      setProcessingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!approvedOrg) {
    return (
      <div className="text-center py-12">
        <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-xl font-bold text-foreground">Not Approved</h2>
        <p className="text-muted-foreground mt-2">Join an organization first.</p>
        <Link href="/manager">
          <Button className="mt-4">Go to Dashboard</Button>
        </Link>
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
            Site <span className="text-primary">Engineers</span>
          </h1>
          <p className="text-muted-foreground mt-1">
            Approve or reject engineer requests for {approvedOrg.org_name}
          </p>
        </div>
      </div>

      {/* Pending Requests */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-yellow-500/10 rounded-xl flex items-center justify-center text-yellow-600">
            <Clock size={20} />
          </div>
          <h3 className="text-lg font-bold text-foreground uppercase tracking-wide">
            Pending Requests ({pendingRequests.length})
          </h3>
        </div>

        {pendingRequests.length === 0 ? (
          <div className="text-center py-8">
            <Users className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No pending engineer requests.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingRequests.map((request) => (
              <div
                key={request.id}
                className="flex items-center gap-4 p-4 bg-muted/30 border border-border/50 rounded-xl"
              >
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                  <Users size={24} />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-foreground">{request.engineer_name || "Unknown Engineer"}</h4>
                  <div className="flex gap-4 text-xs text-muted-foreground mt-1">
                    {request.engineer_email && (
                      <span className="flex items-center gap-1">
                        <Mail size={12} /> {request.engineer_email}
                      </span>
                    )}
                    {request.engineer_phone && (
                      <span className="flex items-center gap-1">
                        <Phone size={12} /> {request.engineer_phone}
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
                    className="border-red-500/30 text-red-600 hover:bg-red-500/10"
                  >
                    {processingId === request.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <X size={16} />}
                  </Button>
                  <Button
                    size="sm"
                    disabled={processingId === request.id}
                    onClick={() => handleDecision(request.id, "APPROVED")}
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
        )}
      </div>

      {/* Approved Engineers */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center text-green-600">
            <CheckCircle2 size={20} />
          </div>
          <h3 className="text-lg font-bold text-foreground uppercase tracking-wide">
            Active Engineers ({approvedEngineers.length})
          </h3>
        </div>

        {approvedEngineers.length === 0 ? (
          <div className="text-center py-8">
            <Users className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No approved engineers yet.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-3">
            {approvedEngineers.map((engineer) => (
              <div
                key={engineer.id}
                className="flex items-center gap-4 p-4 bg-muted/30 border border-border/50 rounded-xl"
              >
                <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center text-green-600">
                  <Users size={24} />
                </div>
                <div>
                  <h4 className="font-bold text-foreground">{engineer.engineer_name || "Unknown"}</h4>
                  <div className="flex gap-4 text-xs text-muted-foreground mt-1">
                    {engineer.engineer_email && (
                      <span className="flex items-center gap-1">
                        <Mail size={12} /> {engineer.engineer_email}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info Card */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-6">
        <h4 className="font-bold text-foreground mb-2">How it works</h4>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• Site engineers sign up and request to join the organization</li>
          <li>• You approve or reject their requests here</li>
          <li>• Approved engineers can be assigned to your projects</li>
          <li>• They will submit DPRs and attendance data from the field</li>
        </ul>
      </div>
    </div>
  );
}
