"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Users, Search, Phone, Mail, User, Briefcase, Building } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { managerOrganization, managerSubcontractors, ManagerOrgRequest, Subcontractor } from "@/lib/api/manager";
import { toast } from "sonner";
import { createPortal } from "react-dom";

export default function SubcontractorsPage() {
  const router = useRouter();
  const [approvedOrg, setApprovedOrg] = useState<ManagerOrgRequest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [subcontractors, setSubcontractors] = useState<Subcontractor[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  
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

  // Extend Subcontractor type locally since api lib might not update instantly or we want to type hint better
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

  const filteredSubcontractors = subcontractors.filter(sub => 
    sub.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    sub.specialization?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    sub.contact_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

      {/* Search & List */}
      <div className="space-y-6">
        <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            <Input 
               placeholder="Search subcontractors..." 
               className="pl-9"
               value={searchQuery}
               onChange={e => setSearchQuery(e.target.value)}
            />
        </div>

        {subcontractors.length === 0 ? (
           <div className="text-center py-12 bg-muted/20 rounded-2xl border border-dashed border-border">
              <Users className="mx-auto h-12 w-12 text-muted-foreground opacity-50 mb-4" />
              <h3 className="text-lg font-bold">No Subcontractors Found</h3>
              <p className="text-muted-foreground mb-4">Add your first subcontractor to start assigning tasks.</p>
              <Button onClick={() => setShowAddModal(true)} variant="outline">Add New</Button>
           </div>
        ) : filteredSubcontractors.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No results found for "{searchQuery}"</p>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredSubcontractors.map(sub => (
                    <div key={sub.id} className="glass-card p-6 rounded-2xl hover:border-primary/30 transition-all group">
                         <div className="flex items-start justify-between mb-4">
                             <div className="w-12 h-12 rounded-xl bg-orange-500/10 text-orange-600 flex items-center justify-center">
                                 <Briefcase size={24} />
                             </div>
                             {/* Actions could go here */}
                         </div>
                         
                         <h3 className="text-lg font-bold mb-1 group-hover:text-primary transition-colors">{sub.name}</h3>
                         {sub.specialization && (
                             <span className="inline-block px-2 py-0.5 rounded-full bg-muted text-xs font-medium text-muted-foreground mb-4">
                                {sub.specialization}
                                {sub.specialization}
                             </span>
                         )}

                         <div className="flex gap-4 mb-4 text-sm">
                            <div className="flex flex-col">
                                <span className="text-muted-foreground text-xs uppercase font-bold">Speed</span>
                                <div className="flex items-center gap-1 font-bold text-foreground">
                                    <span>{Number((sub as ExtendedSubcontractor).avg_speed_rating || 0).toFixed(1)}</span>
                                    <span className="text-yellow-500">★</span>
                                </div>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-muted-foreground text-xs uppercase font-bold">Quality</span>
                                <div className="flex items-center gap-1 font-bold text-foreground">
                                    <span>{Number((sub as ExtendedSubcontractor).avg_quality_rating || 0).toFixed(1)}</span>
                                    <span className="text-blue-500">★</span>
                                </div>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-muted-foreground text-xs uppercase font-bold">Tasks</span>
                                <span className="font-bold text-foreground">{(sub as ExtendedSubcontractor).total_tasks_completed || 0}</span>
                            </div>
                         </div>

                         <div className="space-y-2 text-sm text-muted-foreground border-t border-border/50 pt-4 mt-2">
                             {sub.contact_name && (
                                 <div className="flex items-center gap-2">
                                     <User size={14} />
                                     <span>{sub.contact_name}</span>
                                 </div>
                             )}
                             {sub.contact_phone && (
                                 <div className="flex items-center gap-2">
                                     <Phone size={14} />
                                     <span>{sub.contact_phone}</span>
                                 </div>
                             )}
                             {sub.contact_email && (
                                 <div className="flex items-center gap-2">
                                     <Mail size={14} />
                                     <span className="truncate">{sub.contact_email}</span>
                                 </div>
                             )}
                         </div>
                         
                         <Link href={`/manager/subcontractors/${sub.id}`} className="hidden">
                             {/* Future: Detail Page */}
                             <Button variant="ghost" className="w-full mt-4 text-xs h-8">View Details</Button>
                         </Link>
                    </div>
                ))}
            </div>
        )}
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
