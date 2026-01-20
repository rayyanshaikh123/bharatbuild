"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { DonutChart } from "@/components/charts/DonutChart";

interface ChartDataItem {
  label: string;
  value: number;
  color: string;
}

interface ProjectsOverviewCardProps {
  data: ChartDataItem[];
  totalValue: number;
  onHoldCount?: number;
  viewAllHref: string;
}

export function ProjectsOverviewCard({
  data,
  totalValue,
  onHoldCount = 0,
  viewAllHref,
}: ProjectsOverviewCardProps) {
  return (
    <div className="glass-card rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-bold text-foreground text-lg">Projects Overview</h3>
        <Link href={viewAllHref} className="text-muted-foreground hover:text-primary transition-colors">
          <ArrowUpRight size={18} />
        </Link>
      </div>
      
      <div className="flex flex-col items-center">
        <DonutChart
          data={data}
          size={180}
          strokeWidth={24}
          centerValue={totalValue}
          centerLabel="Total"
        />
        
        {/* Legend */}
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mt-6">
          {data.map((item, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: item.color }}
              />
              <span className="text-sm text-muted-foreground">
                {item.label}: <span className="font-semibold text-foreground">{item.value}</span>
              </span>
            </div>
          ))}
        </div>
        
        {onHoldCount > 0 && (
          <p className="text-sm text-muted-foreground mt-4">
            On Hold: <span className="font-semibold text-foreground">{onHoldCount}</span>
          </p>
        )}
      </div>
    </div>
  );
}

interface BudgetOverviewCardProps {
  activeBudget: number;
  plannedBudget: number;
  completedBudget: number;
}

function formatBudget(value: number): string {
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
  if (value >= 1000) return `₹${(value / 1000).toFixed(0)}K`;
  return `₹${value}`;
}

export function BudgetOverviewCard({
  activeBudget,
  plannedBudget,
  completedBudget,
}: BudgetOverviewCardProps) {
  const totalBudget = activeBudget + plannedBudget + completedBudget;

  return (
    <div className="glass-card rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-bold text-foreground text-lg">Budget Overview</h3>
        <ArrowUpRight size={18} className="text-muted-foreground" />
      </div>
      
      <div className="space-y-5">
        <div>
          <div className="flex justify-between mb-2">
            <span className="text-sm text-muted-foreground">Active Projects</span>
            <span className="text-sm font-semibold text-foreground">{formatBudget(activeBudget)}</span>
          </div>
          <div className="h-2.5 bg-muted/50 rounded-full overflow-hidden">
            <div 
              className="h-full bg-green-500 rounded-full transition-all duration-500"
              style={{ width: `${totalBudget > 0 ? (activeBudget / totalBudget) * 100 : 0}%` }}
            />
          </div>
        </div>
        
        <div>
          <div className="flex justify-between mb-2">
            <span className="text-sm text-muted-foreground">Planned</span>
            <span className="text-sm font-semibold text-foreground">{formatBudget(plannedBudget)}</span>
          </div>
          <div className="h-2.5 bg-muted/50 rounded-full overflow-hidden">
            <div 
              className="h-full bg-orange-500 rounded-full transition-all duration-500"
              style={{ width: `${totalBudget > 0 ? (plannedBudget / totalBudget) * 100 : 0}%` }}
            />
          </div>
        </div>
        
        <div>
          <div className="flex justify-between mb-2">
            <span className="text-sm text-muted-foreground">Completed</span>
            <span className="text-sm font-semibold text-foreground">{formatBudget(completedBudget)}</span>
          </div>
          <div className="h-2.5 bg-muted/50 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-500 rounded-full transition-all duration-500"
              style={{ width: `${totalBudget > 0 ? (completedBudget / totalBudget) * 100 : 0}%` }}
            />
          </div>
        </div>
        
        <div className="pt-4 border-t border-border/50">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-muted-foreground">Total Budget</span>
            <span className="text-2xl font-black text-foreground">{formatBudget(totalBudget)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
