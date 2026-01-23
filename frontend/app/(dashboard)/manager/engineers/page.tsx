"use client";

import { useEffect, useState } from "react";
import { Users, Loader2, ArrowLeft, Mail, Phone, Check, X, Clock, CheckCircle2, Filter } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Link from "next/link";
import { managerOrganization, managerOrgEngineerRequests, ManagerOrgRequest, EngineerRequest } from "@/lib/api/manager";

export default function ManagerEngineersPage() {
  const [approvedOrg, setApprovedOrg] = useState<ManagerOrgRequest | null>(null);
  const [pendingRequests, setPendingRequests] = useState<EngineerRequest[]>([]);
  const [approvedEngineers, setApprovedEngineers] = useState<EngineerRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const fetchData = async () => {
    try {
      setIsLoading(true);
      
      const reqsRes = await managerOrganization.getMyRequests();
      const approved = reqsRes.requests?.find(r => r.status === "APPROVED");
      
      if (approved) {
        setApprovedOrg(approved);
        
        // Get pending and accepted engineer requests
        const [pendingRes, acceptedRes] = await Promise.all([
          managerOrgEngineerRequests.getPending(approved.org_id),
          managerOrgEngineerRequests.getAccepted(approved.org_id),
        ]);
        
        setPendingRequests(pendingRes.requests || []);
        setApprovedEngineers(acceptedRes.requests || []);
      }
    } catch (err) {
      console.error("Failed to fetch:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDecision = async (requestId: string, action: "APPROVED" | "REJECTED") => {
    setProcessingId(requestId);
    try {
      await managerOrgEngineerRequests.updateStatus(requestId, action);
      // Refresh data
      fetchData();
    } catch (err) {
      console.error("Failed to update:", err);
    } finally {
      setProcessingId(null);
    }
  };

  // Combine and filter data
  const allEngineers = [
    ...pendingRequests.map(req => ({ ...req, status: "PENDING" })),
    ...approvedEngineers.map(req => ({ ...req, status: "APPROVED" }))
  ];

  const filteredEngineers = allEngineers.filter(engineer => {
    if (statusFilter === "all") return true;
    return engineer.status === statusFilter;
  });

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
        <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-xl font-bold text-foreground">Not Approved</h2>
        <p className="text-muted-foreground mt-2">Join an organization first.</p>
        <Link href="/manager">
          <Button className="mt-4">Go to Dashboard</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 pt-12 md:pt-0">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/manager">
          <Button variant="outline" size="sm">
            <ArrowLeft size={16} className="mr-2" /> Back
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-black tracking-tight text-foreground uppercase italic">
            Site <span className="text-primary">Engineers</span>
          </h1>
          <p className="text-muted-foreground mt-1">
            Approve or reject engineer requests for {approvedOrg.org_name}
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center text-blue-600">
              <Users size={20} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Engineers</p>
              <p className="text-2xl font-bold text-foreground">{allEngineers.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-500/10 rounded-lg flex items-center justify-center text-yellow-600">
              <Clock size={20} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pending</p>
              <p className="text-2xl font-bold text-foreground">{pendingRequests.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center text-green-600">
              <CheckCircle2 size={20} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Approved</p>
              <p className="text-2xl font-bold text-foreground">{approvedEngineers.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Table */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-foreground uppercase tracking-wide">
            Engineers List
          </h3>
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-muted-foreground" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {filteredEngineers.length === 0 ? (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No engineers found for the selected filter.</p>
          </div>
        ) : (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[250px]">Engineer Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEngineers.map((engineer) => (
                  <TableRow key={engineer.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          engineer.status === "APPROVED" 
                            ? "bg-green-500/10 text-green-600" 
                            : "bg-yellow-500/10 text-yellow-600"
                        }`}>
                          <Users size={20} />
                        </div>
                        <span>{engineer.engineer_name || "Unknown Engineer"}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {engineer.engineer_email ? (
                        <div className="flex items-center gap-2 text-sm">
                          <Mail size={14} className="text-muted-foreground" />
                          <span>{engineer.engineer_email}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {engineer.engineer_phone ? (
                        <div className="flex items-center gap-2 text-sm">
                          <Phone size={14} className="text-muted-foreground" />
                          <span>{engineer.engineer_phone}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {engineer.status === "APPROVED" ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500/10 text-green-600 text-xs font-medium">
                          <CheckCircle2 size={14} />
                          Approved
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-500/10 text-yellow-600 text-xs font-medium">
                          <Clock size={14} />
                          Pending
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {engineer.status === "PENDING" ? (
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={processingId === engineer.id}
                            onClick={() => handleDecision(engineer.id, "REJECTED")}
                            className="border-red-500/30 text-red-600 hover:bg-red-500/10"
                          >
                            {processingId === engineer.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <X size={16} className="mr-1" />
                                Reject
                              </>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            disabled={processingId === engineer.id}
                            onClick={() => handleDecision(engineer.id, "APPROVED")}
                          >
                            {processingId === engineer.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <Check size={16} className="mr-1" />
                                Approve
                              </>
                            )}
                          </Button>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Info Card */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-6">
        <h4 className="font-bold text-foreground mb-2">How it works</h4>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• Site engineers sign up and request to join the organization</li>
          <li>• You approve or reject their requests here</li>
          <li>• Approved engineers can be assigned to your projects</li>
          <li>• They will submit DPRs and attendance data from the field</li>
        </ul>
      </div>
    </div>
  );
}