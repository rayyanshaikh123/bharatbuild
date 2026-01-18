"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Loader2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { managerOrganization, managerProjects, ManagerOrgRequest, Project } from "@/lib/api/manager";

export default function EditProjectPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;

  const [approvedOrg, setApprovedOrg] = useState<ManagerOrgRequest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    location_text: "",
    latitude: "",
    longitude: "",
    geofence_radius: "",
    start_date: "",
    end_date: "",
    budget: "",
    status: "PLANNED" as Project["status"],
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const reqsRes = await managerOrganization.getMyRequests();
        const approved = reqsRes.requests?.find(r => r.status === "APPROVED");
        
        if (approved) {
          setApprovedOrg(approved);
          
          // Fetch project details
          const projRes = await managerProjects.getById(projectId, approved.org_id);
          const project = projRes.project;
          
          if (project) {
            setFormData({
              name: project.name || "",
              location_text: project.location_text || "",
              latitude: project.latitude?.toString() || "",
              longitude: project.longitude?.toString() || "",
              geofence_radius: project.geofence_radius?.toString() || "100",
              start_date: project.start_date ? project.start_date.split("T")[0] : "",
              end_date: project.end_date ? project.end_date.split("T")[0] : "",
              budget: project.budget?.toString() || "",
              status: project.status || "PLANNED",
            });
          }
        }
      } catch (err) {
        console.error("Failed to fetch:", err);
        setError("Failed to load project");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [projectId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!approvedOrg) return;

    setIsSubmitting(true);
    setError("");

    try {
      await managerProjects.update(projectId, {
        organizationId: approvedOrg.org_id,
        name: formData.name,
        location_text: formData.location_text,
        latitude: parseFloat(formData.latitude) || 0,
        longitude: parseFloat(formData.longitude) || 0,
        geofence_radius: parseInt(formData.geofence_radius) || 100,
        start_date: formData.start_date,
        end_date: formData.end_date,
        budget: parseFloat(formData.budget) || 0,
        status: formData.status,
      });

      router.push("/manager/projects");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update project");
    } finally {
      setIsSubmitting(false);
    }
  };

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
        <p className="text-muted-foreground">Not authorized.</p>
        <Link href="/manager">
          <Button className="mt-4">Go to Dashboard</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 pt-12 md:pt-0 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/manager/projects">
          <Button variant="outline" size="sm">
            <ArrowLeft size={16} className="mr-2" /> Back
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-black tracking-tight text-foreground uppercase italic">
            Edit <span className="text-primary">Project</span>
          </h1>
          <p className="text-muted-foreground mt-1">{approvedOrg.org_name}</p>
        </div>
      </div>

      {/* Form */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Project Name */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-foreground">Project Name</label>
            <Input
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g., Building A Construction"
              required
            />
          </div>

          {/* Location */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-foreground flex items-center gap-2">
              <MapPin size={14} /> Location
            </label>
            <Input
              name="location_text"
              value={formData.location_text}
              onChange={handleChange}
              placeholder="Site address"
              required
            />
          </div>

          {/* Coordinates */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-foreground">Latitude</label>
              <Input
                name="latitude"
                type="number"
                step="any"
                value={formData.latitude}
                onChange={handleChange}
                placeholder="19.0760"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-foreground">Longitude</label>
              <Input
                name="longitude"
                type="number"
                step="any"
                value={formData.longitude}
                onChange={handleChange}
                placeholder="72.8777"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-foreground">Geofence (m)</label>
              <Input
                name="geofence_radius"
                type="number"
                value={formData.geofence_radius}
                onChange={handleChange}
                placeholder="100"
              />
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-foreground">Start Date</label>
              <Input
                name="start_date"
                type="date"
                value={formData.start_date}
                onChange={handleChange}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-foreground">End Date</label>
              <Input
                name="end_date"
                type="date"
                value={formData.end_date}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          {/* Budget & Status */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-foreground">Budget (₹)</label>
              <Input
                name="budget"
                type="number"
                value={formData.budget}
                onChange={handleChange}
                placeholder="1000000"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-foreground">Status</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full h-10 px-3 rounded-md border border-border bg-background text-foreground"
              >
                <option value="PLANNED">Planned</option>
                <option value="ACTIVE">Active</option>
                <option value="ON_HOLD">On Hold</option>
                <option value="COMPLETED">Completed</option>
              </select>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-xl">
              <p className="text-destructive text-sm font-medium">{error}</p>
            </div>
          )}

          {/* Submit */}
          <div className="flex gap-3">
            <Link href="/manager/projects" className="flex-1">
              <Button type="button" variant="outline" className="w-full">
                Cancel
              </Button>
            </Link>
            <Button type="submit" disabled={isSubmitting} className="flex-1">
              {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : "Save Changes"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
