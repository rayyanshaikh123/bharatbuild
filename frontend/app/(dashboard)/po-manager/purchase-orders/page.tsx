"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/components/providers/AuthContext";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DataTable, Column } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/badge";
import { poManagerPurchaseOrders, poManagerProjects, PurchaseOrder, Project } from "@/lib/api/po-manager";
import { Loader2, FileText, Filter, Upload, Eye, Send, Download } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";

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
      className="h-10 px-3 bg-background/50 border border-border rounded-lg text-sm transition-all min-w-[200px]"
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

// Upload Modal - Now prompts for URL since backend stores URL
function UploadModal({ 
  po, 
  onClose, 
  onUploaded 
}: { 
  po: PurchaseOrder; 
  onClose: () => void;
  onUploaded: () => void;
}) {
  const [pdfUrl, setPdfUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const handleUpload = async () => {
    if (!pdfUrl.trim()) return;

    try {
      setIsUploading(true);
      await poManagerPurchaseOrders.uploadPDF(po.id, pdfUrl);
      toast.success("PO PDF URL saved successfully!");
      onUploaded();
      onClose();
    } catch (err) {
      console.error("Upload failed:", err);
      toast.error("Failed to save PDF URL");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-md p-6">
        <h3 className="text-lg font-bold mb-4">Add PO PDF URL</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Enter the URL for the Purchase Order PDF for <strong>{po.po_number}</strong>
        </p>

        <input
          type="url"
          value={pdfUrl}
          onChange={(e) => setPdfUrl(e.target.value)}
          placeholder="https://example.com/po-document.pdf"
          className="w-full h-10 px-3 bg-background/50 border border-border rounded-lg text-sm"
        />
        <p className="text-xs text-muted-foreground mt-2">
          Upload your PDF to a cloud storage and paste the public URL here.
        </p>

        <div className="flex gap-3 mt-6">
          <Button variant="outline" onClick={onClose} className="flex-1" disabled={isUploading}>
            Cancel
          </Button>
          <Button 
            onClick={handleUpload} 
            className="flex-1" 
            disabled={!pdfUrl.trim() || isUploading}
          >
            {isUploading ? <Loader2 className="animate-spin" size={16} /> : "Save URL"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function PurchaseOrdersPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingPOs, setIsLoadingPOs] = useState(false);
  const [uploadingPO, setUploadingPO] = useState<PurchaseOrder | null>(null);

  // Fetch projects
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await poManagerProjects.getMyProjects();
        setProjects(res.projects);
      } catch (err) {
        console.error("Failed to fetch projects:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProjects();
  }, []);

  // Fetch POs
  const fetchPOs = async () => {
    try {
      setIsLoadingPOs(true);
      const res = await poManagerPurchaseOrders.getAll(selectedProjectId || undefined);
      setPurchaseOrders(res.purchase_orders);
    } catch (err) {
      console.error("Failed to fetch POs:", err);
    } finally {
      setIsLoadingPOs(false);
    }
  };

  useEffect(() => {
    fetchPOs();
  }, [selectedProjectId]);

  // Table columns
  const columns: Column<PurchaseOrder>[] = useMemo(
    () => [
      {
        key: "po_number",
        label: "PO Number",
        sortable: true,
        render: (value: string) => (
          <span className="font-mono font-medium">{value}</span>
        ),
      },
      {
        key: "project_name",
        label: "Project",
        render: (value: string) => <span className="text-sm">{value}</span>,
      },
      {
        key: "vendor_name",
        label: "Vendor",
        render: (value: string) => <span className="text-sm">{value}</span>,
      },
      {
        key: "total_amount",
        label: "Amount",
        width: "120px",
        render: (value: number) => (
          <span className="font-mono">₹{value.toLocaleString()}</span>
        ),
      },
      {
        key: "status",
        label: "Status",
        width: "120px",
        render: (value: string) => {
          const statusColors: Record<string, string> = {
            DRAFT: "bg-amber-500/20 text-amber-400 border-amber-500/30",
            SENT: "bg-green-500/20 text-green-400 border-green-500/30",
            ACKNOWLEDGED: "bg-blue-500/20 text-blue-400 border-blue-500/30",
          };
          return (
            <Badge variant="outline" className={statusColors[value] || ""}>
              {value}
            </Badge>
          );
        },
      },
      {
        key: "created_at",
        label: "Created",
        width: "120px",
        render: (value: string) => new Date(value).toLocaleDateString(),
      },
      {
        key: "actions",
        label: "Actions",
        width: "150px",
        render: (_: unknown, row: PurchaseOrder) => (
          <div className="flex gap-2">
            {row.po_pdf_url ? (
              <Button size="sm" variant="outline" className="gap-1">
                <Download size={14} />
                PDF
              </Button>
            ) : (
              <Button 
                size="sm" 
                variant="outline" 
                className="gap-1"
                onClick={() => setUploadingPO(row)}
              >
                <Upload size={14} />
                Upload
              </Button>
            )}
              {row.status === "DRAFT" && row.po_pdf_url && (
                <Button 
                  size="sm" 
                  className="gap-1"
                  onClick={async () => {
                    try {
                      await poManagerPurchaseOrders.send(row.id);
                      toast.success("PO sent to site engineer!");
                      fetchPOs();
                    } catch (err) {
                      console.error("Send failed:", err);
                      toast.error("Failed to send PO");
                    }
                  }}
                >
                  <Send size={14} />
                  Send
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
      <DashboardHeader userName={user?.name?.split(" ")[0]} title="Purchase Orders" />

      {/* Filters Bar */}
      <div className="glass-card rounded-2xl p-4 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Filter size={16} />
          <span className="text-sm">Filter:</span>
        </div>
        <ProjectSelector 
          projects={projects} 
          selected={selectedProjectId} 
          onSelect={setSelectedProjectId} 
        />
      </div>

      {/* PO Table */}
      {isLoadingPOs ? (
        <div className="glass-card rounded-2xl p-12 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="ml-2 text-muted-foreground">Loading purchase orders...</span>
        </div>
      ) : (
        <DataTable
          data={purchaseOrders}
          columns={columns}
          searchable
          searchKeys={["po_number", "project_name", "vendor_name"]}
          emptyMessage="No purchase orders found."
          itemsPerPage={15}
        />
      )}

      {/* Upload Modal */}
      {uploadingPO && (
        <UploadModal 
          po={uploadingPO} 
          onClose={() => setUploadingPO(null)} 
          onUploaded={fetchPOs}
        />
      )}
    </div>
  );
}
