"use client";

import { useEffect, useState } from "react";
import {
  Users,
  Loader2,
  ArrowLeft,
  Mail,
  Phone,
  Check,
  X,
  Clock,
  CheckCircle2,
  Filter,
} from "lucide-react";
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
import { managerOrganization, ManagerOrgRequest } from "@/lib/api/manager";
import { managerQARequests, QAProjectRequest } from "@/lib/api/manager-qa";

export default function ManagerQAEngineersPage() {
  const [approvedOrg, setApprovedOrg] = useState<ManagerOrgRequest | null>(
    null,
  );
  const [requests, setRequests] = useState<QAProjectRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const fetchData = async () => {
    try {
      setIsLoading(true);

      const reqsRes = await managerOrganization.getMyRequests();
      const approved = reqsRes.requests?.find((r) => r.status === "APPROVED");

      if (approved) {
        setApprovedOrg(approved);

        const qaReqsRes = await managerQARequests.getRequests();
        setRequests(qaReqsRes.requests || []);
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

  const handleDecision = async (
    requestId: string,
    status: "APPROVED" | "REJECTED",
  ) => {
    setProcessingId(requestId);
    try {
      await managerQARequests.updateStatus(requestId, status);
      fetchData();
    } catch (err) {
      console.error("Failed to update:", err);
    } finally {
      setProcessingId(null);
    }
  };

  const filteredRequests = requests.filter((req) => {
    if (statusFilter === "all") return true;
    return req.status === statusFilter;
  });

  const pendingRequests = filteredRequests.filter(
    (r) => r.status === "PENDING",
  );
  const otherRequests = filteredRequests.filter((r) => r.status !== "PENDING");

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
        <p className="text-muted-foreground mt-2">
          Join an organization first.
        </p>
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
        <div className="flex-1">
          <h1 className="text-3xl font-black tracking-tight text-foreground uppercase italic">
            QA <span className="text-primary">Engineers</span>
          </h1>
          <p className="text-muted-foreground mt-1">
            Approve project join requests from QA Engineers
          </p>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Requests</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="APPROVED">Approved</SelectItem>
            <SelectItem value="REJECTED">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Pending Requests */}
      {pendingRequests.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-yellow-500/10 rounded-xl flex items-center justify-center text-yellow-600">
              <Clock size={20} />
            </div>
            <div>
              <h3 className="font-bold text-lg text-foreground">
                Pending Requests
              </h3>
              <p className="text-sm text-muted-foreground">
                {pendingRequests.length} awaiting your review
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {pendingRequests.map((request) => (
              <div
                key={request.id}
                className="bg-background border border-border rounded-xl p-4 hover:border-primary/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h4 className="font-semibold text-foreground">
                      {request.name}
                    </h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      Project:{" "}
                      <span className="font-medium text-foreground">
                        {request.project_name}
                      </span>
                    </p>
                    <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Mail size={14} /> {request.email}
                      </span>
                      <span className="flex items-center gap-1">
                        <Phone size={14} /> {request.phone}
                      </span>
                      <span className="text-xs bg-muted px-2 py-1 rounded">
                        Requested:{" "}
                        {new Date(request.requested_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-green-500 text-green-600 hover:bg-green-50"
                      onClick={() =>
                        handleDecision(request.request_id, "APPROVED")
                      }
                      disabled={processingId === request.request_id}
                    >
                      {processingId === request.request_id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Check size={16} className="mr-1" /> Approve
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-red-500 text-red-600 hover:bg-red-50"
                      onClick={() =>
                        handleDecision(request.request_id, "REJECTED")
                      }
                      disabled={processingId === request.request_id}
                    >
                      <X size={16} className="mr-1" /> Reject
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Other Requests Table */}
      {otherRequests.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-600">
              <CheckCircle2 size={20} />
            </div>
            <div>
              <h3 className="font-bold text-lg text-foreground">
                Request History
              </h3>
              <p className="text-sm text-muted-foreground">
                Approved and rejected requests
              </p>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Requested</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {otherRequests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell className="font-medium">{request.name}</TableCell>
                  <TableCell>{request.email}</TableCell>
                  <TableCell>{request.project_name}</TableCell>
                  <TableCell>
                    {new Date(request.requested_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex px-2 py-1 text-xs rounded-full ${
                        request.status === "APPROVED"
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {request.status}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {filteredRequests.length === 0 && (
        <div className="text-center py-12 bg-card border border-border rounded-2xl">
          <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-bold text-foreground">No Requests</h2>
          <p className="text-muted-foreground mt-2">
            {statusFilter === "all"
              ? "No QA Engineer project requests yet"
              : `No ${statusFilter.toLowerCase()} requests`}
          </p>
        </div>
      )}
    </div>
  );
}
