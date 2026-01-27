"use client";

import { useEffect, useState } from "react";
import { Building2, MapPin, Loader2, UserPlus, Clock, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { managerProjects, managerProjectJoinRequests, Project } from "@/lib/api/manager";
import { toast } from "sonner";

export function JoinProjectList({ organizationId }: { organizationId: string }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [myRequests, setMyRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [requesting, setRequesting] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch all projects in organization AND my join requests in parallel
      const [projectsRes, requestsRes] = await Promise.all([
        managerProjects.getAllProjects(organizationId),
        managerProjectJoinRequests.getMyRequests()
      ]);

      setProjects(projectsRes.projects || []);
      setMyRequests(requestsRes.requests || []);
    } catch (err) {
      console.error("Failed to fetch data:", err);
      toast.error("Failed to load projects");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (organizationId) fetchData();
  }, [organizationId]);

  const handleJoin = async (projectId: string) => {
    setRequesting(projectId);
    try {
      await managerProjectJoinRequests.requestJoin(projectId, organizationId);
      toast.success("Join request sent!");
      fetchData(); // Refresh to update status
    } catch (err: any) {
      console.error("Failed to join project:", err);
      toast.error(err.response?.data?.error || "Failed to send join request");
    } finally {
      setRequesting(null);
    }
  };

  // Determine status for each project
  const getProjectJoinStatus = (project: Project) => {
    // If already ACTIVE or is creator
    if (project.my_status === 'ACTIVE' || project.is_creator) {
      return 'JOINED';
    }
    
    // Check pending requests
    const request = myRequests.find(r => r.project_id === project.id);
    if (request) {
      if (request.status === 'PENDING') return 'PENDING';
      if (request.status === 'REJECTED') return 'REJECTED';
    }
    
    return 'AVAILABLE';
  };

  // Filter to only show available or pending projects
  const availableProjects = projects.filter(p => {
    const status = getProjectJoinStatus(p);
    return status === 'AVAILABLE' || status === 'PENDING';
  });

  if (isLoading) {
    return <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto text-primary" /></div>;
  }

  if (availableProjects.length === 0) {
    return (
      <div className="glass-card rounded-2xl p-8 text-center text-muted-foreground">
        <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-20" />
        <p>No new projects available to join.</p>
        <p className="text-sm mt-2">You're already managing all available projects!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="glass-card rounded-xl p-4 text-center">
          <p className="text-xs text-muted-foreground">Total</p>
          <p className="text-xl font-bold">{projects.length}</p>
        </div>
        <div className="glass-card rounded-xl p-4 text-center">
          <p className="text-xs text-muted-foreground">Available</p>
          <p className="text-xl font-bold text-green-400">
            {projects.filter(p => getProjectJoinStatus(p) === 'AVAILABLE').length}
          </p>
        </div>
        <div className="glass-card rounded-xl p-4 text-center">
          <p className="text-xs text-muted-foreground">Pending</p>
          <p className="text-xl font-bold text-amber-400">
            {projects.filter(p => getProjectJoinStatus(p) === 'PENDING').length}
          </p>
        </div>
      </div>

      {/* Project Cards */}
      <div className="grid md:grid-cols-2 gap-4">
        {availableProjects.map((project) => {
          const joinStatus = getProjectJoinStatus(project);
          
          return (
            <div key={project.id} className="glass-card rounded-2xl p-4 flex items-center justify-between group hover:border-primary/30 transition-all">
              <div className="flex-1 min-w-0 mr-4">
                <h4 className="font-bold text-foreground truncate">{project.name}</h4>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                  <MapPin size={12} />
                  <span className="truncate">{project.location_text}</span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                    project.status === 'ACTIVE' ? 'bg-green-500/20 text-green-400' :
                    project.status === 'PLANNED' ? 'bg-blue-500/20 text-blue-400' :
                    'bg-secondary text-secondary-foreground'
                  }`}>
                    {project.status}
                  </span>
                  
                  {joinStatus === 'PENDING' && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 flex items-center gap-1">
                      <Clock size={10} />
                      Request Pending
                    </span>
                  )}
                </div>
              </div>
              
              {joinStatus === 'AVAILABLE' ? (
                <Button 
                  size="sm" 
                  disabled={requesting === project.id}
                  onClick={() => handleJoin(project.id)}
                  className="shrink-0 gap-2"
                >
                  {requesting === project.id ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <UserPlus size={16} />
                  )}
                  Request Join
                </Button>
              ) : (
                <Button size="sm" variant="outline" disabled className="shrink-0 gap-2">
                  <Clock size={16} />
                  Pending
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
