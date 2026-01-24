"use client";

import { 
  DollarSign, 
  TrendingUp, 
  Package, 
  Users, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  Activity,
  ListChecks
} from "lucide-react";

interface ProjectAnalyticsData {
  project: {
    id: string;
    name: string;
    status: string;
    budget: number;
    current_invested?: number;
  };
  budget_vs_invested: {
    budget: number;
    invested: number;
    remaining: number;
    utilization_percentage: number;
  };
  material_cost_breakdown: Record<string, number>;
  wages_cost_breakdown: {
    total: number;
    by_skill: Record<string, number>;
  };
  attendance_summary: {
    total_hours: number;
    unique_labours: number;
    avg_hours_per_labour: number;
  };
  plan_progress: {
    total_items: number;
    completed: number;
    pending: number;
    delayed: number;
    completion_percentage: number;
  };
  delay_summary: {
    total_delayed_items: number;
    total_delay_days: number;
    avg_delay_per_item: number;
  };
  audit_activity_count: number;
}

// Format currency
function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

// Progress Bar Component
function ProgressBar({ value, max, color = "primary" }: { value: number; max: number; color?: string }) {
  const percentage = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const colorClass = {
    primary: "bg-primary",
    green: "bg-green-500",
    blue: "bg-blue-500",
    amber: "bg-amber-500",
    red: "bg-red-500",
  }[color] || "bg-primary";

  return (
    <div className="w-full h-2 bg-muted/30 rounded-full overflow-hidden">
      <div 
        className={`h-full ${colorClass} transition-all duration-500`} 
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}

// Stat Card
function StatCard({ 
  icon: Icon, 
  label, 
  value, 
  subvalue, 
  color = "blue" 
}: { 
  icon: any; 
  label: string; 
  value: string | number; 
  subvalue?: string;
  color?: string;
}) {
  const colorClasses = {
    blue: "bg-blue-500/20 text-blue-400",
    green: "bg-green-500/20 text-green-400",
    purple: "bg-purple-500/20 text-purple-400",
    amber: "bg-amber-500/20 text-amber-400",
    red: "bg-red-500/20 text-red-400",
    cyan: "bg-cyan-500/20 text-cyan-400",
  }[color] || "bg-blue-500/20 text-blue-400";

  return (
    <div className="glass-card rounded-xl p-4">
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg ${colorClasses}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground truncate">{label}</p>
          <p className="text-xl font-bold text-foreground">{value}</p>
          {subvalue && (
            <p className="text-xs text-muted-foreground mt-0.5">{subvalue}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// Main Component
export function ProjectAnalyticsDetail({ data }: { data: ProjectAnalyticsData }) {
  const { project, budget_vs_invested, wages_cost_breakdown, attendance_summary, plan_progress, delay_summary, audit_activity_count, material_cost_breakdown } = data;

  // Status badge color
  const statusColor = {
    ACTIVE: "bg-green-500/20 text-green-400",
    PLANNED: "bg-blue-500/20 text-blue-400",
    COMPLETED: "bg-purple-500/20 text-purple-400",
    ON_HOLD: "bg-gray-500/20 text-gray-400",
  }[project.status] || "bg-gray-500/20 text-gray-400";

  return (
    <div className="space-y-6">
      {/* Project Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h3 className="text-xl font-bold text-foreground">{project.name}</h3>
          <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${statusColor} mt-1`}>
            {project.status}
          </span>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Total Budget</p>
          <p className="text-2xl font-bold text-foreground">{formatCurrency(project.budget)}</p>
        </div>
      </div>

      {/* Budget Utilization */}
      <div className="glass-card rounded-xl p-5">
        <h4 className="font-semibold mb-4 flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-primary" />
          Budget Utilization
        </h4>
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Invested</span>
            <span className="font-medium">{formatCurrency(budget_vs_invested.invested)}</span>
          </div>
          <ProgressBar 
            value={budget_vs_invested.invested} 
            max={budget_vs_invested.budget} 
            color={budget_vs_invested.utilization_percentage > 90 ? "red" : budget_vs_invested.utilization_percentage > 70 ? "amber" : "green"} 
          />
          <div className="grid grid-cols-3 gap-4 pt-2">
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Budget</p>
              <p className="font-semibold text-sm">{formatCurrency(budget_vs_invested.budget)}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Remaining</p>
              <p className="font-semibold text-sm text-green-400">{formatCurrency(budget_vs_invested.remaining)}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Utilization</p>
              <p className="font-semibold text-sm">{budget_vs_invested.utilization_percentage.toFixed(1)}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          icon={ListChecks} 
          label="Plan Progress" 
          value={`${plan_progress.completion_percentage}%`}
          subvalue={`${plan_progress.completed}/${plan_progress.total_items} tasks`}
          color="blue"
        />
        <StatCard 
          icon={Users} 
          label="Workforce" 
          value={attendance_summary.unique_labours}
          subvalue={`${attendance_summary.total_hours.toFixed(1)} total hrs`}
          color="cyan"
        />
        <StatCard 
          icon={DollarSign} 
          label="Wages Paid" 
          value={formatCurrency(wages_cost_breakdown.total)}
          color="green"
        />
        <StatCard 
          icon={Activity} 
          label="Audit Events" 
          value={audit_activity_count}
          color="purple"
        />
      </div>

      {/* Plan Progress Details */}
      <div className="glass-card rounded-xl p-5">
        <h4 className="font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          Task Progress
        </h4>
        <div className="space-y-3">
          <ProgressBar value={plan_progress.completed} max={plan_progress.total_items} color="green" />
          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="p-3 bg-muted/20 rounded-lg">
              <p className="text-lg font-bold text-foreground">{plan_progress.total_items}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
            <div className="p-3 bg-green-500/10 rounded-lg">
              <p className="text-lg font-bold text-green-400">{plan_progress.completed}</p>
              <p className="text-xs text-muted-foreground">Completed</p>
            </div>
            <div className="p-3 bg-amber-500/10 rounded-lg">
              <p className="text-lg font-bold text-amber-400">{plan_progress.pending}</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </div>
            <div className="p-3 bg-red-500/10 rounded-lg">
              <p className="text-lg font-bold text-red-400">{plan_progress.delayed}</p>
              <p className="text-xs text-muted-foreground">Delayed</p>
            </div>
          </div>
        </div>
      </div>

      {/* Delays & Wages Side by Side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Delay Summary */}
        <div className="glass-card rounded-xl p-5">
          <h4 className="font-semibold mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            Delay Summary
          </h4>
          {delay_summary.total_delayed_items > 0 ? (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Delayed Items</span>
                <span className="font-semibold text-red-400">{delay_summary.total_delayed_items}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Total Delay Days</span>
                <span className="font-semibold">{delay_summary.total_delay_days}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Avg Delay/Item</span>
                <span className="font-semibold">{delay_summary.avg_delay_per_item.toFixed(1)} days</span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-green-400">
              <CheckCircle className="w-5 h-5" />
              <span>No delays reported</span>
            </div>
          )}
        </div>

        {/* Wages by Skill */}
        <div className="glass-card rounded-xl p-5">
          <h4 className="font-semibold mb-4 flex items-center gap-2">
            <Users className="w-4 h-4 text-cyan-400" />
            Wages by Skill
          </h4>
          {Object.keys(wages_cost_breakdown.by_skill).length > 0 ? (
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {Object.entries(wages_cost_breakdown.by_skill).map(([skill, amount]) => (
                <div key={skill} className="flex justify-between items-center text-sm">
                  <span className="capitalize text-muted-foreground">{skill.replace(/_/g, ' ')}</span>
                  <span className="font-medium">{formatCurrency(amount as number)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No wage data available</p>
          )}
        </div>
      </div>

      {/* Material Costs */}
      {Object.keys(material_cost_breakdown).length > 0 && (
        <div className="glass-card rounded-xl p-5">
          <h4 className="font-semibold mb-4 flex items-center gap-2">
            <Package className="w-4 h-4 text-amber-400" />
            Material Costs
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {Object.entries(material_cost_breakdown).map(([material, cost]) => (
              <div key={material} className="p-3 bg-muted/20 rounded-lg">
                <p className="text-xs text-muted-foreground capitalize">{material.replace(/_/g, ' ')}</p>
                <p className="font-semibold">{formatCurrency(cost as number)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Attendance Details */}
      <div className="glass-card rounded-xl p-5">
        <h4 className="font-semibold mb-4 flex items-center gap-2">
          <Clock className="w-4 h-4 text-blue-400" />
          Attendance Summary
        </h4>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-foreground">{attendance_summary.total_hours.toFixed(1)}</p>
            <p className="text-xs text-muted-foreground">Total Hours</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{attendance_summary.unique_labours}</p>
            <p className="text-xs text-muted-foreground">Unique Workers</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{attendance_summary.avg_hours_per_labour.toFixed(1)}</p>
            <p className="text-xs text-muted-foreground">Avg Hrs/Worker</p>
          </div>
        </div>
      </div>
    </div>
  );
}
