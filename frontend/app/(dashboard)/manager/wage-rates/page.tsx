"use client";

import { useEffect, useState } from "react";
import { DollarSign, Loader2, ArrowLeft, Plus, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { managerWageRates, managerProjects, Project, WageRate } from "@/lib/api/manager"; // Assuming managerWageRates is already exported
import { managerOrganization } from "@/lib/api/manager";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function ManagerWageRatesPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [rates, setRates] = useState<WageRate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingRates, setLoadingRates] = useState(false);

  // Create form state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newRate, setNewRate] = useState({ skill_type: "", hourly_rate: "" });
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      fetchRates(selectedProject);
    }
  }, [selectedProject]);

  const fetchInitialData = async () => {
    try {
      setIsLoading(true);
      const orgRes = await managerOrganization.getMyOrganizations();
      if (orgRes.organizations && orgRes.organizations.length > 0) {
        const orgId = orgRes.organizations[0].id;
        const res = await managerProjects.getMyProjects(orgId);
        setProjects(res.projects || []);
        if (res.projects.length > 0) {
          setSelectedProject(res.projects[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to fetch data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRates = async (projectId: string) => {
    try {
      setLoadingRates(true);
      const res = await managerWageRates.getAll(projectId);
      setRates(res.wage_rates || []);
    } catch (err) {
      console.error("Failed to fetch rates:", err);
    } finally {
      setLoadingRates(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject) return;

    try {
      setIsCreating(true);
      await managerWageRates.create({
        project_id: selectedProject,
        skill_type: newRate.skill_type,
        category: "GENERAL", // Default category or could be added to form
        hourly_rate: Number(newRate.hourly_rate)
      });
      setIsCreateOpen(false);
      setNewRate({ skill_type: "", hourly_rate: "" });
      fetchRates(selectedProject);
      toast.success("Wage rate added");
    } catch (err) {
      console.error("Failed to create rate:", err);
      toast.error("Failed to create wage rate");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this wage rate?")) return;
    try {
      await managerWageRates.delete(id);
      setRates(prev => prev.filter(r => r.id !== id));
      toast.success("Rate deleted");
    } catch (err) {
      console.error("Failed to delete;", err);
      toast.error("Failed to delete rate");
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
    <div className="space-y-8 pt-12 md:pt-0">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/manager">
            <Button variant="outline" size="sm">
              <ArrowLeft size={16} className="mr-2" /> Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-foreground uppercase italic">
              Wage <span className="text-primary">Rates</span>
            </h1>
            <p className="text-muted-foreground mt-1">
              Configure hourly rates for labour skills
            </p>
          </div>
        </div>

        {projects.length > 0 && selectedProject && (
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus size={16} className="mr-2" /> Add Wage Rate
              </Button>
            </DialogTrigger>
            <DialogContent>
               <DialogHeader>
                 <DialogTitle>Add New Wage Rate</DialogTitle>
               </DialogHeader>
               <form onSubmit={handleCreate} className="space-y-4 pt-4">
                 <div className="space-y-2">
                   <Label>Skill Type</Label>
                   <Input 
                     placeholder="e.g. Mason, Electrician" 
                     value={newRate.skill_type}
                     onChange={(e) => setNewRate(prev => ({ ...prev, skill_type: e.target.value }))}
                     required
                   />
                 </div>
                 <div className="space-y-2">
                   <Label>Hourly Rate (₹)</Label>
                   <Input 
                     type="number"
                     placeholder="0.00" 
                     value={newRate.hourly_rate}
                     onChange={(e) => setNewRate(prev => ({ ...prev, hourly_rate: e.target.value }))}
                     required
                   />
                 </div>
                 <Button className="w-full" type="submit" disabled={isCreating}>
                   {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                   Add Rate
                 </Button>
               </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-12 bg-muted/20 rounded-xl">
           <p className="text-muted-foreground">No projects assigned.</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="w-full md:w-[300px]">
             <Label className="mb-2 block">Select Project</Label>
             <Select value={selectedProject} onValueChange={setSelectedProject}>
               <SelectTrigger>
                 <SelectValue />
               </SelectTrigger>
               <SelectContent>
                 {projects.map((p) => (
                   <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                 ))}
               </SelectContent>
             </Select>
          </div>

          <div className="bg-card border border-border rounded-xl overflow-hidden">
            {loadingRates ? (
              <div className="p-12 flex justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : rates.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">
                <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No wage rates configured for this project.</p>
                <p className="text-sm">Add rates to calculate labour costs automatically.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 border-b">
                     <tr>
                       <th className="py-3 px-4 text-left font-semibold">Skill Type</th>
                       <th className="py-3 px-4 text-left font-semibold">Category</th>
                       <th className="py-3 px-4 text-right font-semibold">Hourly Rate</th>
                       <th className="py-3 px-4 text-right">Actions</th>
                     </tr>
                  </thead>
                  <tbody>
                    {rates.map((rate) => (
                      <tr key={rate.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                        <td className="py-3 px-4 font-medium">{rate.skill_type}</td>
                        <td className="py-3 px-4 text-muted-foreground">{rate.category}</td>
                        <td className="py-3 px-4 text-right font-mono font-bold">₹{rate.hourly_rate}</td>
                        <td className="py-3 px-4 text-right">
                           <Button variant="ghost" size="sm" onClick={() => handleDelete(rate.id)} className="text-red-500 hover:text-red-600 hover:bg-red-500/10">
                              <Trash2 size={16} />
                           </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
