"use client";

import { useEffect, useState } from "react";
import { Building2, Loader2, Plus, Search, Check, Clock, X, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  purchaseManagerOrganization,
  OrganizationListItem,
  ApprovedOrganization,
  PurchaseManagerOrgRequest
} from "@/lib/api/purchase-manager";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export default function PurchaseManagerOrganizationPage() {
  const [activeTab, setActiveTab] = useState<"my-org" | "join">("my-org");
  const [myOrgs, setMyOrgs] = useState<ApprovedOrganization[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PurchaseManagerOrgRequest[]>([]);
  const [allOrgs, setAllOrgs] = useState<OrganizationListItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState<string | null>(null);

  useEffect(() => {
    fetchMyData();
  }, []);

  useEffect(() => {
    if (activeTab === "join") {
      fetchAllOrgs();
    }
  }, [activeTab]);

  const fetchMyData = async () => {
    try {
      setIsLoading(true);
      const [orgsRes, reqsRes] = await Promise.all([
        purchaseManagerOrganization.getMyOrganizations(),
        purchaseManagerOrganization.getMyRequests()
      ]);
      setMyOrgs(orgsRes.organizations || []);
      setPendingRequests(reqsRes.requests || []);
      
      // If no orgs but attempting to join, switch to join tab
      if ((orgsRes.organizations || []).length === 0 && activeTab === "my-org") {
          // Keep on my-org to show empty state with CTA, or auto-switch?
          // Let's stay on my-org but show a nice empty state
      }
    } catch (err) {
      console.error("Failed to fetch my organization data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAllOrgs = async () => {
    try {
      const res = await purchaseManagerOrganization.getAll();
      setAllOrgs(res.organizations || []);
    } catch (err) {
      console.error("Failed to fetch all organizations:", err);
    }
  };

  const handleJoin = async (orgId: string) => {
    try {
      setIsJoining(orgId);
      await purchaseManagerOrganization.requestJoin(orgId);
      toast.success("Join request sent successfully");
      // Refresh requests
      const reqsRes = await purchaseManagerOrganization.getMyRequests();
      setPendingRequests(reqsRes.requests || []);
    } catch (err: any) {
      console.error("Failed to join:", err);
      toast.error(err.response?.data?.error || "Failed to send join request");
    } finally {
      setIsJoining(null);
    }
  };

  const filteredOrgs = allOrgs.filter(org => 
    org.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    org.address?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Check if we have a pending request for an org
  const getRequestStatus = (orgId: string) => {
    const req = pendingRequests.find(r => r.org_id === orgId);
    return req ? req.status : null;
  };

  const isAlreadyMember = (orgId: string) => {
    return myOrgs.some(o => o.org_id === orgId);
  };

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-foreground uppercase italic">
            Organization <span className="text-primary">Management</span>
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your organization membership and status
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border pb-1">
        <button
          onClick={() => setActiveTab("my-org")}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
            activeTab === "my-org"
              ? "border-b-2 border-primary text-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          My Organization
        </button>
        <button
          onClick={() => setActiveTab("join")}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
            activeTab === "join"
              ? "border-b-2 border-primary text-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Join Organization
        </button>
      </div>

      {activeTab === "my-org" ? (
        <div className="space-y-6">
          {myOrgs.length > 0 ? (
            <div className="grid md:grid-cols-2 gap-6">
              {myOrgs.map((org) => (
                <Card key={org.id} className="border-l-4 border-l-primary">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                       <Building2 className="text-primary" />
                       {org.org_name}
                    </CardTitle>
                    <CardDescription>{org.org_address}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 text-green-600 font-medium bg-green-500/10 p-2 rounded-lg w-fit">
                      <Check size={16} /> Active Member
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-muted/20 rounded-xl">
               <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
               <h3 className="text-lg font-bold mb-2">No Active Organization</h3>
               <p className="text-muted-foreground mb-4">You are not part of any organization yet.</p>
               <Button onClick={() => setActiveTab("join")}>
                 Find Organization to Join
               </Button>
            </div>
          )}

          {pendingRequests.length > 0 && (
            <div className="mt-8">
               <h3 className="text-lg font-bold mb-4">Request History</h3>
               <div className="space-y-3">
                 {pendingRequests.map((req) => (
                   <div key={req.id} className="flex items-center justify-between p-4 bg-card border border-border rounded-xl">
                     <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          req.status === "PENDING" ? "bg-yellow-500/10 text-yellow-600" :
                          req.status === "REJECTED" ? "bg-red-500/10 text-red-600" :
                          "bg-green-500/10 text-green-600"
                        }`}>
                          {req.status === "PENDING" && <Clock size={20} />}
                          {req.status === "REJECTED" && <X size={20} />}
                          {req.status === "APPROVED" && <Check size={20} />}
                        </div>
                        <div>
                           <h4 className="font-bold">{req.org_name}</h4>
                           <p className="text-xs text-muted-foreground">Status: {req.status}</p>
                        </div>
                     </div>
                   </div>
                 ))}
               </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
           <div className="relative">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
             <Input 
               placeholder="Search organizations by name or location..." 
               className="pl-10"
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
             />
           </div>

           <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
             {filteredOrgs.map((org) => {
               const status = getRequestStatus(org.id);
               const isMember = isAlreadyMember(org.id);
               
               return (
                 <Card key={org.id} className="overflow-hidden">
                   <div className="h-2 bg-gradient-to-r from-primary/50 to-primary" />
                   <CardHeader>
                     <CardTitle className="text-lg">{org.name}</CardTitle>
                     <CardDescription className="line-clamp-2">{org.address}</CardDescription>
                   </CardHeader>
                   <CardFooter>
                     {isMember ? (
                       <Button disabled className="w-full bg-green-600/10 text-green-600 hover:bg-green-600/20">
                         <Check size={16} className="mr-2" /> Joined
                       </Button>
                     ) : status === "PENDING" ? (
                       <Button disabled className="w-full" variant="secondary">
                         <Clock size={16} className="mr-2" /> Request Sent
                       </Button>
                     ) : status === "REJECTED" ? (
                       <Button disabled className="w-full" variant="destructive">
                         <X size={16} className="mr-2" /> Rejected
                       </Button>
                     ) : (
                       <Button 
                         className="w-full" 
                         onClick={() => handleJoin(org.id)}
                         disabled={isJoining === org.id}
                       >
                         {isJoining === org.id ? <Loader2 className="animate-spin mr-2" /> : <Plus size={16} className="mr-2" />}
                         Request to Join
                       </Button>
                     )}
                   </CardFooter>
                 </Card>
               );
             })}
           </div>
        </div>
      )}
    </div>
  );
}
