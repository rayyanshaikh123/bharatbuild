"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ownerProjects, Project, ownerOrganization } from "@/lib/api/owner";
import { ProjectDetailView } from "@/components/dashboard/ProjectDetailView";

export default function OwnerProjectDetailPage() {
  const params = useParams();
  const projectId = params.id as string;
  
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProject = async () => {
      try {
        setIsLoading(true);
        // First get organization
        const orgRes = await ownerOrganization.get();
        
        if (!orgRes.organization) {
          setError("No organization found");
          return;
        }

        const res = await ownerProjects.getById(projectId, orgRes.organization.id);
        setProject(res.project);
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
        backHref="/owner/projects"
        showEdit={false}
        userRole="owner"
      />
    </div>
  );
}
