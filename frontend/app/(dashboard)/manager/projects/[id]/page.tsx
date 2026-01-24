"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { managerProjects, Project, managerOrganization } from "@/lib/api/manager";
import { ProjectDetailView } from "@/components/dashboard/ProjectDetailView";

export default function ManagerProjectDetailPage() {
  const params = useParams();
  const projectId = params.id as string;
  
  const [project, setProject] = useState<Project | null>(null);
  const [isCreator, setIsCreator] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProject = async () => {
      try {
        setIsLoading(true);
        // First get organization ID
        const reqsRes = await managerOrganization.getMyRequests();
        const approved = reqsRes.requests?.find(r => r.status === "APPROVED");
        
        if (!approved) {
          setError("No approved organization found");
          return;
        }

        // Fetch from my-projects to get is_creator info
        const myProjectsRes = await managerProjects.getMyProjects(approved.org_id);
        const foundProject = myProjectsRes.projects?.find(p => p.id === projectId);
        
        if (foundProject) {
          setProject(foundProject);
          setIsCreator(foundProject.is_creator ?? false);
        } else {
          // Fallback to getById if not in my-projects (shouldn't happen normally)
          const res = await managerProjects.getById(projectId, approved.org_id);
          setProject(res.project);
          setIsCreator(false);
        }
      } catch (err) {
        console.error("Failed to fetch project:", err);
        setError("Failed to load project details");
      } finally {
        setIsLoading(false);
      }
    };

    if (projectId) fetchProject();
  }, [projectId]);

  return (
    <div className="pt-12 md:pt-0">
      <ProjectDetailView
        project={project}
        isLoading={isLoading}
        error={error}
        backHref="/manager/projects"
        editHref={`/manager/projects/${projectId}/edit`}
        showEdit={isCreator}
        userRole="manager"
        isCreator={isCreator}
      />
    </div>
  );
}
