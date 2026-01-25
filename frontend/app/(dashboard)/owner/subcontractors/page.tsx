"use client";

import { useEffect, useState } from "react";
import { Users, Loader2, ArrowLeft, Star, Briefcase, Clock, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { 
  ownerSubcontractors, 
  ownerOrganization, 
  Subcontractor, 
  SubcontractorPerformance,
  Organization
} from "@/lib/api/owner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export default function OwnerSubcontractorsPage() {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [subcontractors, setSubcontractors] = useState<Subcontractor[]>([]);
  const [selectedSub, setSelectedSub] = useState<string | null>(null);
  const [performance, setPerformance] = useState<SubcontractorPerformance | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingPerf, setIsLoadingPerf] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // New subcontractor form state
  const [formData, setFormData] = useState({
    name: "",
    specialization: "",
    contact_name: "",
    contact_phone: "",
    contact_email: ""
  });

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const orgRes = await ownerOrganization.getAll();
      if (orgRes.organizations && orgRes.organizations.length > 0) {
        const org = orgRes.organizations[0];
        setOrganization(org);
        const subRes = await ownerSubcontractors.getAll(org.id);
        setSubcontractors(subRes.subcontractors || []);
      }
    } catch (err) {
      console.error("Failed to fetch subcontractors:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization) return;

    try {
      setIsCreating(true);
      await ownerSubcontractors.create({
        org_id: organization.id,
        ...formData
      });
      setIsCreateOpen(false);
      setFormData({
        name: "",
        specialization: "",
        contact_name: "",
        contact_phone: "",
        contact_email: ""
      });
      fetchData();
    } catch (err) {
      console.error("Failed to create subcontractor:", err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleSelectSub = async (id: string) => {
    if (selectedSub === id) {
      setSelectedSub(null);
      setPerformance(null);
      return;
    }

    setSelectedSub(id);
    try {
      setIsLoadingPerf(true);
      const res = await ownerSubcontractors.getPerformance(id);
      setPerformance(res);
    } catch (err) {
      console.error("Failed to fetch performance:", err);
    } finally {
      setIsLoadingPerf(false);
    }
  };

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
        <p className="text-muted-foreground mt-2">Create an organization first.</p>
        <Link href="/owner">
          <Button className="mt-4">Go to Dashboard</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 pt-12 md:pt-0">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/owner">
            <Button variant="outline" size="sm">
              <ArrowLeft size={16} className="mr-2" /> Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-foreground uppercase italic">
              Sub<span className="text-primary">contractors</span>
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage subcontractors and view performance
            </p>
          </div>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus size={16} className="mr-2" /> Add Subcontractor
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Subcontractor</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="name">Company Name *</Label>
                <Input
                  id="name"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Acme Construction Ltd."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="specialization">Specialization</Label>
                <Input
                  id="specialization"
                  value={formData.specialization}
                  onChange={(e) => setFormData(prev => ({ ...prev, specialization: e.target.value }))}
                  placeholder="e.g. Electrical, Plumbing"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contact_name">Contact Person</Label>
                  <Input
                    id="contact_name"
                    value={formData.contact_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, contact_name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact_phone">Phone</Label>
                  <Input
                    id="contact_phone"
                    value={formData.contact_phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, contact_phone: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact_email">Email</Label>
                <Input
                  id="contact_email"
                  type="email"
                  value={formData.contact_email}
                  onChange={(e) => setFormData(prev => ({ ...prev, contact_email: e.target.value }))}
                />
              </div>
              <div className="flex justify-end pt-4">
                <Button type="submit" disabled={isCreating}>
                  {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Subcontractor
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* List Section */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="font-bold text-foreground mb-4">All Subcontractors ({subcontractors.length})</h3>
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
              {subcontractors.map((sub) => (
                <div
                  key={sub.id}
                  onClick={() => handleSelectSub(sub.id)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    selectedSub === sub.id
                      ? "bg-primary/10 border-primary"
                      : "bg-muted/30 border-border/50 hover:bg-muted/50"
                  }`}
                >
                  <h4 className="font-bold text-foreground">{sub.name}</h4>
                  {sub.specialization && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                      <Briefcase size={12} /> {sub.specialization}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Details Section */}
        <div className="lg:col-span-2">
          {selectedSub && performance ? (
            <div className="bg-card border border-border rounded-xl p-6 space-y-6">
               <div className="flex justify-between items-start">
                 <div>
                   <h2 className="text-2xl font-bold text-foreground">{performance.subcontractor_name}</h2>
                   <div className="flex gap-4 mt-2">
                     <div className="flex items-center gap-1 text-sm text-muted-foreground">
                       <Briefcase size={14} /> Completed Tasks: <span className="text-foreground font-semibold">{performance.total_tasks_completed}</span>
                     </div>
                     <div className="flex items-center gap-1 text-sm text-muted-foreground">
                       <Building2 size={14} /> Projects: <span className="text-foreground font-semibold">{performance.projects_involved}</span>
                     </div>
                   </div>
                 </div>
               </div>

               {/* Performance Metrics */}
               <div className="grid grid-cols-2 gap-4">
                 <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-center">
                   <div className="flex items-center justify-center gap-2 text-yellow-600 mb-1">
                     <Clock size={20} />
                     <span className="font-semibold">Speed Rating</span>
                   </div>
                   <div className="text-3xl font-black text-foreground">
                     {performance.avg_speed_rating.toFixed(1)}/5.0
                   </div>
                 </div>
                 <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-center">
                   <div className="flex items-center justify-center gap-2 text-green-600 mb-1">
                     <Star size={20} />
                     <span className="font-semibold">Quality Rating</span>
                   </div>
                   <div className="text-3xl font-black text-foreground">
                     {performance.avg_quality_rating.toFixed(1)}/5.0
                   </div>
                 </div>
               </div>

               {/* Task History */}
               <div>
                 <h3 className="font-bold text-foreground mb-3">Recent Tasks</h3>
                 <div className="space-y-2">
                   {performance.task_breakdown.map((task) => (
                     <div key={task.task_id} className="p-3 bg-muted/20 rounded-lg text-sm border border-border/50">
                       <div className="flex justify-between font-semibold text-foreground">
                         <span>{task.task_name}</span>
                         <span className="text-muted-foreground text-xs">{task.project_name}</span>
                       </div>
                       <div className="flex gap-4 mt-2 text-xs">
                         {task.speed_rating && <span className="flex items-center gap-1 text-yellow-600"><Clock size={12} /> Speed: {task.speed_rating}</span>}
                         {task.quality_rating && <span className="flex items-center gap-1 text-green-600"><Star size={12} /> Quality: {task.quality_rating}</span>}
                       </div>
                     </div>
                   ))}
                   {performance.task_breakdown.length === 0 && (
                     <p className="text-muted-foreground text-sm italic">No completed tasks yet.</p>
                   )}
                 </div>
               </div>
            </div>
          ) : selectedSub && isLoadingPerf ? (
            <div className="h-full flex items-center justify-center bg-card border border-border rounded-xl">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center bg-card border border-border rounded-xl text-muted-foreground p-12">
              <Users className="h-16 w-16 mb-4 opacity-20" />
              <p>Select a subcontractor to view details & performance</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Minimal icon component to fix import error if needed
function Building2({ size, className }: { size?: number, className?: string }) {
    return <Briefcase size={size} className={className} />;
}
