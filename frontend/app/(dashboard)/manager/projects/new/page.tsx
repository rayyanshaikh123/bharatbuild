"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { managerOrganization, managerProjects, ManagerOrgRequest, CreateProjectData } from "@/lib/api/manager";
import { ProjectsMap } from "@/components/maps/ProjectsMap";

export default function CreateProjectPage() {
  const router = useRouter();
  const [approvedOrg, setApprovedOrg] = useState<ManagerOrgRequest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    location_text: "",
    latitude: "20.5937", // Default to India center or similar
    longitude: "78.9629",
    geofence_radius: "100",
    start_date: "",
    end_date: "",
    budget: "",
    status: "PLANNED" as const,
    geofence: null as any,
  });

  useEffect(() => {
    const checkOrg = async () => {
      try {
        const reqsRes = await managerOrganization.getMyRequests();
        const approved = reqsRes.requests?.find(r => r.status === "APPROVED");
        if (approved) {
          setApprovedOrg(approved);
        }
      } catch (err) {
        console.error("Failed to fetch:", err);
      } finally {
        setIsLoading(false);
      }
    };
    checkOrg();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!approvedOrg) return;

    setIsSubmitting(true);
    setError("");

    try {
      const data: CreateProjectData = {
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
        geofence: formData.geofence,
      };

      await managerProjects.create(data);
      router.push("/manager/projects");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create project");
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
        <p className="text-muted-foreground">Join an organization first.</p>
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
            Create <span className="text-primary">Project</span>
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
              <MapPin size={14} /> Location & Boundaries
            </label>
            <Input
              name="location_text"
              value={formData.location_text}
              onChange={handleChange}
              placeholder="Site address (e.g. 123 Main St)"
              required
              className="mb-2"
            />
            {/* Map Preview for Drawing */}
            <div className="h-[400px] w-full rounded-xl overflow-hidden border border-border mt-2">
              <ProjectsMap 
                projects={[{
                  id: "new",
                  name: formData.name || "New Project",
                  latitude: parseFloat(formData.latitude) || 20.5937,
                  longitude: parseFloat(formData.longitude) || 78.9629,
                  status: formData.status,
                  geofence_radius: parseInt(formData.geofence_radius) || 100,
                  geofence: formData.geofence
                }]}
                height="100%"
                showRadius={true}
                enableDraw={true}
                onGeofenceChange={(geo) => setFormData(prev => ({ ...prev, geofence: geo }))}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Use the draw tools on the left of the map to define the precise site boundary.
            </p>
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
          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : "Create Project"}
          </Button>
        </form>
      </div>
    </div>
  );
}
