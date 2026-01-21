"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Building2, MapPin, Calendar, IndianRupeeIcon, Users, Edit, Loader2, Trash2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { ProjectDetailMap } from "@/components/maps/ProjectsMap";
import { ProjectManagerApprovalList } from "@/components/dashboard/ProjectManagerApprovalList";

interface Project {
  id: string;
  name: string;
  description?: string;
  location_text?: string;
  latitude: number;
  longitude: number;
  status: "ACTIVE" | "PLANNED" | "COMPLETED" | "ON_HOLD";
  budget?: number;
  start_date?: string;
  end_date?: string;
  geofence_radius?: number;
  created_at?: string;
  org_id: string;
}

interface ProjectDetailViewProps {
  project: Project | null;
  isLoading: boolean;
  error: string | null;
  backHref: string;
  editHref?: string;
  showEdit?: boolean;
  userRole: "owner" | "manager";
}

const statusStyles = {
  ACTIVE: "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400",
  COMPLETED: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400",
  PLANNED: "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400",
  ON_HOLD: "bg-gray-100 text-gray-600 dark:bg-gray-500/20 dark:text-gray-400",
};

function formatBudget(value?: number): string {
  if (!value) return "—";
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
  if (value >= 1000) return `₹${(value / 1000).toFixed(0)}K`;
  return `₹${value}`;
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function ProjectDetailView({
  project,
  isLoading,
  error,
  backHref,
  editHref,
  showEdit = true,
  userRole,
}: ProjectDetailViewProps) {
  const router = useRouter();

  if (isLoading) {
    return (
      <div className="glass-card rounded-2xl p-12 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-3 text-muted-foreground">Loading project details...</span>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="glass-card rounded-2xl p-12 text-center">
        <p className="text-destructive mb-4">{error || "Project not found"}</p>
        <Link href={backHref}>
          <Button variant="outline">Go Back</Button>
        </Link>
      </div>
    );
  }

  const projectLocation = {
    id: project.id,
    name: project.name,
    latitude: project.latitude,
    longitude: project.longitude,
    status: project.status,
    location_text: project.location_text,
    geofence_radius: project.geofence_radius,
  };

  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!project || !confirm("Are you sure you want to delete this project? This action cannot be undone.")) return;
    
    setIsDeleting(true);
    try {
      const { managerProjects } = await import("@/lib/api/manager");
      await managerProjects.delete(project.id, project.org_id);
      router.push("/manager/projects");
    } catch (err) {
      console.error("Failed to delete project:", err);
      alert("Failed to delete project");
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div className="flex items-start gap-4">
          <button
            onClick={() => router.push(backHref)}
            className="w-10 h-10 bg-muted/50 rounded-xl flex items-center justify-center hover:bg-muted transition-colors mt-1"
          >
            <ArrowLeft size={20} className="text-muted-foreground" />
          </button>
          <div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-foreground">
              {project.name}
            </h1>
            {project.location_text && (
              <p className="text-muted-foreground flex items-center gap-1.5 mt-1">
                <MapPin size={14} />
                {project.location_text}
              </p>
            )}
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3">
          <span className={`px-4 py-2 rounded-full text-sm font-bold ${statusStyles[project.status]}`}>
            {project.status}
          </span>
          
          {/* Manager Actions */}
          {userRole === "manager" && showEdit && (
            <div className="flex items-center gap-2">
              {editHref && (
                <Link href={editHref}>
                  <Button variant="outline" className="gap-2">
                    <Edit size={16} />
                    Edit
                  </Button>
                </Link>
              )}
              <Button 
                variant="destructive" 
                size="icon"
                onClick={handleDelete}
                disabled={isDeleting}
                title="Delete Project"
              >
                {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card rounded-2xl p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <IndianRupeeIcon size={18} className="text-primary" />
            </div>
            <span className="text-sm text-muted-foreground">Budget</span>
          </div>
          <p className="text-xl font-bold text-foreground">{formatBudget(project.budget)}</p>
        </div>
        
        <div className="glass-card rounded-2xl p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <Calendar size={18} className="text-primary" />
            </div>
            <span className="text-sm text-muted-foreground">Start Date</span>
          </div>
          <p className="text-xl font-bold text-foreground">{formatDate(project.start_date)}</p>
        </div>
        
        <div className="glass-card rounded-2xl p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <Calendar size={18} className="text-primary" />
            </div>
            <span className="text-sm text-muted-foreground">End Date</span>
          </div>
          <p className="text-xl font-bold text-foreground">{formatDate(project.end_date)}</p>
        </div>
        
        <div className="glass-card rounded-2xl p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <MapPin size={18} className="text-primary" />
            </div>
            <span className="text-sm text-muted-foreground">Geofence</span>
          </div>
          <p className="text-xl font-bold text-foreground">
            {project.geofence_radius ? `${project.geofence_radius}m` : "—"}
          </p>
        </div>
      </div>

      {/* Description */}
      {project.description && (
        <div className="glass-card rounded-2xl p-6">
          <h3 className="font-bold text-foreground mb-3">Description</h3>
          <p className="text-muted-foreground">{project.description}</p>
        </div>
      )}

      {/* Detailed Map with Geofence Radius */}
      {project.latitude && project.longitude && (
        <ProjectDetailMap project={projectLocation} height="400px" />
      )}

      {/* Owner Approvals Section */}
      {userRole === "owner" && (
        <div className="glass-card rounded-2xl p-6">
          <h3 className="font-bold text-foreground mb-4">Pending Manager Approvals</h3>
          <ProjectManagerApprovalList organizationId={project.org_id} projectId={project.id} />
        </div>
      )}
    </div>
  );
}
