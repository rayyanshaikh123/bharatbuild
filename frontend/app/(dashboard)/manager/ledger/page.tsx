"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/components/providers/AuthContext";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DataTable, Column } from "@/components/ui/DataTable";
import { managerOrganization, managerProjects, Project } from "@/lib/api/manager";
import { projectLedger } from "@/lib/api/ledger";
import type { LedgerEntry, LedgerEntryType, LedgerAdjustmentData } from "@/types/ledger";
import {
  Loader2,
  Receipt,
  Wallet,
  Wrench,
  Filter,
  IndianRupeeIcon,
  PlusCircle,
  X,
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

// Add Adjustment Modal
function AddAdjustmentModal({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: LedgerAdjustmentData) => void;
  isSubmitting: boolean;
}) {
  const [formData, setFormData] = useState<LedgerAdjustmentData>({
    date: new Date().toISOString().split("T")[0],
    description: "",
    amount: 0,
    category: "ADJUSTMENT",
    notes: "",
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative glass-card rounded-2xl p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-foreground">Add Ledger Adjustment</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">Date</label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full h-10 px-3 bg-background/50 border border-border rounded-lg text-sm"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">Description</label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="e.g., Petty cash reimbursement"
              className="w-full h-10 px-3 bg-background/50 border border-border rounded-lg text-sm"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">Amount (₹)</label>
            <input
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
              placeholder="Enter amount"
              className="w-full h-10 px-3 bg-background/50 border border-border rounded-lg text-sm"
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              Use positive for expenses, negative for credits/refunds
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">Category</label>
            <input
              type="text"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              placeholder="e.g., MISC, PETTY_CASH"
              className="w-full h-10 px-3 bg-background/50 border border-border rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">Notes (optional)</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes..."
              rows={2}
              className="w-full px-3 py-2 bg-background/50 border border-border rounded-lg text-sm resize-none"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-10 border border-border rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted/30 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 h-10 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "Add Adjustment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ManagerLedgerPage() {
  const { user } = useAuth();
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingLedger, setIsLoadingLedger] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<LedgerEntryType | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch organization and projects
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setIsLoading(true);
        const orgsRes = await managerOrganization.getMyOrganizations();
        if (orgsRes.organizations && orgsRes.organizations.length > 0) {
          const orgId = orgsRes.organizations[0].org_id;
          setOrganizationId(orgId);
          const projectsRes = await managerProjects.getMyProjects(orgId);
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
  const fetchLedger = async () => {
    if (!selectedProjectId) {
      setEntries([]);
      return;
    }

    try {
      setIsLoadingLedger(true);
      const res = await projectLedger.get(selectedProjectId, {
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

  useEffect(() => {
    fetchLedger();
  }, [selectedProjectId, typeFilter]);

  // Handle add adjustment
  const handleAddAdjustment = async (data: LedgerAdjustmentData) => {
    if (!selectedProjectId) return;

    try {
      setIsSubmitting(true);
      await projectLedger.addAdjustment(selectedProjectId, data);
      setShowAddModal(false);
      // Refresh ledger
      await fetchLedger();
    } catch (err) {
      console.error("Failed to add adjustment:", err);
      setError("Failed to add adjustment");
    } finally {
      setIsSubmitting(false);
    }
  };

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
    const materialTotal = entries.filter((e) => e.type === "MATERIAL").reduce((sum, e) => sum + e.amount, 0);
    const wageTotal = entries.filter((e) => e.type === "WAGE").reduce((sum, e) => sum + e.amount, 0);
    const adjustmentTotal = entries.filter((e) => e.type === "ADJUSTMENT").reduce((sum, e) => sum + e.amount, 0);
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
      <DashboardHeader userName={user?.name?.split(" ")[0]} title="Project Ledger" />

      {/* Filters Bar */}
      <div className="glass-card rounded-2xl p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Filter size={16} />
              <span>Filters:</span>
            </div>
            <ProjectSelector projects={projects} selected={selectedProjectId} onSelect={setSelectedProjectId} />
            {selectedProjectId && <TypeFilter selected={typeFilter} onSelect={setTypeFilter} />}
          </div>
          {selectedProjectId && (
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 h-10 px-4 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <PlusCircle size={16} />
              Add Adjustment
            </button>
          )}
        </div>
      </div>

      {!selectedProjectId ? (
        <div className="glass-card rounded-2xl p-12 text-center">
          <Receipt className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-semibold text-muted-foreground">Select a Project</h3>
          <p className="text-sm text-muted-foreground/60 mt-2">
            Choose a project from the dropdown to view and manage its financial ledger.
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

      {/* Add Adjustment Modal */}
      <AddAdjustmentModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleAddAdjustment}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
