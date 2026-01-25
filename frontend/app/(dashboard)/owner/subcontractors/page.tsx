"use client";

import { useEffect, useState, useMemo } from "react";
import { Users, Loader2, ArrowLeft, Star, Briefcase, Clock, Plus, Building2, Phone, Mail, User } from "lucide-react";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { DataTable, Column } from "@/components/ui/DataTable";

export default function OwnerSubcontractorsPage() {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [subcontractors, setSubcontractors] = useState<Subcontractor[]>([]);
  const [selectedPerformance, setSelectedPerformance] = useState<SubcontractorPerformance | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingPerf, setIsLoadingPerf] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isPerformanceOpen, setIsPerformanceOpen] = useState(false);

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

  const handleViewPerformance = async (id: string) => {
    try {
      setIsLoadingPerf(true);
      setIsPerformanceOpen(true); // Open modal immediately, show loading inside
      setSelectedPerformance(null);
      const res = await ownerSubcontractors.getPerformance(id);
      setSelectedPerformance(res);
    } catch (err) {
      console.error("Failed to fetch performance:", err);
    } finally {
      setIsLoadingPerf(false);
    }
  };

  // Define Columns
  const columns: Column<Subcontractor>[] = useMemo(() => [
    {
      key: "name",
      label: "Company",
      sortable: true,
      render: (value: string, row: Subcontractor) => (
         <div>
             <div className="font-bold flex items-center gap-2">
                 <Briefcase size={14} className="text-primary" />
                 {value}
             </div>
             {row.specialization && (
                 <div className="text-xs text-muted-foreground mt-0.5 ml-5">
                    {row.specialization}
                 </div>
             )}
         </div>
      )
    },
    {
       key: "contact_name",
       label: "Contact Person",
       sortable: true,
       render: (value: string) => (
           <div className="flex items-center gap-2">
               <User size={14} className="text-muted-foreground" />
               <span className="font-medium">{value || "-"}</span>
           </div>
       )
    },
    {
       key: "contact_phone",
       label: "Phone",
       render: (value: string) => (
           <div className="flex items-center gap-2 text-sm text-muted-foreground">
               <Phone size={14} />
               <span>{value || "-"}</span>
           </div>
       )
    },
    {
       key: "contact_email",
       label: "Email",
       render: (value: string) => (
           <div className="flex items-center gap-2 text-sm text-muted-foreground">
               <Mail size={14} />
               <span className="truncate max-w-[150px]" title={value}>{value || "-"}</span>
           </div>
       )
    },
    {
        key: "id",
        label: "Action",
        width: "140px",
        render: (_: unknown, row: Subcontractor) => (
             <Button 
                size="sm" 
                variant="outline" 
                onClick={() => handleViewPerformance(row.id)}
             >
                 View Performance
             </Button>
        )
    }
  ], []);

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

     {/* Data Table */}
      <DataTable 
          data={subcontractors} 
          columns={columns} 
          searchable 
          searchKeys={["name", "specialization", "contact_name"]}
          itemsPerPage={10}
      />

      {/* Performance Modal */}
      <Dialog open={isPerformanceOpen} onOpenChange={setIsPerformanceOpen}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                  <DialogTitle>Performance Review</DialogTitle>
                  <DialogDescription>Detailed performance metrics and history.</DialogDescription>
              </DialogHeader>
              
              {isLoadingPerf ? (
                  <div className="py-12 flex justify-center">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
              ) : selectedPerformance ? (
                  <div className="space-y-6 pt-2">
                       <div className="flex justify-between items-start">
                           <div>
                               <h2 className="text-xl font-bold text-foreground">{selectedPerformance.subcontractor_name}</h2>
                               <div className="flex gap-4 mt-2">
                                   <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                       <Briefcase size={14} /> Tasks: <span className="text-foreground font-semibold">{selectedPerformance.total_tasks_completed}</span>
                                   </div>
                                   <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                       <Building2 size={14} /> Projects: <span className="text-foreground font-semibold">{selectedPerformance.projects_involved}</span>
                                   </div>
                               </div>
                           </div>
                       </div>

                       <div className="grid grid-cols-2 gap-4">
                           <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-center">
                               <div className="flex items-center justify-center gap-2 text-yellow-600 mb-1">
                                   <Clock size={20} />
                                   <span className="font-semibold">Speed Rating</span>
                               </div>
                               <div className="text-3xl font-black text-foreground">
                                   {selectedPerformance.avg_speed_rating.toFixed(1)}/5.0
                               </div>
                           </div>
                           <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-center">
                               <div className="flex items-center justify-center gap-2 text-green-600 mb-1">
                                   <Star size={20} />
                                   <span className="font-semibold">Quality Rating</span>
                               </div>
                               <div className="text-3xl font-black text-foreground">
                                   {selectedPerformance.avg_quality_rating.toFixed(1)}/5.0
                               </div>
                           </div>
                       </div>

                       <div>
                           <h3 className="font-bold text-foreground mb-3">Task History</h3>
                           <div className="space-y-2">
                               {selectedPerformance.task_breakdown.map((task) => (
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
                               {selectedPerformance.task_breakdown.length === 0 && (
                                   <p className="text-muted-foreground text-sm italic">No completed tasks yet.</p>
                               )}
                           </div>
                       </div>
                  </div>
              ) : (
                  <div className="py-8 text-center text-muted-foreground">Failed to load performance data.</div>
              )}
          </DialogContent>
      </Dialog>
    </div>
  );
}
