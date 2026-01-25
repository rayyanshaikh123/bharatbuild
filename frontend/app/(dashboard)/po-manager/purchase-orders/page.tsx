"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/components/providers/AuthContext";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DataTable, Column } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/badge";
import { 
  purchaseManagerPurchaseOrders, 
  purchaseManagerProjects, 
  purchaseManagerOrganization,
  PurchaseOrder, 
  Project 
} from "@/lib/api/purchase-manager";
import { Loader2, Filter, Upload, Send, Download, Eye, FileText, User, Calendar, Box } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

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

// Upload Modal
function UploadModal({ 
  po, 
  onClose, 
  onUploaded 
}: { 
  po: PurchaseOrder; 
  onClose: () => void;
  onUploaded: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleUpload = async () => {
    if (!file) return;

    try {
      setIsUploading(true);
      await purchaseManagerPurchaseOrders.uploadPDF(po.id, file);
      toast.success("PO PDF uploaded successfully!");
      onUploaded();
      onClose();
    } catch (err) {
      console.error("Upload failed:", err);
      toast.error("Failed to upload PDF");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload PO PDF</DialogTitle>
          <DialogDescription>
            Select the Purchase Order PDF for <strong>{po.po_number}</strong>
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 pt-4">
            <Input
              type="file"
              accept="application/pdf"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) setFile(f);
              }}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Only PDF files are allowed. Max size 10MB.
            </p>

            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={onClose} disabled={isUploading}>
                Cancel
              </Button>
              <Button 
                onClick={handleUpload} 
                disabled={!file || isUploading}
              >
                {isUploading ? <Loader2 className="animate-spin mr-2" /> : <Upload size={16} className="mr-2" />}
                Upload PDF
              </Button>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// View Details Modal
function ViewDetailsModal({
    po,
    onClose
}: {
    po: PurchaseOrder;
    onClose: () => void;
}) {
    // Parse items if string
    const items = typeof po.items === 'string' ? JSON.parse(po.items) : po.items;

    return (
        <Dialog open={true} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <FileText className="text-primary" />
                        Purchase Order Details
                    </DialogTitle>
                    <DialogDescription>
                        PO Number: <span className="font-mono font-bold text-foreground">{po.po_number}</span>
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 pt-2">
                    {/* Status Banner */}
                    <div className={`p-3 rounded-lg flex items-center justify-between ${
                         po.status === 'SENT' ? 'bg-green-500/10 text-green-700' :
                         po.status === 'DRAFT' ? 'bg-amber-500/10 text-amber-700' :
                         'bg-blue-500/10 text-blue-700'
                    }`}>
                         <span className="font-bold flex items-center gap-2">
                             Status: {po.status}
                         </span>
                         <span className="text-sm opacity-80">
                             Created: {new Date(po.created_at).toLocaleDateString()}
                         </span>
                    </div>

                    {/* Vendor & Project Info */}
                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-3 p-4 bg-muted/30 rounded-xl border border-border/50">
                            <h4 className="font-bold flex items-center gap-2 text-foreground">
                                <User size={16} /> Vendor Details
                            </h4>
                            <div className="text-sm space-y-1">
                                <p><span className="text-muted-foreground">Name:</span> {po.vendor_name}</p>
                                <p><span className="text-muted-foreground">Contact:</span> {po.vendor_contact || "-"}</p>
                            </div>
                        </div>
                        <div className="space-y-3 p-4 bg-muted/30 rounded-xl border border-border/50">
                            <h4 className="font-bold flex items-center gap-2 text-foreground">
                                <Box size={16} /> Project Details
                            </h4>
                            <div className="text-sm space-y-1">
                                <p><span className="text-muted-foreground">Project:</span> {po.project_name}</p>
                                <p><span className="text-muted-foreground">Ref Request:</span> {po.material_request_title || "-"}</p>
                            </div>
                        </div>
                    </div>

                    {/* Items Table */}
                    <div>
                        <h4 className="font-bold mb-3">Items</h4>
                        <div className="border border-border rounded-lg overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-muted text-muted-foreground">
                                    <tr>
                                        <th className="px-4 py-2 text-left font-medium">Item</th>
                                        <th className="px-4 py-2 text-right font-medium">Qty</th>
                                        <th className="px-4 py-2 text-right font-medium">Rate</th>
                                        <th className="px-4 py-2 text-right font-medium">Amount</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {Array.isArray(items) && items.map((item: any, idx: number) => (
                                        <tr key={idx} className="bg-card">
                                            <td className="px-4 py-2">{item.name || item.description || "Item"}</td>
                                            <td className="px-4 py-2 text-right">{item.quantity}</td>
                                            <td className="px-4 py-2 text-right">₹{item.rate}</td>
                                            <td className="px-4 py-2 text-right font-mono">₹{item.amount}</td>
                                        </tr>
                                    ))}
                                    <tr className="bg-muted/30 font-bold">
                                        <td colSpan={3} className="px-4 py-3 text-right">Total Amount:</td>
                                        <td className="px-4 py-3 text-right font-mono text-base">₹{po.total_amount.toLocaleString()}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
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
  const [viewingPO, setViewingPO] = useState<PurchaseOrder | null>(null);
  const [sendingPOId, setSendingPOId] = useState<string | null>(null);

  // Fetch projects
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const orgRes = await purchaseManagerOrganization.getMyOrganizations(); 
        if (!orgRes.organizations || orgRes.organizations.length === 0) {
           setIsLoading(false);
           return;
        }

        const res = await purchaseManagerProjects.getMyProjects();
        setProjects(res.projects || []);
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
      const res = await purchaseManagerPurchaseOrders.getAll(selectedProjectId || undefined);
      setPurchaseOrders(res.purchase_orders || []);
    } catch (err) {
      console.error("Failed to fetch POs:", err);
      toast.error("Failed to load purchase orders");
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
        render: (value: string, row: PurchaseOrder) => (
          <button 
             onClick={() => setViewingPO(row)}
             className="font-mono font-bold text-primary hover:underline text-left"
          >
             {value}
          </button>
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
        key: "id", 
        label: "Actions",
        width: "200px",
        render: (_: unknown, row: any) => (
          <div className="flex gap-2">
            <Button
                size="sm"
                variant="ghost"
                onClick={() => setViewingPO(row)}
                title="View Details"
             >
                <Eye size={16} />
             </Button>

            {row.po_pdf_mime ? ( // Check if binary PDF exists
               <Button 
                 size="sm" 
                 variant="outline" 
                 className="gap-1 bg-blue-500/5 text-blue-600 hover:bg-blue-500/10"
                 onClick={async (e) => {
                     e.stopPropagation();
                     try {
                         const blob = await purchaseManagerPurchaseOrders.getPdf(row.id);
                         const url = window.URL.createObjectURL(blob);
                         const a = document.createElement('a');
                         a.href = url;
                         a.download = `PO-${row.po_number}.pdf`;
                         document.body.appendChild(a);
                         a.click();
                         window.URL.revokeObjectURL(url);
                         document.body.removeChild(a);
                     } catch(err) {
                         toast.error("Failed to download PDF");
                     }
                 }}
               >
                  <Download size={14} />
                  PDF
               </Button>
            ) : (
              <Button 
                size="sm" 
                variant="outline" 
                className="gap-1 border-dashed"
                onClick={(e) => {
                    e.stopPropagation();
                    setUploadingPO(row);
                }}
              >
                <Upload size={14} />
                Upload
              </Button>
            )}
              {row.status === "DRAFT" && row.po_pdf_mime && (
                <Button 
                  size="sm" 
                  className="gap-1"
                  disabled={sendingPOId === row.id}
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (sendingPOId === row.id) return;
                    
                    try {
                      setSendingPOId(row.id);
                      await purchaseManagerPurchaseOrders.send(row.id);
                      toast.success("PO sent to site engineer!");
                      fetchPOs();
                    } catch (err: any) { // Type as any to access message safely
                      console.error("Send failed:", err);
                      // If error says strictly "Only DRAFT...", it implies it's already sent, so we can treat it as success or just info
                      if (err.message && err.message.includes("Only DRAFT")) {
                          toast.info("PO was already sent.");
                          fetchPOs();
                      } else {
                          toast.error(err.message || "Failed to send PO");
                      }
                    } finally {
                      setSendingPOId(null);
                    }
                  }}
                >
                  {sendingPOId === row.id ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
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

      {/* View Details Modal */}
      {viewingPO && (
          <ViewDetailsModal
             po={viewingPO}
             onClose={() => setViewingPO(null)}
          />
      )}
    </div>
  );
}
