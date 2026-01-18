"use client";

import { useState } from "react";
import { useAuth } from "@/components/providers/AuthContext";
import { Building2, Users, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { OwnerOrganization } from "@/components/dashboard/OrganizationList";
import { PendingManagerRequests } from "@/components/dashboard/PendingManagerRequests";
import { Organization } from "@/lib/api/owner";

interface QuickActionProps {
  title: string;
  description: string;
  href: string;
  icon: React.ElementType;
}

function QuickAction({ title, description, href, icon: Icon }: QuickActionProps) {
  return (
    <Link href={href} className="block group">
      <div className="flex items-center gap-4 p-4 bg-muted/30 border border-border/50 rounded-xl hover:bg-muted/50 hover:border-primary/30 transition-all duration-300">
        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
          <Icon size={20} />
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-bold text-foreground">{title}</h4>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        <ArrowUpRight size={16} className="text-muted-foreground group-hover:text-primary transition-colors" />
      </div>
    </Link>
  );
}

export default function OwnerDashboardPage() {
  const { user } = useAuth();
  const [organization, setOrganization] = useState<Organization | null>(null);

  const actions = [
    { title: "View All Projects", description: "Monitor project progress and costs", href: "/owner/projects", icon: Building2 },
    { title: "Manage Managers", description: "Approve or review manager requests", href: "/owner/managers", icon: Users },
  ];

  return (
    <div className="space-y-8 pt-12 md:pt-0">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-foreground uppercase italic">
            Welcome, <span className="text-primary">{user?.name?.split(" ")[0] || "Owner"}</span>
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your organization and projects
          </p>
        </div>
      </div>

      {/* Organization Section */}
      <OwnerOrganization onOrganizationLoad={setOrganization} />

      {/* Pending Manager Requests - only show if org exists */}
      <PendingManagerRequests organizationId={organization?.id || null} />

      {/* Quick Actions */}
      <div>
        <h3 className="text-lg font-bold text-foreground mb-4 uppercase tracking-wide">Quick Actions</h3>
        <div className="grid md:grid-cols-2 gap-3">
          {actions.map((action, idx) => (
            <QuickAction key={idx} {...action} />
          ))}
        </div>
      </div>
    </div>
  );
}
