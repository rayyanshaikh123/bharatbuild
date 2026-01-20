"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Building2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { JoinProjectList } from "@/components/dashboard/JoinProjectList";
import { managerOrganization } from "@/lib/api/manager";

export default function JoinProjectPage() {
  const [orgId, setOrgId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchOrg = async () => {
      try {
        const reqsRes = await managerOrganization.getMyRequests();
        const approved = reqsRes.requests?.find(r => r.status === "APPROVED");
        if (approved) {
          setOrgId(approved.org_id);
        }
      } catch (err) {
        console.error("Failed to fetch organization:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchOrg();
  }, []);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/manager/projects">
          <Button variant="outline" size="sm">
            <ArrowLeft size={16} className="mr-2" /> Back
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-black tracking-tight text-foreground uppercase italic">
            Join <span className="text-primary">Project</span>
          </h1>
          <p className="text-muted-foreground mt-1">Browse and request to join projects in your organization.</p>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12">Loading...</div>
      ) : !orgId ? (
        <div className="text-center py-12 text-muted-foreground">
          You must be part of an organization to join projects.
        </div>
      ) : (
        <JoinProjectList organizationId={orgId} />
      )}
    </div>
  );
}
