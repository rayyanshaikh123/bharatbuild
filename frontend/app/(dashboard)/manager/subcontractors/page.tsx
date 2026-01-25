"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Users, Phone, Mail, User, Briefcase, Star, Clock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { managerOrganization, managerSubcontractors, ManagerOrgRequest, Subcontractor } from "@/lib/api/manager";
import { toast } from "sonner";
import { createPortal } from "react-dom";
import { DataTable, Column } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/badge";

export default function SubcontractorsPage() {
  const router = useRouter();
  const [approvedOrg, setApprovedOrg] = useState<ManagerOrgRequest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [subcontractors, setSubcontractors] = useState<Subcontractor[]>([]);

  // Add Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [newSub, setNewSub] = useState({
    name: "",
    specialization: "",
    contact_name: "",
    contact_phone: "",
    contact_email: ""
  });

  // Extend Subcontractor type
  interface ExtendedSubcontractor extends Subcontractor {
    avg_speed_rating?: string | number;
    avg_quality_rating?: string | number;
    total_tasks_completed?: string | number;
  }

  // Fetch Data
  const fetchData = async () => {
    try {
      setIsLoading(true);
      // 1. Get Organization
      const reqsRes = await managerOrganization.getMyRequests();
      const approved = reqsRes.requests?.find(r => r.status === "APPROVED");
      
      if (approved) {
        setApprovedOrg(approved);
        // 2. Get Subcontractors for this Org
        const subsRes = await managerSubcontractors.getAll(approved.org_id);
        setSubcontractors(subsRes.subcontractors || []);
      }
    } catch (err) {
      console.error("Failed to fetch data:", err);
      toast.error("Failed to load subcontractors");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateSubcontractor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!approvedOrg) return;
    
    if (!newSub.name) {
       toast.error("Company Name is required");
       return;
    }

    setIsAdding(true);
    try {
      await managerSubcontractors.create({
        org_id: approvedOrg.org_id,
        ...newSub
      });
      toast.success("Subcontractor added successfully");
      setShowAddModal(false);
      setNewSub({ name: "", specialization: "", contact_name: "", contact_phone: "", contact_email: "" });
      fetchData(); // Refresh list
    } catch (err) {
      console.error(err);
      toast.error("Failed to add subcontractor");
    } finally {
      setIsAdding(false);
    }
  };

  const columns: Column<ExtendedSubcontractor>[] = useMemo(() => [
    {
      key: "name",
      label: "Company",
      sortable: true,
      render: (value: string, row: ExtendedSubcontractor) => (
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
        key: "avg_speed_rating",
        label: "Performance",
        sortable: true,
        render: (_: unknown, row: ExtendedSubcontractor) => (
             <div className="flex gap-4">
                 <div className="flex flex-col items-center">
                     <span className="text-[10px] text-muted-foreground uppercase font-bold">Speed</span>
                     <div className="flex items-center gap-1 font-bold">
                         <span>{Number(row.avg_speed_rating || 0).toFixed(1)}</span>
                         <Star size={10} className="fill-yellow-500 text-yellow-500" />
                     </div>
                 </div>
                 <div className="flex flex-col items-center">
                     <span className="text-[10px] text-muted-foreground uppercase font-bold">Quality</span>
                     <div className="flex items-center gap-1 font-bold">
                         <span>{Number(row.avg_quality_rating || 0).toFixed(1)}</span>
                         <Star size={10} className="fill-blue-500 text-blue-500" />
                     </div>
                 </div>
             </div>
        )
    },
    {
        key: "total_tasks_completed",
        label: "Tasks",
        sortable: true,
        width: "100px",
        render: (value: number) => (
             <Badge variant="secondary" className="font-mono">
                 {value || 0}
             </Badge>
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
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-foreground uppercase italic">
            Sub<span className="text-primary">contractors</span>
          </h1>
          <p className="text-muted-foreground mt-1">Manage external partners and vendors for {approvedOrg.org_name}</p>
        </div>
        <Button onClick={() => setShowAddModal(true)} className="gap-2">
          <Plus size={18} />
          Add Subcontractor
        </Button>
      </div>

       <div className="space-y-6">
          <DataTable 
             data={subcontractors as ExtendedSubcontractor[]} 
             columns={columns} 
             searchable 
             searchKeys={["name", "specialization", "contact_name"]}
             itemsPerPage={10}
             emptyMessage="No subcontractors found."
          />
       </div>

      {/* Add Modal */}
      {showAddModal && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[9999]" onClick={(e) => {
            if (e.target === e.currentTarget) setShowAddModal(false);
        }}>
           <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-lg shadow-2xl animate-in fade-in zoom-in-95 duration-200">
               <h2 className="text-xl font-bold mb-4">Add Subcontractor</h2>
               <form onSubmit={handleCreateSubcontractor} className="space-y-4">
                   <div className="space-y-2">
                       <label className="text-sm font-bold">Company / Partner Name *</label>
                       <Input 
                          value={newSub.name}
                          onChange={e => setNewSub({...newSub, name: e.target.value})}
                          placeholder="e.g. Acme Construction Services" 
                          required 
                       />
                   </div>
                   
                   <div className="space-y-2">
                       <label className="text-sm font-bold">Specialization</label>
                       <Input 
                          value={newSub.specialization}
                          onChange={e => setNewSub({...newSub, specialization: e.target.value})}
                          placeholder="e.g. Electrical, Plumbing, HVAC" 
                       />
                   </div>

                   <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-2">
                           <label className="text-sm font-bold">Contact Person</label>
                           <Input 
                              value={newSub.contact_name}
                              onChange={e => setNewSub({...newSub, contact_name: e.target.value})}
                              placeholder="Name" 
                           />
                       </div>
                       <div className="space-y-2">
                           <label className="text-sm font-bold">Phone</label>
                           <Input 
                              value={newSub.contact_phone}
                              onChange={e => setNewSub({...newSub, contact_phone: e.target.value})}
                              placeholder="+91..." 
                           />
                       </div>
                   </div>

                   <div className="space-y-2">
                       <label className="text-sm font-bold">Email</label>
                       <Input 
                          type="email"
                          value={newSub.contact_email}
                          onChange={e => setNewSub({...newSub, contact_email: e.target.value})}
                          placeholder="email@example.com" 
                       />
                   </div>

                   <div className="pt-4 flex gap-3">
                       <Button type="button" variant="outline" className="flex-1" onClick={() => setShowAddModal(false)}>Cancel</Button>
                       <Button type="submit" className="flex-1" disabled={isAdding}>
                           {isAdding ? <Loader2 className="animate-spin" /> : "Create Subcontractor"}
                       </Button>
                   </div>
               </form>
           </div>
        </div>,
        document.body
      )}
    </div>
  );
}
