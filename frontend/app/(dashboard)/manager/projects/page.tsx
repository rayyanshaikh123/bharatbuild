// frontend/app/(dashboard)/manager/projects/page.tsx - UPDATED WITH TABLE
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Plus, Loader2, Edit, Trash2, Eye, UserPlus } from "lucide-react";
import { managerOrganization, managerProjects, Project, ManagerOrgRequest } from "@/lib/api/manager";
import { DataTable, Column } from "@/components/ui/DataTable";

export default function ManagerProjectsTablePage() {
  const router = useRouter();
  const [approvedOrg, setApprovedOrg] = useState<ManagerOrgRequest | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const reqsRes = await managerOrganization.getMyRequests();
      const approved = reqsRes.requests?.find((r) => r.status === "APPROVED");

      if (approved) {
        setApprovedOrg(approved);
        const projRes = await managerProjects.getMyProjects(approved.org_id);
        setProjects(projRes.projects || []);
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

  const handleDelete = async (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!approvedOrg) return;
    if (!confirm("Are you sure? This action cannot be undone.")) return;

    setDeletingId(projectId);
    try {
      await managerProjects.delete(projectId, approvedOrg.org_id);
      setProjects((prev) => prev.filter((p) => p.id !== projectId));
    } catch (err) {
      console.error("Failed to delete:", err);
      alert("Failed to delete project");
    } finally {
      setDeletingId(null);
    }
  };

  const formatBudget = (value: number) => {
    if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
    if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
    if (value >= 1000) return `₹${(value / 1000).toFixed(0)}K`;
    return `₹${value}`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const statusStyles = {
    ACTIVE: { bg: "rgba(34, 197, 94, 0.1)", text: "#16a34a", border: "rgba(34, 197, 94, 0.3)" },
    COMPLETED: { bg: "rgba(59, 130, 246, 0.1)", text: "#2563eb", border: "rgba(59, 130, 246, 0.3)" },
    PLANNED: { bg: "rgba(249, 115, 22, 0.1)", text: "#ea580c", border: "rgba(249, 115, 22, 0.3)" },
    ON_HOLD: { bg: "rgba(100, 116, 139, 0.1)", text: "#475569", border: "rgba(100, 116, 139, 0.3)" },
  };

  const columns: Column<Project>[] = [
    {
      key: "name",
      label: "Project Name",
      sortable: true,
      width: "25%",
      render: (value, row) => (
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div
            style={{
              width: "2.5rem",
              height: "2.5rem",
              backgroundColor: "rgba(var(--primary-rgb, 71, 85, 105), 0.1)",
              borderRadius: "0.75rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Building2 size={18} style={{ color: "var(--primary)" }} />
          </div>
          <div style={{ fontWeight: "600", color: "var(--foreground)" }}>{value}</div>
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      width: "12%",
      render: (value) => {
        const style = statusStyles[value as keyof typeof statusStyles];
        return (
          <span
            style={{
              display: "inline-block",
              padding: "0.375rem 0.75rem",
              backgroundColor: style.bg,
              color: style.text,
              border: `1px solid ${style.border}`,
              borderRadius: "9999px",
              fontSize: "0.75rem",
              fontWeight: "600",
            }}
          >
            {value}
          </span>
        );
      },
    },
    {
      key: "budget",
      label: "Budget",
      sortable: true,
      width: "15%",
      render: (value) => (
        <span style={{ fontWeight: "600" }}>{formatBudget(value || 0)}</span>
      ),
    },
    {
      key: "start_date",
      label: "Start Date",
      sortable: true,
      width: "12%",
      render: (value) => (
        <span style={{ fontSize: "0.875rem" }}>{formatDate(value)}</span>
      ),
    },
    {
      key: "end_date",
      label: "End Date",
      sortable: true,
      width: "12%",
      render: (value) => (
        <span style={{ fontSize: "0.875rem" }}>{formatDate(value)}</span>
      ),
    },
    {
      key: "id",
      label: "Actions",
      width: "24%",
      render: (value) => (
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/manager/projects/${value}`);
            }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.375rem",
              padding: "0.5rem 0.75rem",
              backgroundColor: "var(--primary)",
              color: "var(--primary-foreground)",
              border: "none",
              borderRadius: "0.5rem",
              fontSize: "0.875rem",
              fontWeight: "500",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.9")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
          >
            <Eye size={14} />
            View
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/manager/projects/${value}/edit`);
            }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.375rem",
              padding: "0.5rem 0.75rem",
              backgroundColor: "transparent",
              color: "var(--foreground)",
              border: "1px solid var(--border)",
              borderRadius: "0.5rem",
              fontSize: "0.875rem",
              fontWeight: "500",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--muted)")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
          >
            <Edit size={14} />
            Edit
          </button>
          <button
            onClick={(e) => handleDelete(value, e)}
            disabled={deletingId === value}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "2.5rem",
              height: "2.5rem",
              backgroundColor: "rgba(239, 68, 68, 0.1)",
              color: "#dc2626",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              borderRadius: "0.5rem",
              cursor: deletingId === value ? "not-allowed" : "pointer",
              opacity: deletingId === value ? 0.6 : 1,
            }}
            onMouseEnter={(e) => {
              if (deletingId !== value) {
                e.currentTarget.style.backgroundColor = "rgba(239, 68, 68, 0.2)";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "rgba(239, 68, 68, 0.1)";
            }}
          >
            {deletingId === value ? (
              <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
            ) : (
              <Trash2 size={14} />
            )}
          </button>
        </div>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div style={{ minHeight: "50vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Loader2 size={32} style={{ animation: "spin 1s linear infinite", color: "var(--primary)" }} />
      </div>
    );
  }

  if (!approvedOrg) {
    return (
      <div style={{ textAlign: "center", padding: "3rem" }}>
        <Building2 size={48} style={{ color: "var(--muted-foreground)", margin: "0 auto 1rem" }} />
        <h2 style={{ fontSize: "1.25rem", fontWeight: "700", color: "var(--foreground)" }}>Not Approved</h2>
        <p style={{ color: "var(--muted-foreground)", marginTop: "0.5rem" }}>
          Join an organization first to manage projects.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem", paddingTop: "3rem" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1
            style={{
              fontSize: "1.875rem",
              fontWeight: "900",
              letterSpacing: "-0.025em",
              color: "var(--foreground)",
              textTransform: "uppercase",
              fontStyle: "italic",
            }}
          >
            My <span style={{ color: "var(--primary)" }}>Projects</span>
          </h1>
          <p style={{ color: "var(--muted-foreground)", marginTop: "0.25rem" }}>{approvedOrg.org_name}</p>
        </div>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button
            onClick={() => router.push("/manager/projects/join")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.625rem 1rem",
              backgroundColor: "transparent",
              color: "var(--foreground)",
              border: "1px solid var(--border)",
              borderRadius: "0.75rem",
              fontSize: "0.875rem",
              fontWeight: "600",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--muted)")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
          >
            <UserPlus size={16} />
            Join Project
          </button>
          <button
            onClick={() => router.push("/manager/projects/new")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.625rem 1rem",
              backgroundColor: "var(--primary)",
              color: "var(--primary-foreground)",
              border: "none",
              borderRadius: "0.75rem",
              fontSize: "0.875rem",
              fontWeight: "600",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.9")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
          >
            <Plus size={16} />
            Create Project
          </button>
        </div>
      </div>

      <DataTable
        data={projects}
        columns={columns}
        searchable={true}
        searchKeys={["name", "location_text", "status"]}
        onRowClick={(row) => router.push(`/manager/projects/${row.id}`)}
        emptyMessage="No projects yet. Create your first project to get started."
        itemsPerPage={10}
      />
    </div>
  );
}

if (typeof document !== "undefined") {
  const style = document.createElement("style");
  style.textContent = `
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
}