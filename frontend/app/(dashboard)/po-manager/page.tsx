"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/providers/AuthContext";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { poManagerDashboard, PODashboardSummary } from "@/lib/api/po-manager";
import { Loader2, Package, FileText, Send, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function StatsCard({ 
  title, 
  value, 
  icon: Icon, 
  colorClass 
}: { 
  title: string; 
  value: number | string; 
  icon: React.ElementType; 
  colorClass: string 
}) {
  return (
    <Card className="glass-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className={`p-2 rounded-lg ${colorClass}`}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}

export default function POManagerDashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<PODashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await poManagerDashboard.getSummary();
        setSummary(res.summary);
      } catch (err) {
        console.error("Failed to fetch dashboard summary:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pt-12 md:pt-0 pb-12">
      <DashboardHeader 
        userName={user?.name?.split(" ")[0]} 
        title="PO Manager Dashboard" 
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Pending Requests"
          value={summary?.pending_requests || 0}
          icon={Clock}
          colorClass="bg-amber-500/20 text-amber-400"
        />
        <StatsCard
          title="POs Generated Today"
          value={summary?.pos_generated_today || 0}
          icon={FileText}
          colorClass="bg-blue-500/20 text-blue-400"
        />
        <StatsCard
          title="POs Sent This Week"
          value={summary?.pos_sent_this_week || 0}
          icon={Send}
          colorClass="bg-green-500/20 text-green-400"
        />
        <StatsCard
          title="Total Purchase Orders"
          value={summary?.total_pos || 0}
          icon={Package}
          colorClass="bg-purple-500/20 text-purple-400"
        />
      </div>

      {/* Quick Actions */}
      <div className="glass-card rounded-2xl p-6">
        <h2 className="text-lg font-bold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <a 
            href="/po-manager/material-requests" 
            className="p-4 bg-muted/30 rounded-xl border border-border hover:border-primary/50 transition-colors group"
          >
            <Package className="h-6 w-6 text-primary mb-2" />
            <h3 className="font-semibold">View Material Requests</h3>
            <p className="text-sm text-muted-foreground">
              Process approved material requests and generate POs
            </p>
          </a>
          <a 
            href="/po-manager/purchase-orders" 
            className="p-4 bg-muted/30 rounded-xl border border-border hover:border-primary/50 transition-colors group"
          >
            <FileText className="h-6 w-6 text-primary mb-2" />
            <h3 className="font-semibold">Manage Purchase Orders</h3>
            <p className="text-sm text-muted-foreground">
              View, upload PDFs, and track PO status
            </p>
          </a>
        </div>
      </div>
    </div>
  );
}
