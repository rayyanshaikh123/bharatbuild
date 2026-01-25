"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/AuthContext";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { ownerMaterialOversight, GRNAuditRecord } from "@/lib/api/owner";
import { Button } from "@/components/ui/Button";
import {
  ArrowLeft,
  FileText,
  Calendar,
  User,
  CheckCircle,
  Loader2,
  Search,
  Eye,
} from "lucide-react";
import { toast } from "sonner";

export default function GRNAuditPage() {
  const router = useRouter();

  const [auditRecords, setAuditRecords] = useState<GRNAuditRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<GRNAuditRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProject, setSelectedProject] = useState<string>("all");

  useEffect(() => {
    fetchAuditRecords();
  }, []);

  useEffect(() => {
    filterRecords();
  }, [searchTerm, selectedProject, auditRecords]);

  const fetchAuditRecords = async () => {
    try {
      setIsLoading(true);
      const res = await ownerMaterialOversight.getGRNAudit();
      setAuditRecords(res.audit_records);
      setFilteredRecords(res.audit_records);
    } catch (err) {
      console.error("Failed to fetch audit records:", err);
      toast.error("Failed to load audit records");
    } finally {
      setIsLoading(false);
    }
  };

  const filterRecords = () => {
    let filtered = auditRecords;

    if (searchTerm) {
      filtered = filtered.filter(
        (record) =>
          record.po_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
          record.project_name
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          record.manager_name.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }

    if (selectedProject !== "all") {
      filtered = filtered.filter(
        (record) => record.project_name === selectedProject,
      );
    }

    setFilteredRecords(filtered);
  };

  const uniqueProjects = Array.from(
    new Set(auditRecords.map((r) => r.project_name)),
  ).sort();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin h-8 w-8 text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => router.push("/owner/material-oversight")}
          className="mb-4"
        >
          <ArrowLeft size={16} className="mr-2" />
          Back to Overview
        </Button>

        <DashboardHeader
          title="GRN Approval Audit Trail"
          subtitle="Complete history of all GRN approvals across projects"
        />
      </div>

      <div className="max-w-7xl mx-auto space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="glass-card rounded-2xl p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-muted-foreground">
                Total Approvals
              </h3>
              <CheckCircle className="text-green-500" size={20} />
            </div>
            <p className="text-3xl font-bold">{auditRecords.length}</p>
            <p className="text-xs text-muted-foreground mt-2">
              GRNs approved by managers
            </p>
          </div>

          <div className="glass-card rounded-2xl p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-muted-foreground">
                Projects
              </h3>
              <FileText className="text-blue-500" size={20} />
            </div>
            <p className="text-3xl font-bold">{uniqueProjects.length}</p>
            <p className="text-xs text-muted-foreground mt-2">
              Projects with GRN activity
            </p>
          </div>

          <div className="glass-card rounded-2xl p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-muted-foreground">
                Latest Activity
              </h3>
              <Calendar className="text-orange-500" size={20} />
            </div>
            <p className="text-lg font-bold">
              {auditRecords.length > 0
                ? new Date(
                    auditRecords[0].action_timestamp,
                  ).toLocaleDateString()
                : "-"}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Most recent approval
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="glass-card rounded-2xl p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                size={18}
              />
              <input
                type="text"
                placeholder="Search by PO number, project, or manager..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-background border border-border text-sm focus:ring-2 focus:ring-primary/30 outline-none"
              />
            </div>

            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="w-full p-3 rounded-xl bg-background border border-border text-sm focus:ring-2 focus:ring-primary/30 outline-none"
            >
              <option value="all">All Projects</option>
              {uniqueProjects.map((project) => (
                <option key={project} value={project}>
                  {project}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Audit Records Table */}
        {filteredRecords.length === 0 ? (
          <div className="glass-card rounded-2xl p-12 text-center">
            <FileText
              size={48}
              className="mx-auto text-muted-foreground mb-4"
            />
            <p className="text-muted-foreground">No audit records found</p>
            {searchTerm && (
              <Button
                variant="ghost"
                onClick={() => {
                  setSearchTerm("");
                  setSelectedProject("all");
                }}
                className="mt-4"
              >
                Clear Filters
              </Button>
            )}
          </div>
        ) : (
          <div className="glass-card rounded-2xl overflow-hidden">
            <div className="p-6 border-b border-border">
              <h2 className="text-xl font-bold">Audit Records</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Showing {filteredRecords.length} of {auditRecords.length}{" "}
                records
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/30">
                  <tr>
                    <th className="text-left text-xs font-semibold text-muted-foreground p-4">
                      Timestamp
                    </th>
                    <th className="text-left text-xs font-semibold text-muted-foreground p-4">
                      Project
                    </th>
                    <th className="text-left text-xs font-semibold text-muted-foreground p-4">
                      PO Number
                    </th>
                    <th className="text-left text-xs font-semibold text-muted-foreground p-4">
                      Action
                    </th>
                    <th className="text-left text-xs font-semibold text-muted-foreground p-4">
                      Manager
                    </th>
                    <th className="text-center text-xs font-semibold text-muted-foreground p-4">
                      Details
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.map((record) => (
                    <tr
                      key={record.audit_id}
                      className="border-b border-border/50 hover:bg-muted/20"
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Calendar
                            size={14}
                            className="text-muted-foreground"
                          />
                          <div>
                            <div className="text-sm font-medium">
                              {new Date(
                                record.action_timestamp,
                              ).toLocaleDateString()}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(
                                record.action_timestamp,
                              ).toLocaleTimeString()}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="text-sm font-medium">
                          {record.project_name}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="text-sm font-mono">
                          {record.po_number}
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/10 text-green-500">
                          <CheckCircle size={12} />
                          {record.action}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <User size={14} className="text-muted-foreground" />
                          <div className="text-sm">{record.manager_name}</div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-center">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              toast.info(
                                JSON.stringify(record.change_summary, null, 2),
                              );
                            }}
                          >
                            <Eye size={14} className="mr-1" />
                            View
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
