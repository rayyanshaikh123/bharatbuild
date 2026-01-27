"use client";

import { useEffect, useState } from "react";
import { Wrench, Loader2, ArrowLeft, Building2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { ownerSiteEngineers, ownerOrganization, SiteEngineer, Organization } from "@/lib/api/owner";

export default function OwnerSiteEngineersPage() {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [engineers, setEngineers] = useState<SiteEngineer[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const orgRes = await ownerOrganization.getAll();
      if (orgRes.organizations && orgRes.organizations.length > 0) {
        const org = orgRes.organizations[0];
        setOrganization(org);

        const engRes = await ownerSiteEngineers.getAll(org.id);
        setEngineers(engRes.siteEngineers || []);
      }
    } catch (err) {
      console.error("Failed to fetch site engineers:", err);
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

  if (!organization) {
    return (
      <div className="text-center py-12">
        <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
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
            Site <span className="text-primary">Engineers</span>
          </h1>
          <p className="text-muted-foreground mt-1">
            View approved site engineers in your organization
          </p>
        </div>
      </div>

      {/* Engineers List */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <h3 className="text-lg font-bold text-foreground mb-4 uppercase tracking-wide">
          Approved Engineers ({engineers.length})
        </h3>

        {engineers.length === 0 ? (
          <div className="text-center py-12">
            <Wrench className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground">No Site Engineers</h3>
            <p className="text-muted-foreground mt-2">
              No approved site engineers found for your organization.
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {engineers.map((engineer) => (
              <div
                key={engineer.id}
                className="flex items-center gap-4 p-4 bg-muted/30 border border-border/50 rounded-xl"
              >
                <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center text-green-600">
                  <Wrench size={24} />
                </div>
                <div>
                  <h4 className="font-bold text-foreground">Engineer {engineer.site_engineer_id.slice(0, 8)}</h4>
                  <p className="text-xs text-muted-foreground">
                    {engineer.approved_at
                      ? `Approved ${new Date(engineer.approved_at).toLocaleDateString()}`
                      : "Status: " + engineer.status}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
