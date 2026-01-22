"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/components/providers/AuthContext";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DataTable, Column } from "@/components/ui/DataTable";
import { ownerOrganization, ownerProjects, Project } from "@/lib/api/owner";
import { ownerLedger } from "@/lib/api/ledger";
import type { LedgerEntry, LedgerEntryType } from "@/types/ledger";
import {
  Loader2,
  Receipt,
  Wallet,
  Wrench,
  Calendar,
  Filter,
  IndianRupeeIcon,
} from "lucide-react";

// Type badge component
function TypeBadge({ type }: { type: LedgerEntryType }) {
  const config = {
    MATERIAL: { icon: Wrench, color: "bg-blue-500/20 text-blue-400", label: "Material" },
    WAGE: { icon: Wallet, color: "bg-green-500/20 text-green-400", label: "Wage" },
    ADJUSTMENT: { icon: Receipt, color: "bg-amber-500/20 text-amber-400", label: "Adjustment" },
  };

  const { icon: Icon, color, label } = config[type] || config.ADJUSTMENT;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${color}`}>
      <Icon size={12} />
      {label}
    </span>
  );
}

// Format currency helper
function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

// Project selector component
function ProjectSelector({
  projects,
  selected,
  onSelect,
}: {
  projects: Project[];
  selected: string | null;
  onSelect: (id: string | null) => void;
}) {
  return (
    <select
      value={selected || ""}
      onChange={(e) => onSelect(e.target.value || null)}
      className="h-10 px-3 bg-background/50 border border-border rounded-lg text-sm text-foreground focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
    >
      <option value="">Select a project</option>
      {projects.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name}
        </option>
      ))}
    </select>
  );
}

// Type filter component
function TypeFilter({
  selected,
  onSelect,
}: {
  selected: LedgerEntryType | null;
  onSelect: (type: LedgerEntryType | null) => void;
}) {
  const types: (LedgerEntryType | null)[] = [null, "MATERIAL", "WAGE", "ADJUSTMENT"];

  return (
    <div className="flex items-center gap-1 p-1 bg-muted/30 rounded-lg">
      {types.map((type) => (
        <button
          key={type ?? "all"}
          onClick={() => onSelect(type)}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
            selected === type
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          }`}
        >
          {type ?? "All"}
        </button>
      ))}
    </div>
  );
}

