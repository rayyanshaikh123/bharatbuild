"use client";

import { useEffect, useState } from "react";
import { User, Loader2, ArrowLeft, LogOut, Building2, Mail, Phone, Shield } from "lucide-react";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { purchaseManagerProfile, purchaseManagerOrganization } from "@/lib/api/purchase-manager";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";

export default function PurchaseManagerProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [organization, setOrganization] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [profileRes, orgRes] = await Promise.all([
          purchaseManagerProfile.get(),
          purchaseManagerOrganization.getMyOrganizations()
        ]);
        
        setProfile(profileRes.purchase_manager);
        if (orgRes.organizations && orgRes.organizations.length > 0) {
          setOrganization(orgRes.organizations[0]);
        }
      } catch (err) {
        console.error("Failed to fetch profile:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleLeaveOrganization = async () => {
    try {
      setIsLeaving(true);
      await purchaseManagerOrganization.leave();
      toast.success("You have left the organization");
      router.push("/po-manager/organization"); 
    } catch (err: any) {
      console.error("Failed to leave:", err);
      toast.error(err.response?.data?.error || "Failed to leave organization");
    } finally {
      setIsLeaving(false);
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
    <div className="space-y-8 pt-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/po-manager">
          <Button variant="outline" size="sm">
            <ArrowLeft size={16} className="mr-2" /> Back
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-black tracking-tight text-foreground uppercase italic">
            My <span className="text-primary">Profile</span>
          </h1>
        </div>
      </div>

      {/* Profile Card */}
      <div className="bg-card border border-border rounded-2xl p-8 space-y-6">
         <div className="flex items-center gap-6">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center text-primary">
               <User size={36} />
            </div>
            <div>
               <h2 className="text-2xl font-bold text-foreground">{profile?.name || "Purchase Manager"}</h2>
               <div className="flex flex-col gap-1 text-muted-foreground mt-1">
                 <span className="flex items-center gap-2 text-sm"><Mail size={14} /> {profile?.email}</span>
                 <span className="flex items-center gap-2 text-sm"><Phone size={14} /> {profile?.phone}</span>
                 <span className="flex items-center gap-2 text-sm"><Shield size={14} /> Role: {profile?.role}</span>
               </div>
            </div>
         </div>

         <div className="border-t border-border/50 pt-6">
            <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
              <Building2 size={18} /> Organization Status
            </h3>
            
            {organization ? (
              <div className="bg-muted/30 p-4 rounded-xl border border-border/50">
                 <div className="flex justify-between items-center">
                    <div>
                      <p className="font-bold text-foreground text-lg">{organization.org_name || "Unknown Org"}</p>
                      <p className="text-xs text-muted-foreground">{organization.org_address}</p>
                    </div>
                    <div className="px-3 py-1 bg-green-500/10 text-green-600 rounded-full text-xs font-bold uppercase">
                      Active Member
                    </div>
                 </div>

                 <div className="mt-6 pt-4 border-t border-border/50">
                    <Dialog>
                       <DialogTrigger asChild>
                         <Button variant="destructive" className="w-full sm:w-auto">
                            <LogOut size={16} className="mr-2" /> Leave Organization
                         </Button>
                       </DialogTrigger>
                       <DialogContent>
                          <DialogHeader>
                            <DialogTitle className="text-destructive">Leave Organization?</DialogTitle>
                            <DialogDescription>
                              Are you sure you want to leave <strong>{organization.org_name}</strong>?
                              <br/><br/>
                              This action will:
                              <ul className="list-disc pl-5 mt-2 space-y-1">
                                <li>Remove you from all assigned projects</li>
                                <li>Revoke your access to organization data</li>
                              </ul>
                            </DialogDescription>
                          </DialogHeader>
                          <DialogFooter>
                             <Button 
                               variant="destructive" 
                               onClick={handleLeaveOrganization}
                               disabled={isLeaving}
                               className="w-full"
                             >
                               {isLeaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                               Yes, Leave Organization
                             </Button>
                          </DialogFooter>
                       </DialogContent>
                    </Dialog>
                 </div>
              </div>
            ) : (
              <div className="text-center py-6 bg-muted/20 rounded-xl">
                 <p className="text-muted-foreground">You are not part of any organization yet.</p>
                 <Link href="/po-manager/organization">
                    <Button variant="link" className="mt-2">Join an Organization</Button>
                 </Link>
              </div>
            )}
         </div>
      </div>
    </div>
  );
}
