"use client";

import Link from "next/link";
import { Building2, MapPin } from "lucide-react";

interface ProjectCardProps {
  id: string;
  name: string;
  location_text?: string;
  status: "ACTIVE" | "PLANNED" | "COMPLETED" | "ON_HOLD";
  basePath: string; // e.g., "/owner/projects" or "/manager/projects"
}

const statusStyles = {
  ACTIVE: "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400",
  COMPLETED: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400",
  PLANNED: "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400",
  ON_HOLD: "bg-gray-100 text-gray-600 dark:bg-gray-500/20 dark:text-gray-400",
};

export function ProjectCard({ id, name, location_text, status, basePath }: ProjectCardProps) {
  return (
    <Link 
      href={`${basePath}/${id}`}
      className="glass-card rounded-2xl p-4 block hover:border-primary/30 transition-all duration-300 group"
    >
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
          <Building2 size={20} className="text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-foreground truncate group-hover:text-primary transition-colors">
            {name}
          </h4>
          {location_text && (
            <p className="text-xs text-muted-foreground truncate flex items-center gap-1 mt-0.5">
              <MapPin size={10} />
              {location_text}
            </p>
          )}
        </div>
        <span className={`text-xs px-2.5 py-1 rounded-full font-medium shrink-0 ${statusStyles[status]}`}>
          {status}
        </span>
      </div>
    </Link>
  );
}
