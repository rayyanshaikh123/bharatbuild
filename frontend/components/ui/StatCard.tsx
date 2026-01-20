"use client";

import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: LucideIcon;
}

export function StatCard({ 
  title, 
  value, 
  subtitle,
  change, 
  changeType = "neutral", 
  icon: Icon 
}: StatCardProps) {
  return (
    <div className="glass-card rounded-2xl p-5 transition-all duration-300 hover:shadow-lg group">
      <div className="flex items-start justify-between mb-3">
        <div className="w-11 h-11 bg-primary/10 rounded-xl flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
          <Icon size={22} />
        </div>
        {change && (
          <span
            className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${
              changeType === "positive"
                ? "bg-green-100 text-green-600 dark:bg-green-500/15 dark:text-green-400"
                : changeType === "negative"
                ? "bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {change}
          </span>
        )}
      </div>
      <p className="text-3xl font-black text-foreground tracking-tight">{value}</p>
      <p className="text-sm text-muted-foreground mt-0.5">{title}</p>
      {subtitle && (
        <p className="text-xs text-muted-foreground/70 mt-0.5">{subtitle}</p>
      )}
    </div>
  );
}
