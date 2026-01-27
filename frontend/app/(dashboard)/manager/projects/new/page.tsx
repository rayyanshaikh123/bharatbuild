"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, MapPin, Search } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { managerOrganization, managerProjects, ManagerOrgRequest, CreateProjectData } from "@/lib/api/manager";
import { ProjectsMap } from "@/components/maps/ProjectsMap";
import { toast } from "sonner"; // Assuming sonner is available based on previous files

export default function CreateProjectPage() {
  const router = useRouter();
  const [approvedOrg, setApprovedOrg] = useState<ManagerOrgRequest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    name: "",
    location_text: "",
    latitude: "20.5937", // Default to India center
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

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setSearchResults([]);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      if (data && data.length > 0) {
        setSearchResults(data);
      } else {
        toast.error("No results found");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to search location");
    } finally {
      setIsSearching(false);
    }
  };

  const selectLocation = (result: any) => {
    setFormData(prev => ({
      ...prev,
      latitude: result.lat,
      longitude: result.lon,
      location_text: result.display_name
    }));
    setSearchResults([]); // Clear results
    setSearchQuery(""); // Clear query
    toast.success(`Moved to ${result.display_name.split(",")[0]}`);
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
    <div className="space-y-8 pt-12 md:pt-0 max-w-5xl mx-auto">
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

      <div className="grid lg:grid-cols-2 gap-8">
        
        {/* Left Column: Form Details */}
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
             <h3 className="text-lg font-bold mb-4">Project Details</h3>
             
             <form id="project-form" onSubmit={handleSubmit} className="space-y-4">
                {/* Project Name */}
                <div className="space-y-2">
                  <label className="text-sm font-bold text-foreground">Project Name</label>
                  <Input
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="e.g., Downtown Office Complex"
                    required
                  />
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

                {/* Location Text Manual Entry */}
                 <div className="space-y-2">
                  <label className="text-sm font-bold text-foreground">Address / Site Details</label>
                  <Input
                    name="location_text"
                    value={formData.location_text}
                    onChange={handleChange}
                    placeholder="Manual site address entry"
                    required
                  />
                </div>

                 {/* Coordinates (Read-only/Editable) */}
                <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                        <span className="text-muted-foreground block">Lat</span>
                        <Input 
                            name="latitude" 
                            value={formData.latitude} 
                            onChange={handleChange} 
                            type="number" 
                            step="any"
                            className="h-8"
                        />
                    </div>
                    <div>
                         <span className="text-muted-foreground block">Lng</span>
                         <Input 
                            name="longitude" 
                            value={formData.longitude} 
                            onChange={handleChange} 
                            type="number" 
                            step="any"
                            className="h-8"
                        />
                    </div>
                     <div>
                         <span className="text-muted-foreground block">Radius(m)</span>
                         <Input 
                            name="geofence_radius" 
                            value={formData.geofence_radius} 
                            onChange={handleChange} 
                            type="number" 
                            className="h-8"
                        />
                    </div>
                </div>
            </form>
          </div>
          
           {error && (
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-xl">
              <p className="text-destructive text-sm font-medium">{error}</p>
            </div>
           )}

           <Button 
                type="submit" 
                form="project-form"
                disabled={isSubmitting} 
                className="w-full h-12 text-lg"
            >
              {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : "Create Project"}
           </Button>
        </div>

        {/* Right Column: Map & Location Search */}
        <div className="space-y-4">
             {/* Map Search Bar */}
             <div className="bg-card border border-border rounded-xl p-3 flex flex-col gap-2 relative z-10">
                 <form onSubmit={handleSearch} className="flex gap-2">
                     <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                        <Input 
                           value={searchQuery}
                           onChange={e => setSearchQuery(e.target.value)}
                           className="pl-9"
                           placeholder="Search map location (e.g. Mumbai)"
                        />
                     </div>
                     <Button type="submit" size="icon" disabled={isSearching}>
                        {isSearching ? <Loader2 className="animate-spin" size={16} /> : <Search size={16} />}
                     </Button>
                 </form>
                 
                 {/* Search Results Dropdown */}
                 {searchResults.length > 0 && (
                     <div className="absolute top-full left-0 right-0 mt-2 bg-popover border border-border rounded-xl shadow-xl overflow-hidden max-h-60 overflow-y-auto">
                         {searchResults.map((result, idx) => (
                             <button
                                key={idx}
                                className="w-full text-left px-4 py-2 hover:bg-muted text-sm border-b border-border/50 last:border-0 transition-colors"
                                onClick={() => selectLocation(result)}
                             >
                                 <div className="font-medium truncate">{result.display_name.split(",")[0]}</div>
                                 <div className="text-xs text-muted-foreground truncate">{result.display_name}</div>
                             </button>
                         ))}
                     </div>
                 )}
             </div>

             {/* Map Container */}
             <div className="h-[500px] w-full rounded-2xl overflow-hidden border border-border shadow-md relative">
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
                    onGeofenceChange={(geo, center, radius) => {
                      setFormData(prev => ({ 
                        ...prev, 
                        geofence: geo,
                        latitude: center ? center.lat.toFixed(6) : prev.latitude,
                        longitude: center ? center.lng.toFixed(6) : prev.longitude,
                        geofence_radius: radius ? Math.round(radius).toString() : prev.geofence_radius
                      }));
                    }}
                  />
                  <div className="absolute bottom-4 left-4 right-4 bg-background/80 backdrop-blur text-xs p-3 rounded-lg border border-border pointer-events-none">
                     <p>Use the <strong>Draw Tools</strong> (top-left of map) to draw the exact site shape. Or use Search above to jump to a city.</p>
                  </div>
            </div>
        </div>

      </div>
    </div>
  );
}
