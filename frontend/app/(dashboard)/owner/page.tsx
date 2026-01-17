"use client";

import { useAuth } from "@/components/providers/AuthContext";
import {
  Building2,
  Users,
  FileText,
  TrendingUp,
  ArrowUpRight,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import Link from "next/link";

interface StatCardProps {
  title: string;
  value: string;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: React.ElementType;
}

function StatCard({ title, value, change, changeType = "neutral", icon: Icon }: StatCardProps) {
  return (
    <div className="relative group">
      <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/20 to-primary/5 rounded-2xl blur opacity-0 group-hover:opacity-100 transition duration-500" />
      
      <div className="relative bg-card border border-border rounded-2xl p-6 transition-all duration-300 hover:border-primary/30">
        <div className="flex items-start justify-between mb-4">
          <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
            <Icon size={24} />
          </div>
          {change && (
            <span
              className={`text-xs font-bold px-2 py-1 rounded-lg ${
                changeType === "positive"
                  ? "bg-green-500/10 text-green-600"
                  : changeType === "negative"
                  ? "bg-red-500/10 text-red-600"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {change}
            </span>
          )}
        </div>
        <p className="text-3xl font-black text-foreground tracking-tight">{value}</p>
        <p className="text-sm text-muted-foreground mt-1">{title}</p>
      </div>
    </div>
  );
}

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

  const stats = [
    { title: "Total Projects", value: "12", change: "+2 this month", changeType: "positive" as const, icon: Building2 },
    { title: "Active Managers", value: "8", change: "3 pending", changeType: "neutral" as const, icon: Users },
    { title: "DPRs This Week", value: "47", change: "+15%", changeType: "positive" as const, icon: FileText },
    { title: "Overall Progress", value: "78%", change: "On track", changeType: "positive" as const, icon: TrendingUp },
  ];

  const actions = [
    { title: "View All Projects", description: "Monitor project progress and costs", href: "/owner/projects", icon: Building2 },
    { title: "Manage Managers", description: "Approve or review manager requests", href: "/owner/managers", icon: Users },
    { title: "Download Reports", description: "Generate bill-readiness reports", href: "/owner/reports", icon: FileText },
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
            Here&apos;s what&apos;s happening across your organization
          </p>
        </div>
        <Button className="w-fit text-xs uppercase tracking-widest">
          View Analytics
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, idx) => (
          <StatCard key={idx} {...stat} />
        ))}
      </div>

      {/* Quick Actions & Activity */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <h3 className="text-lg font-bold text-foreground mb-4 uppercase tracking-wide">Quick Actions</h3>
          <div className="space-y-3">
            {actions.map((action, idx) => (
              <QuickAction key={idx} {...action} />
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-lg font-bold text-foreground mb-4 uppercase tracking-wide">Recent Activity</h3>
          <div className="bg-card border border-border rounded-2xl p-4 space-y-4">
            {[
              { text: "DPR approved for Site A", time: "2 hours ago", type: "success" },
              { text: "New manager request pending", time: "5 hours ago", type: "warning" },
              { text: "Material request submitted", time: "1 day ago", type: "info" },
            ].map((activity, idx) => (
              <div key={idx} className="flex items-start gap-3">
                <div
                  className={`w-2 h-2 rounded-full mt-2 ${
                    activity.type === "success"
                      ? "bg-green-500"
                      : activity.type === "warning"
                      ? "bg-yellow-500"
                      : "bg-blue-500"
                  }`}
                />
                <div>
                  <p className="text-sm text-foreground">{activity.text}</p>
                  <p className="text-xs text-muted-foreground">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