export default function OwnerLedgerPage() {
  const { user } = useAuth();
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingLedger, setIsLoadingLedger] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<LedgerEntryType | null>(null);

  // Fetch organization and projects
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setIsLoading(true);
        const orgRes = await ownerOrganization.get();
        if (orgRes.organization) {
          setOrganizationId(orgRes.organization.id);
          const projectsRes = await ownerProjects.getAll(orgRes.organization.id);
          setProjects(projectsRes.projects || []);
        }
      } catch (err) {
        console.error("Failed to fetch initial data:", err);
        setError("Failed to load organization data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitialData();
  }, []);

  // Fetch ledger when project is selected
  useEffect(() => {
    if (!selectedProjectId) {
      setEntries([]);
      return;
    }

    const fetchLedger = async () => {
      try {
        setIsLoadingLedger(true);
        const res = await ownerLedger.get(selectedProjectId, {
          type: typeFilter ?? undefined,
          limit: 200,
        });
        setEntries(res.entries);
      } catch (err) {
        console.error("Failed to fetch ledger:", err);
        setError("Failed to load ledger data");
      } finally {
        setIsLoadingLedger(false);
      }
    };

    fetchLedger();
  }, [selectedProjectId, typeFilter]);

  // Table columns
  const columns: Column<LedgerEntry>[] = useMemo(
    () => [
      {
        key: "date",
        label: "Date",
        sortable: true,
        width: "120px",
        render: (value: string) => new Date(value).toLocaleDateString("en-IN"),
      },
      {
        key: "type",
        label: "Type",
        width: "130px",
        render: (value: LedgerEntryType) => <TypeBadge type={value} />,
      },
      {
        key: "description",
        label: "Description",
        sortable: true,
      },
      {
        key: "category",
        label: "Category",
        width: "120px",
        render: (value: string) => (
          <span className="text-xs text-muted-foreground bg-muted/30 px-2 py-1 rounded">
            {value}
          </span>
        ),
      },
      {
        key: "amount",
        label: "Amount",
        sortable: true,
        width: "140px",
        render: (value: number) => (
          <span className={`font-mono font-medium ${value >= 0 ? "text-red-400" : "text-green-400"}`}>
            {formatCurrency(value)}
          </span>
        ),
      },
      {
        key: "running_total",
        label: "Running Total",
        sortable: true,
        width: "150px",
        render: (value: number) => (
          <span className="font-mono text-foreground/80">{formatCurrency(value)}</span>
        ),
      },
      {
        key: "approved_by",
        label: "Approved By",
        width: "140px",
        render: (value: string | null) => value || <span className="text-muted-foreground">—</span>,
      },
    ],
    []
  );

  // Calculate summary stats
  const stats = useMemo(() => {
    const materialTotal = entries
      .filter((e) => e.type === "MATERIAL")
      .reduce((sum, e) => sum + e.amount, 0);
    const wageTotal = entries
      .filter((e) => e.type === "WAGE")
      .reduce((sum, e) => sum + e.amount, 0);
    const adjustmentTotal = entries
      .filter((e) => e.type === "ADJUSTMENT")
      .reduce((sum, e) => sum + e.amount, 0);
    const grandTotal = entries.reduce((sum, e) => sum + e.amount, 0);

    return { materialTotal, wageTotal, adjustmentTotal, grandTotal };
  }, [entries]);

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pt-12 md:pt-0 pb-12">
      <DashboardHeader
        userName={user?.name?.split(" ")[0]}
        title="Financial Ledger"
      />

      {/* Filters Bar */}
      <div className="glass-card rounded-2xl p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Filter size={16} />
            <span>Filters:</span>
          </div>
          <ProjectSelector
            projects={projects}
            selected={selectedProjectId}
            onSelect={setSelectedProjectId}
          />
          {selectedProjectId && (
            <TypeFilter selected={typeFilter} onSelect={setTypeFilter} />
          )}
        </div>
      </div>

      {!selectedProjectId ? (
        <div className="glass-card rounded-2xl p-12 text-center">
          <Receipt className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-semibold text-muted-foreground">Select a Project</h3>
          <p className="text-sm text-muted-foreground/60 mt-2">
            Choose a project from the dropdown to view its financial ledger.
          </p>
        </div>
      ) : isLoadingLedger ? (
        <div className="glass-card rounded-2xl p-12 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="ml-2 text-muted-foreground">Loading ledger...</span>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="glass-card rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/20">
                  <Wrench className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Material Costs</p>
                  <p className="text-lg font-bold text-foreground">{formatCurrency(stats.materialTotal)}</p>
                </div>
              </div>
            </div>
            <div className="glass-card rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/20">
                  <Wallet className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Wage Payments</p>
                  <p className="text-lg font-bold text-foreground">{formatCurrency(stats.wageTotal)}</p>
                </div>
              </div>
            </div>
            <div className="glass-card rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/20">
                  <Receipt className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Adjustments</p>
                  <p className="text-lg font-bold text-foreground">{formatCurrency(stats.adjustmentTotal)}</p>
                </div>
              </div>
            </div>
            <div className="glass-card rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/20">
                  <IndianRupeeIcon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Grand Total</p>
                  <p className="text-lg font-bold text-foreground">{formatCurrency(stats.grandTotal)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Ledger Table */}
          <DataTable
            data={entries}
            columns={columns}
            searchable={true}
            searchKeys={["description", "category", "approved_by"]}
            emptyMessage="No ledger entries found for this project."
            itemsPerPage={15}
          />
        </>
      )}
    </div>
  );
}
