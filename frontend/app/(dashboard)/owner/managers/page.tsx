"use client";

import { useEffect, useState } from "react";
import { Users, Loader2, ArrowLeft, Mail, Phone, Check, X, Clock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { ownerOrganization, ownerRequests, ManagerRequest, Organization } from "@/lib/api/owner";

export default function OwnerManagersPage() {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [pendingRequests, setPendingRequests] = useState<ManagerRequest[]>([]);
  const [approvedManagers, setApprovedManagers] = useState<ManagerRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const orgRes = await ownerOrganization.getAll();
      if (orgRes.organizations && orgRes.organizations.length > 0) {
        const org = orgRes.organizations[0];
        setOrganization(org);

        const [pendingRes, acceptedRes] = await Promise.all([
          ownerRequests.getPending(org.id),
          ownerRequests.getAccepted(org.id),
        ]);

        setPendingRequests(pendingRes.managers || []);
        setApprovedManagers(acceptedRes.managers || []);
      }
    } catch (err) {
      console.error("Failed to fetch data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDecision = async (requestId: string, status: "APPROVED" | "REJECTED") => {
    setProcessingId(requestId);
    try {
      await ownerRequests.updateStatus(requestId, status);
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

  if (!organization) {
    return (
      <div className="text-center py-12">
        <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-xl font-bold text-foreground">No Organization</h2>
        <p className="text-muted-foreground mt-2">Create an organization first.</p>
        <Link href="/owner">
          <Button className="mt-4">Go to Dashboard</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 pt-12 md:pt-0">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/owner">
          <Button variant="outline" size="sm">
            <ArrowLeft size={16} className="mr-2" /> Back
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-black tracking-tight text-foreground uppercase italic">
            Manage <span className="text-primary">Managers</span>
          </h1>
          <p className="text-muted-foreground mt-1">
            Approve requests and view active managers
          </p>
        </div>
      </div>

      {/* Pending Requests */}
      {pendingRequests.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-yellow-500/10 rounded-xl flex items-center justify-center text-yellow-600">
              <Clock size={20} />
            </div>
            <h3 className="text-lg font-bold text-foreground uppercase tracking-wide">
              Pending Requests ({pendingRequests.length})
            </h3>
          </div>

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
                  <h4 className="font-bold text-foreground">{request.manager_name || "Unknown"}</h4>
                  <div className="flex gap-4 text-xs text-muted-foreground mt-1">
                    {request.manager_email && (
                      <span className="flex items-center gap-1">
                        <Mail size={12} /> {request.manager_email}
                      </span>
                    )}
                    {request.manager_phone && (
                      <span className="flex items-center gap-1">
                        <Phone size={12} /> {request.manager_phone}
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
                    {processingId === request.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Check size={16} className="mr-1" /> Approve</>}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Approved Managers */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <h3 className="text-lg font-bold text-foreground mb-4 uppercase tracking-wide">
          Active Managers ({approvedManagers.length})
        </h3>

        {approvedManagers.length === 0 ? (
          <div className="text-center py-8">
            <Users className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No approved managers yet.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-3">
            {approvedManagers.map((manager) => (
              <div
                key={manager.id}
                className="flex items-center gap-4 p-4 bg-muted/30 border border-border/50 rounded-xl"
              >
                <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center text-green-600">
                  <Users size={24} />
                </div>
                <div>
                  <h4 className="font-bold text-foreground">{manager.manager_name || "Unknown"}</h4>
                  <div className="flex gap-4 text-xs text-muted-foreground mt-1">
                    {manager.manager_email && (
                      <span className="flex items-center gap-1">
                        <Mail size={12} /> {manager.manager_email}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
