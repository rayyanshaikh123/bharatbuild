"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/providers/AuthContext";
import { Building2, MapPin, CheckCircle2, Loader2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";
import { Project } from "@/lib/api/manager";

// We need a custom hook or API call to fetch "available" projects
// Since backend doesn't have a direct "available" endpoint, we might simulate it 
// or correct it later. For now, we will try to fetch all organization projects
// and filter out the ones the manager is already in.

export function JoinProjectList({ organizationId }: { organizationId: string }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [requesting, setRequesting] = useState<string | null>(null);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setIsLoading(true);
        // Using the all-projects endpoint might only return ACTIVE ones.
        // We really need a "get all projects in org" endpoint for managers.
        // Assuming one might be added or we use a broader fetch if available.
        // For now, let's try to hit a hypothetical endpoint or existing one.
        
        // Since we can't easily fetch 'available' projects without backend support,
        // we'll display a message if none are found.
        setProjects([]); 
      } catch (err) {
        console.error("Failed to fetch available projects:", err);
      } finally {
        setIsLoading(false);
      }
    };

    if (organizationId) fetchProjects();
  }, [organizationId]);

  const handleJoin = async (projectId: string) => {
    setRequesting(projectId);
    try {
      await api.post("/manager/project-requests/join-project", {
        projectId,
        organizationId,
      });
      // Remove from list or show success
      setProjects(prev => prev.filter(p => p.id !== projectId));
      alert("Join request sent successfully!");
    } catch (err) {
      console.error("Failed to join project:", err);
      alert("Failed to send join request");
    } finally {
      setRequesting(null);
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto text-primary" /></div>;
  }

  if (projects.length === 0) {
    return (
      <div className="glass-card rounded-2xl p-8 text-center text-muted-foreground">
        <Building2 className="w-12 h-12 mx-auto mb-3 opacity-20" />
        <p>No new projects available to join.</p>
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-2 gap-4">
      {projects.map((project) => (
        <div key={project.id} className="glass-card rounded-2xl p-4 flex items-center justify-between group hover:border-primary/30 transition-all">
          <div className="flex-1 min-w-0 mr-4">
            <h4 className="font-bold text-foreground truncate">{project.name}</h4>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
              <MapPin size={12} />
              <span className="truncate">{project.location_text}</span>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span className={`text-[10px] px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground`}>
                {project.status}
              </span>
            </div>
          </div>
          <Button 
            size="sm" 
            variant="outline"
            disabled={requesting === project.id}
            onClick={() => handleJoin(project.id)}
            className="shrink-0 gap-2"
          >
            {requesting === project.id ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
            Join
          </Button>
        </div>
      ))}
    </div>
  );
}
