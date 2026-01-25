"use client";

import { useEffect, useState } from "react";
import { Clock, Loader2, ArrowLeft, Save, Info } from "lucide-react";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { managerWorkingHours, managerProjects, Project } from "@/lib/api/manager";
import { managerOrganization } from "@/lib/api/manager";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function ManagerWorkingHoursPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [hours, setHours] = useState<{ check_in_time: string; check_out_time: string }>({
    check_in_time: "09:00",
    check_out_time: "18:00"
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadingHours, setLoadingHours] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      fetchHours(selectedProject);
    }
  }, [selectedProject]);

  const fetchProjects = async () => {
    try {
      setIsLoading(true);
      const orgRes = await managerOrganization.getMyOrganizations();
      if (orgRes.organizations && orgRes.organizations.length > 0) {
        const orgId = orgRes.organizations[0].id;
        const res = await managerProjects.getMyProjects(orgId);
        // Sort: created by me first?
        const myProjects = res.projects || [];
        setProjects(myProjects);
        if (myProjects.length > 0) {
          setSelectedProject(myProjects[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to fetch projects:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchHours = async (projectId: string) => {
    try {
      setLoadingHours(true);
      const res = await managerWorkingHours.get(projectId);
      if (res.working_hours) {
        setHours({
          check_in_time: res.working_hours.check_in_time || "09:00",
          check_out_time: res.working_hours.check_out_time || "18:00"
        });
      }
    } catch (err) {
      console.error("Failed to fetch working hours:", err);
    } finally {
      setLoadingHours(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject) return;

    try {
      setIsSaving(true);
      await managerWorkingHours.update(selectedProject, hours);
      toast.success("Working hours updated successfully");
    } catch (err: any) {
      console.error("Update failed:", err);
      toast.error(err.response?.data?.error || "Failed to update working hours");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pt-12 md:pt-0 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/manager">
          <Button variant="outline" size="sm">
            <ArrowLeft size={16} className="mr-2" /> Back
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-black tracking-tight text-foreground uppercase italic">
            Working <span className="text-primary">Hours</span>
          </h1>
          <p className="text-muted-foreground mt-1">
            Configure check-in and check-out times for your projects
          </p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
        {/* Project Selector */}
        <div className="mb-8">
           <Label className="mb-2 block">Select Project</Label>
           {projects.length > 0 ? (
             <Select value={selectedProject} onValueChange={setSelectedProject}>
               <SelectTrigger className="w-full md:w-[300px]">
                 <SelectValue />
               </SelectTrigger>
               <SelectContent>
                 {projects.map((p) => (
                   <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                 ))}
               </SelectContent>
             </Select>
           ) : (
             <div className="text-muted-foreground italic p-2 border rounded bg-muted/20">
               No projects found. Create a project first.
             </div>
           )}
        </div>

        {loadingHours ? (
          <div className="py-12 flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-8">
               <div className="space-y-2">
                 <Label className="flex items-center gap-2">
                   <Clock size={16} className="text-green-600" /> Check In Time
                 </Label>
                 <Input 
                   type="time" 
                   value={hours.check_in_time}
                   onChange={(e) => setHours(prev => ({ ...prev, check_in_time: e.target.value }))}
                   required
                   className="text-lg p-3 h-12"
                 />
                 <p className="text-xs text-muted-foreground">Standard start time for site operations</p>
               </div>

               <div className="space-y-2">
                 <Label className="flex items-center gap-2">
                   <Clock size={16} className="text-red-600" /> Check Out Time
                 </Label>
                 <Input 
                   type="time" 
                   value={hours.check_out_time}
                   onChange={(e) => setHours(prev => ({ ...prev, check_out_time: e.target.value }))}
                   required
                   className="text-lg p-3 h-12"
                 />
                 <p className="text-xs text-muted-foreground">Cannot exceed 18:00 (6:00 PM)</p>
               </div>
            </div>

            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 flex gap-3 text-sm text-yellow-700">
               <Info className="shrink-0 mt-0.5" size={18} />
               <div>
                 <p className="font-semibold mb-1">Important Note</p>
                 <p>Only the Project Creator can modify these settings. Changes will affect attendance calculations immediately.</p>
               </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button type="submit" size="lg" disabled={isSaving || !selectedProject}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2" size={18} />}
                Save Configuration
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
