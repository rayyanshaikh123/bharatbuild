"use client";

import { useEffect, useState } from "react";
import { Building2, MapPin, Calendar, DollarSign, Loader2, ArrowLeft, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { managerOrganization, managerProjects, Project, ManagerOrgRequest } from "@/lib/api/manager";

const statusColors = {
  PLANNED: "bg-blue-500/10 text-blue-600 border-blue-500/30",
  ACTIVE: "bg-green-500/10 text-green-600 border-green-500/30",
  COMPLETED: "bg-gray-500/10 text-gray-600 border-gray-500/30",
  ON_HOLD: "bg-yellow-500/10 text-yellow-600 border-yellow-500/30",
};



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
        <div className="flex gap-3">
          <Link href="/manager/projects/join">
            <Button variant="outline">Join Project</Button>
          </Link>
          <Link href="/manager/projects/new">
            <Button>
              <Plus size={16} className="mr-2" /> Create Project
            </Button>
          </Link>
        </div>
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
                  <Link href={`/manager/projects/${project.id}`}>
                    <Button size="sm" variant="outline" className="h-8">Open</Button>
                  </Link>
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
