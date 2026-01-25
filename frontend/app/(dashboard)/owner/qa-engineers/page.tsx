"use client";

import { useEffect, useState } from "react";
import { Shield, Loader2, ArrowLeft, Mail, Phone, Clock, Building2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { ownerQAEngineerRequests, QAEngineerRequest } from "@/lib/api/owner";

export default function OwnerQAEngineersPage() {
  const [pendingEngineers, setPendingEngineers] = useState<QAEngineerRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const res = await ownerQAEngineerRequests.getPending();
      setPendingEngineers(res.pending_engineers || []);
    } catch (err) {
      console.error("Failed to fetch QA engineers:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

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
        <Link href="/owner">
          <Button variant="outline" size="sm">
            <ArrowLeft size={16} className="mr-2" /> Back
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-black tracking-tight text-foreground uppercase italic">
            QA <span className="text-primary">Engineers</span>
          </h1>
          <p className="text-muted-foreground mt-1">
            View pending QA engineer requests for your organization
          </p>
        </div>
      </div>

      {/* Pending QA Engineers */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-600">
            <Clock size={20} />
          </div>
          <h3 className="text-lg font-bold text-foreground uppercase tracking-wide">
            Pending Requests ({pendingEngineers.length})
          </h3>
        </div>

        {pendingEngineers.length === 0 ? (
          <div className="text-center py-12">
            <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground">No Pending Requests</h3>
            <p className="text-muted-foreground mt-2">
              There are no pending QA engineer requests at this time.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingEngineers.map((engineer) => (
              <div
                key={engineer.id}
                className="flex items-center gap-4 p-4 bg-muted/30 border border-border/50 rounded-xl"
              >
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                  <Shield size={24} />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-foreground">{engineer.name}</h4>
                  <div className="flex gap-4 text-xs text-muted-foreground mt-1">
                    {engineer.email && (
                      <span className="flex items-center gap-1">
                        <Mail size={12} /> {engineer.email}
                      </span>
                    )}
                    {engineer.phone && (
                      <span className="flex items-center gap-1">
                        <Phone size={12} /> {engineer.phone}
                      </span>
                    )}
                  </div>
                  {engineer.organization_name && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                      <Building2 size={12} />
                      <span>{engineer.organization_name}</span>
                    </div>
                  )}
                </div>
                <div className="px-3 py-1.5 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                  <span className="text-xs font-semibold text-yellow-600 uppercase">
                    {engineer.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
        <p className="text-sm text-blue-600">
          <strong>Note:</strong> QA engineer requests are approved by managers. As an owner, you can view pending requests but cannot approve them directly.
        </p>
      </div>
    </div>
  );
}
