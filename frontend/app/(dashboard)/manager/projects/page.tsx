"use client";

import { useEffect, useState } from "react";
import { Building2, MapPin, Calendar, DollarSign, Loader2, ArrowLeft, Plus, Edit, Trash2, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { managerOrganization, managerProjects, Project, ManagerOrgRequest } from "@/lib/api/manager";

const statusColors = {
  PLANNED: "bg-blue-500/10 text-blue-600 border-blue-500/30",
  ACTIVE: "bg-green-500/10 text-green-600 border-green-500/30",
  COMPLETED: "bg-gray-500/10 text-gray-600 border-gray-500/30",
  ON_HOLD: "bg-yellow-500/10 text-yellow-600 border-yellow-500/30",
};

interface ProjectActionsProps {
  project: Project;
  organizationId: string;
  onStatusChange: () => void;
  onDelete: () => void;
}

function ProjectActions({ project, organizationId, onStatusChange, onDelete }: ProjectActionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleStatusChange = async (newStatus: Project["status"]) => {
    setIsUpdating(true);
    try {
      await managerProjects.updateStatus(project.id, organizationId, newStatus);
      onStatusChange();
    } catch (err) {
      console.error("Failed to update status:", err);
    } finally {
      setIsUpdating(false);
      setIsOpen(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this project?")) return;
    
    setIsUpdating(true);
    try {
      await managerProjects.delete(project.id, organizationId);
      onDelete();
    } catch (err) {
      console.error("Failed to delete:", err);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isUpdating}
        className="h-8 w-8 p-0"
      >
        {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreVertical size={16} />}
      </Button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-10 z-20 bg-card border border-border rounded-xl shadow-lg p-2 min-w-[160px]">
            <p className="text-xs text-muted-foreground px-2 py-1 uppercase tracking-wider">Status</p>
            {(["PLANNED", "ACTIVE", "ON_HOLD", "COMPLETED"] as const).map((status) => (
              <button
                key={status}
                onClick={() => handleStatusChange(status)}
                disabled={project.status === status}
                className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors ${
                  project.status === status
                    ? "bg-primary/10 text-primary font-bold"
                    : "hover:bg-muted"
                }`}
              >
                {status}
              </button>
            ))}
            <hr className="my-2 border-border" />
            <Link href={`/manager/projects/${project.id}/edit`}>
              <button className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-muted flex items-center gap-2">
                <Edit size={14} /> Edit
              </button>
            </Link>
            <button
              onClick={handleDelete}
              className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-red-500/10 text-red-600 flex items-center gap-2"
            >
              <Trash2 size={14} /> Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default function ManagerProjectsPage() {
  const [approvedOrg, setApprovedOrg] = useState<ManagerOrgRequest | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    try {
      const reqsRes = await managerOrganization.getMyRequests();
      const approved = reqsRes.requests?.find(r => r.status === "APPROVED");
      
      if (approved) {
        setApprovedOrg(approved);
        const projRes = await managerProjects.getMyProjects(approved.org_id);
        setProjects(projRes.projects || []);
      }
    } catch (err) {
      console.error("Failed to fetch:", err);
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

  if (!approvedOrg) {
    return (
      <div className="text-center py-12">
        <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-xl font-bold text-foreground">Not Approved</h2>
        <p className="text-muted-foreground mt-2">Join an organization first to manage projects.</p>
        <Link href="/manager">
          <Button className="mt-4">Go to Dashboard</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 pt-12 md:pt-0">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/manager">
            <Button variant="outline" size="sm">
              <ArrowLeft size={16} className="mr-2" /> Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-foreground uppercase italic">
              My <span className="text-primary">Projects</span>
            </h1>
            <p className="text-muted-foreground mt-1">{approvedOrg.org_name}</p>
          </div>
        </div>
        <Link href="/manager/projects/new">
          <Button>
            <Plus size={16} className="mr-2" /> Create Project
          </Button>
        </Link>
      </div>

      {/* Projects Grid */}
      {projects.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-12 text-center">
          <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-bold text-foreground">No Projects Yet</h3>
          <p className="text-muted-foreground mt-2 mb-4">
            Create your first project to get started.
          </p>
          <Link href="/manager/projects/new">
            <Button><Plus size={16} className="mr-2" /> Create Project</Button>
          </Link>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <div
              key={project.id}
              className="bg-card border border-border rounded-2xl p-6 hover:border-primary/30 transition-colors"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                  <Building2 size={24} />
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold px-3 py-1 rounded-lg border ${statusColors[project.status]}`}>
                    {project.status}
                  </span>
                  <ProjectActions 
                    project={project} 
                    organizationId={approvedOrg.org_id}
                    onStatusChange={fetchData}
                    onDelete={fetchData}
                  />
                </div>
              </div>
              
              <h4 className="text-lg font-bold text-foreground mb-3">{project.name}</h4>
              
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <MapPin size={14} />
                  <span className="truncate">{project.location_text}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar size={14} />
                  <span>{new Date(project.start_date).toLocaleDateString()} - {new Date(project.end_date).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign size={14} />
                  <span>₹{project.budget?.toLocaleString() || "N/A"}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
