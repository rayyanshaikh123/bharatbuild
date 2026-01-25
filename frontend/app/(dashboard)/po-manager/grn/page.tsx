"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/components/providers/AuthContext";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DataTable, Column } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/badge";
import { poManagerGRN, poManagerProjects, GRN, Project } from "@/lib/api/po-manager";
import { Loader2, Package, CheckCircle2, XCircle, Clock, Filter } from "lucide-react";

// Project Selector Component
function ProjectSelector({
  projects,
  selectedId,
  onSelect,
}: {
  projects: Project[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="glass-card rounded-xl p-4 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Filter size={16} className="text-muted-foreground" />
        <span className="text-sm font-medium">Select Project</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {projects.map((project) => (
          <button
            key={project.id}
            onClick={() => onSelect(project.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              selectedId === project.id
                ? "bg-primary text-primary-foreground"
                : "bg-muted/50 hover:bg-muted text-foreground"
            }`}
          >
            {project.name}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function POManagerGRNPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [grns, setGRNs] = useState<GRN[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingGRNs, setIsLoadingGRNs] = useState(false);

  // Fetch projects on mount
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setIsLoading(true);
        const res = await poManagerProjects.getMyProjects();
        setProjects(res.projects || []);
        if (res.projects && res.projects.length > 0) {
          setSelectedProjectId(res.projects[0].id);
        }
      } catch (err) {
        console.error("Failed to fetch projects:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProjects();
  }, []);

  // Fetch GRNs when project changes
  useEffect(() => {
    const fetchGRNs = async () => {
      if (!selectedProjectId) return;
      try {
        setIsLoadingGRNs(true);
        const res = await poManagerGRN.getByProject(selectedProjectId);
        setGRNs(res.grns || []);
      } catch (err) {
        console.error("Failed to fetch GRNs:", err);
        setGRNs([]);
      } finally {
        setIsLoadingGRNs(false);
      }
    };
    fetchGRNs();
  }, [selectedProjectId]);

  const columns: Column<GRN>[] = useMemo(() => [
    {
      key: "grn_number",
      header: "GRN Number",
      render: (row) => <span className="font-mono font-medium">{row.grn_number}</span>,
    },
    {
      key: "po_number",
      header: "PO Number",
      render: (row) => <span className="font-mono text-sm">{row.po_number}</span>,
    },
    {
      key: "material_request_title",
      header: "Material",
      render: (row) => (
        <div>
          <p className="font-medium">{row.material_request_title}</p>
          <p className="text-xs text-muted-foreground">{row.vendor_name}</p>
        </div>
      ),
    },
    {
      key: "quantity_received",
      header: "Qty Received",
      render: (row) => `${row.quantity_received} ${row.unit}`,
    },
    {
      key: "quality_check_status",
      header: "Quality Check",
      render: (row) => {
        if (row.quality_check_status === "PASSED") {
          return (
            <Badge className="bg-green-500/10 text-green-600 gap-1">
              <CheckCircle2 size={12} /> Passed
            </Badge>
          );
        }
        if (row.quality_check_status === "FAILED") {
          return (
            <Badge variant="destructive" className="gap-1">
              <XCircle size={12} /> Failed
            </Badge>
          );
        }
        return (
          <Badge className="bg-yellow-500/10 text-yellow-600 gap-1">
            <Clock size={12} /> Pending
          </Badge>
        );
      },
    },
    {
      key: "engineer_name",
      header: "Received By",
      render: (row) => row.engineer_name,
    },
    {
      key: "received_at",
      header: "Received Date",
      render: (row) => new Date(row.received_at).toLocaleDateString(),
    },
  ], []);

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pt-12 md:pt-0 pb-12">
      <DashboardHeader
        userName={user?.name?.split(" ")[0]}
        title="Goods Received Notes"
      />

      {projects.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center">
          <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-bold text-muted-foreground mb-2">No Projects</h3>
          <p className="text-sm text-muted-foreground">
            You need to be approved for at least one project to view GRNs.
          </p>
        </div>
      ) : (
        <>
          <ProjectSelector
            projects={projects}
            selectedId={selectedProjectId}
            onSelect={setSelectedProjectId}
          />

          {isLoadingGRNs ? (
            <div className="glass-card rounded-2xl p-8 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="ml-2 text-muted-foreground">Loading GRNs...</span>
            </div>
          ) : grns.length === 0 ? (
            <div className="glass-card rounded-2xl p-12 text-center">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-bold text-muted-foreground mb-2">No GRNs Found</h3>
              <p className="text-sm text-muted-foreground">
                No goods have been received for this project yet.
              </p>
            </div>
          ) : (
            <DataTable
              data={grns}
              columns={columns}
              searchKeys={["grn_number", "po_number", "material_request_title", "vendor_name", "engineer_name"]}
            />
          )}
        </>
      )}
    </div>
  );
}
