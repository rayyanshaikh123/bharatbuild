"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/components/providers/AuthContext";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DataTable, Column } from "@/components/ui/DataTable";
import {  managerProjects, Project, managerMaterials, managerOrganization } from "@/lib/api/manager";
import { Loader2, Filter, Eye } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { MaterialReviewModal } from "@/components/dashboard/MaterialReviewModal";
import { BillImageModal } from "@/components/dashboard/BillImageModal";

// Project selector
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
      className="h-10 px-3 bg-background/50 border border-border rounded-lg text-sm transition-all"
    >
      <option value="">All Projects</option>
      {projects.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name}
        </option>
      ))}
    </select>
  );
}

// ... imports ...

interface MaterialRequest {
  id: string;
  title: string;
  category: string;
  quantity: number;
  description?: string;
  project_name: string;
  engineer_name: string;
  created_at: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
}

interface MaterialBill {
  id: string;
  bill_number: string;
  vendor_name: string;
  total_amount: number;
  project_name: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  bill_image?: string;
  bill_image_mime?: string;
}

export default function ManagerMaterialsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"requests" | "bills">("requests");
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [requests, setRequests] = useState<MaterialRequest[]>([]);
  const [bills, setBills] = useState<MaterialBill[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Review Modal State
  const [reviewItem, setReviewItem] = useState<any | null>(null);
  const [reviewType, setReviewType] = useState<"REQUEST" | "BILL">("REQUEST");
  const [isReviewing, setIsReviewing] = useState(false);
  const [viewBill, setViewBill] = useState<MaterialBill | null>(null);

  // Initial Data Fetch
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        // Fallback: fetch approved organization directly
        let currentOrgId = (user as any)?.orgId;
        
        if (!currentOrgId && user) {
           const orgRes = await managerOrganization.getMyRequests();
           const approved = orgRes.requests?.find((r: any) => r.status === 'APPROVED');
           if (approved) currentOrgId = approved.org_id;
        }

        if (currentOrgId) {
          const res = await managerProjects.getAllProjects(currentOrgId);
          // Filter projects where manager is active or creator
          const authorizedProjects = (res.projects || []).filter((p: any) => p.my_status === 'ACTIVE' || p.is_creator);
          setProjects(authorizedProjects);
        }
      } catch (err) {
        console.error("Failed to fetch projects", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProjects();
  }, [user]);

  // Fetch Materials Data
  const fetchMaterials = async () => {
    try {
      const filters = selectedProjectId ? { project_id: selectedProjectId } : {};
      
      if (activeTab === "requests") {
        const res = await managerMaterials.getRequests(filters);
        setRequests(res.requests || []);
      } else {
        const res = await managerMaterials.getBills(filters);
        setBills(res.bills || []);
      }
    } catch (err) {
      console.error("Failed to fetch materials", err);
    }
  };

  useEffect(() => {
    fetchMaterials();
  }, [selectedProjectId, activeTab]);

  // Handle Review Submission
  const handleModalReview = async (id: string, status: "APPROVED" | "REJECTED", remarks: string) => {
    try {
      setIsReviewing(true);
      if (reviewType === "REQUEST") {
        await managerMaterials.reviewRequest(id, status, remarks);
      } else {
        await managerMaterials.reviewBill(id, status, remarks);
      }
      await fetchMaterials();
      setReviewItem(null); // Close modal
    } catch (err) {
      console.error("Action failed", err);
      alert("Failed to process review. Please try again.");
    } finally {
      setIsReviewing(false);
    }
  };

  // Open Review Modal
  const openReview = (item: any, type: "REQUEST" | "BILL") => {
    setReviewItem(item);
    setReviewType(type);
  };

  // Columns
  const requestColumns: Column<MaterialRequest>[] = useMemo(
    () => [
      {
        key: "title",
        label: "Material",
        sortable: true,
      },
      {
        key: "category",
        label: "Category",
        width: "120px",
      },
      {
        key: "quantity",
        label: "Qty",
        width: "80px",
        render: (val) => val,
      },
      {
        key: "project_name",
        label: "Project",
        render: (val) => val || "-",
      },
      {
        key: "engineer_name",
        label: "Requested By",
        render: (val) => val || "-",
      },
      {
        key: "created_at",
        label: "Date",
        sortable: true,
        render: (val) => new Date(val).toLocaleDateString(),
      },
      {
        key: "status",
        label: "Status",
        width: "120px",
        render: (val) => (
          <span className={`text-xs px-2 py-1 rounded font-medium ${
            val === "APPROVED" ? "bg-green-500/20 text-green-400" :
            val === "REJECTED" ? "bg-red-500/20 text-red-400" :
            "bg-amber-500/20 text-amber-400"
          }`}>
            {val}
          </span>
        ),
      },
      {
        key: "id",
        label: "Actions",
        width: "150px",
        render: (id, row) => 
          row.status === "PENDING" ? (
            <div className="flex gap-2">
              <Button 
                size="sm" 
                variant="outline"
                className="h-7 px-3 text-primary border-primary/20 hover:bg-primary/10"
                onClick={() => openReview(row, "REQUEST")}
              >
                Review
              </Button>
            </div>
          ) : null,
      },
    ],
    []
  );

  const billColumns: Column<MaterialBill>[] = useMemo(
    () => [
      {
        key: "bill_number",
        label: "Bill #",
      },
      {
        key: "vendor_name",
        label: "Vendor",
      },
      {
        key: "total_amount",
        label: "Amount",
        sortable: true,
        render: (val) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(val),
      },
      {
        key: "project_name",
        label: "Project",
      },
      {
        key: "status",
        label: "Status",
        render: (val) => (
          <span className={`text-xs px-2 py-1 rounded font-medium ${
            val === "APPROVED" ? "bg-green-500/20 text-green-400" :
            val === "REJECTED" ? "bg-red-500/20 text-red-400" :
            "bg-amber-500/20 text-amber-400"
          }`}>
            {val}
          </span>
        ),
      },
      {
        key: "id",
        label: "Actions",
        width: "180px",
        render: (id, row) => (
          <div className="flex gap-2">
            <Button 
              size="sm" 
              variant="outline"
              className="h-7 px-2 text-muted-foreground border-border hover:bg-muted/50"
              onClick={() => setViewBill(row)}
            >
              <Eye size={14} className="mr-1" /> View
            </Button>
            {row.status === "PENDING" && (
              <Button 
                size="sm" 
                variant="outline"
                className="h-7 px-3 text-primary border-primary/20 hover:bg-primary/10"
                onClick={() => openReview(row, "BILL")}
              >
                Review
              </Button>
            )}
          </div>
        ),
      },
    ],
    []
  );

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pt-12 md:pt-0 pb-12">
      <DashboardHeader userName={user?.name?.split(" ")[0]} title="Materials Management" />

      {/* Controls Bar */}
      <div className="glass-card rounded-2xl p-4 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2 text-muted-foreground mr-auto">
          <Filter size={16} />
          <span className="text-sm">Filter:</span>
          <ProjectSelector projects={projects} selected={selectedProjectId} onSelect={setSelectedProjectId} />
        </div>

        <div className="flex bg-muted/30 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab("requests")}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
              activeTab === "requests" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Material Requests
          </button>
          <button
            onClick={() => setActiveTab("bills")}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
              activeTab === "bills" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Bill Verification
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="glass-card rounded-2xl p-6">
        {activeTab === "requests" ? (
          <DataTable
            data={requests}
            columns={requestColumns}
            searchable
            searchKeys={["title", "engineer_name"]}
            emptyMessage="No material requests found"
          />
        ) : (
          <DataTable
            data={bills}
            columns={billColumns}
            searchable
            searchKeys={["bill_number", "vendor_name"]}
            emptyMessage="No bills pending verification"
          />
        )}
      </div>

      {/* Review Modal */}
      {reviewItem && (
        <MaterialReviewModal
          item={reviewItem}
          type={reviewType}
          onClose={() => setReviewItem(null)}
          onReview={handleModalReview}
          isReviewing={isReviewing}
        />
      )}

      {/* Bill Image Modal */}
      {viewBill && (
        <BillImageModal
          bill={viewBill}
          onClose={() => setViewBill(null)}
        />
      )}
    </div>
  );
}
