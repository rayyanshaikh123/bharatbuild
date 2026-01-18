"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/providers/AuthContext";
import { Building2, MapPin, Calendar, DollarSign, Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { ownerOrganization, ownerProjects, Project, Organization } from "@/lib/api/owner";

const statusColors = {
  PLANNED: "bg-blue-500/10 text-blue-600 border-blue-500/30",
  ACTIVE: "bg-green-500/10 text-green-600 border-green-500/30",
  COMPLETED: "bg-gray-500/10 text-gray-600 border-gray-500/30",
  ON_HOLD: "bg-yellow-500/10 text-yellow-600 border-yellow-500/30",
};

export default function OwnerProjectsPage() {
  const { user } = useAuth();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // First get organization
        const orgRes = await ownerOrganization.getAll();
        if (orgRes.organizations && orgRes.organizations.length > 0) {
          const org = orgRes.organizations[0];
          setOrganization(org);
          
          // Then fetch projects
          const projRes = await ownerProjects.getAll(org.id);
          setProjects(projRes.projects || []);
        }
      } catch (err) {
        console.error("Failed to fetch data:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="text-center py-12">
        <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-xl font-bold text-foreground">No Organization</h2>
        <p className="text-muted-foreground mt-2">Create an organization first to view projects.</p>
        <Link href="/owner">
          <Button className="mt-4">Go to Dashboard</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 pt-12 md:pt-0">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/owner">
          <Button variant="outline" size="sm">
            <ArrowLeft size={16} className="mr-2" /> Back
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-black tracking-tight text-foreground uppercase italic">
            All <span className="text-primary">Projects</span>
          </h1>
          <p className="text-muted-foreground mt-1">
            View all projects in your organization
          </p>
        </div>
      </div>

      {/* Projects Grid */}
      {projects.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-12 text-center">
          <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-bold text-foreground">No Projects Yet</h3>
          <p className="text-muted-foreground mt-2">
            Projects created by managers will appear here.
          </p>
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
                <span className={`text-xs font-bold px-3 py-1 rounded-lg border ${statusColors[project.status]}`}>
                  {project.status}
                </span>
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
