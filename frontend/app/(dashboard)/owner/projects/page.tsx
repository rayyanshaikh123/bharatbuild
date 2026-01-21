// frontend/app/(dashboard)/owner/projects/page.tsx - UPDATED
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, MapPin, Calendar, DollarSign, Loader2, Eye, IndianRupeeIcon  } from "lucide-react";
import { ownerOrganization, ownerProjects, Project, Organization } from "@/lib/api/owner";
import { DataTable, Column } from "@/components/ui/DataTable";

export default function OwnerProjectsTablePage() {
  const router = useRouter();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const orgRes = await ownerOrganization.get();
        if (orgRes.organization) {
          setOrganization(orgRes.organization);
          const projRes = await ownerProjects.getAll(orgRes.organization.id);
          setProjects(projRes.projects || []);
        }
      } catch (err) {
        console.error("Failed to fetch data:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

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
          <div>
            <div style={{ fontWeight: "600", color: "var(--foreground)" }}>{value}</div>
            <div
              style={{
                fontSize: "0.75rem",
                color: "var(--muted-foreground)",
                display: "flex",
                alignItems: "center",
                gap: "0.25rem",
                marginTop: "0.125rem",
              }}
            >
              <MapPin size={10} />
              {row.location_text || "—"}
            </div>
          </div>
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
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <IndianRupeeIcon size={14} style={{ color: "var(--muted-foreground)" }} />
          <span style={{ fontWeight: "600" }}>{formatBudget(value || 0)}</span>
        </div>
      ),
    },
    {
      key: "start_date",
      label: "Timeline",
      width: "20%",
      render: (value, row) => (
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.875rem" }}>
          <Calendar size={14} style={{ color: "var(--muted-foreground)" }} />
          <span>
            {formatDate(value)} → {formatDate(row.end_date)}
          </span>
        </div>
      ),
    },
    {
      key: "created_at",
      label: "Created",
      sortable: true,
      width: "15%",
      render: (value) => (
        <span style={{ fontSize: "0.875rem", color: "var(--muted-foreground)" }}>
          {value ? formatDate(value) : "—"}
        </span>
      ),
    },
    {
      key: "id",
      label: "Actions",
      width: "13%",
      render: (value) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/owner/projects/${value}`);
          }}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
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
      ),
    },
  ];

  if (isLoading) {
    return (
      <div style={{ minHeight: "50vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Loader2
          size={32}
          style={{ animation: "spin 1s linear infinite", color: "var(--primary)" }}
        />
      </div>
    );
  }

  if (!organization) {
    return (
      <div style={{ textAlign: "center", padding: "3rem" }}>
        <Building2 size={48} style={{ color: "var(--muted-foreground)", margin: "0 auto 1rem" }} />
        <h2 style={{ fontSize: "1.25rem", fontWeight: "700", color: "var(--foreground)" }}>
          No Organization
        </h2>
        <p style={{ color: "var(--muted-foreground)", marginTop: "0.5rem" }}>
          Create an organization first to view projects.
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
            All <span style={{ color: "var(--primary)" }}>Projects</span>
          </h1>
          <p style={{ color: "var(--muted-foreground)", marginTop: "0.25rem" }}>
            View all projects in {organization.name} (Read-only)
          </p>
        </div>
        <div
          style={{
            padding: "0.75rem 1rem",
            backgroundColor: "rgba(var(--primary-rgb, 71, 85, 105), 0.1)",
            borderRadius: "0.75rem",
            fontSize: "0.875rem",
            fontWeight: "600",
            color: "var(--primary)",
          }}
        >
          {projects.length} Project{projects.length !== 1 ? "s" : ""}
        </div>
      </div>

      <DataTable
        data={projects}
        columns={columns}
        searchable={true}
        searchKeys={["name", "location_text", "status"]}
        onRowClick={(row) => router.push(`/owner/projects/${row.id}`)}
        emptyMessage="No projects found in this organization. Projects created by managers will appear here."
        itemsPerPage={10}
      />
    </div>
  );
}

// Add animation keyframe for loader
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