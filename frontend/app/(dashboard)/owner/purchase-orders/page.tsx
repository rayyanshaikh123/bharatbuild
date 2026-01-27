"use client";

import { useEffect, useState } from "react";
import { ShoppingCart, Loader2, ArrowLeft, FileText, Calendar, DollarSign, Check, Clock, Send } from "lucide-react";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { ownerPurchaseOrders, ownerProjects, PurchaseOrder, Project } from "@/lib/api/owner";
import { ownerOrganization } from "@/lib/api/owner";

export default function OwnerPurchaseOrdersPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setIsLoading(true);
        const orgRes = await ownerOrganization.getAll();
        if (orgRes.organizations && orgRes.organizations.length > 0) {
          const org = orgRes.organizations[0];
          const projRes = await ownerProjects.getAll(org.id);
          setProjects(projRes.projects || []);
          if (projRes.projects && projRes.projects.length > 0) {
            setSelectedProject(projRes.projects[0].id);
          }
        }
      } catch (err) {
        console.error("Failed to fetch projects:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProjects();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      fetchOrders();
    }
  }, [selectedProject]);

  const fetchOrders = async () => {
    try {
      setIsLoadingOrders(true);
      const res = await ownerPurchaseOrders.getByProject(selectedProject);
      setOrders(res.purchase_orders || []);
    } catch (err) {
      console.error("Failed to fetch purchase orders:", err);
    } finally {
      setIsLoadingOrders(false);
    }
  };

  const handleDownloadPDF = async (poId: string, poNumber: string) => {
    try {
      setDownloadingId(poId);
      const blob = await ownerPurchaseOrders.getPDF(poId);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `PO_${poNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Failed to download PDF:", err);
    } finally {
      setDownloadingId(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACKNOWLEDGED":
        return "bg-green-500/10 text-green-600 border-green-500/20";
      case "SENT":
        return "bg-blue-500/10 text-blue-600 border-blue-500/20";
      default:
        return "bg-slate-500/10 text-slate-600 border-slate-500/20";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "ACKNOWLEDGED":
        return <Check size={14} className="mr-1" />;
      case "SENT":
        return <Send size={14} className="mr-1" />;
      default:
        return <Clock size={14} className="mr-1" />;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pt-12 md:pt-0">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/owner">
          <Button variant="outline" size="sm">
            <ArrowLeft size={16} className="mr-2" /> Back
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-black tracking-tight text-foreground uppercase italic">
            Purchase <span className="text-primary">Orders</span>
          </h1>
          <p className="text-muted-foreground mt-1">
            Track and manage material purchase orders
          </p>
        </div>
      </div>

      {/* Project Selector */}
      {projects.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {projects.map((project) => (
            <Button
              key={project.id}
              variant={selectedProject === project.id ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedProject(project.id)}
            >
              {project.name}
            </Button>
          ))}
        </div>
      )}

      {/* Orders List */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-foreground uppercase tracking-wide">
            History {isLoadingOrders ? "" : `(${orders.length})`}
          </h3>
        </div>

        {isLoadingOrders ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12">
            <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground">No Purchase Orders</h3>
            <p className="text-muted-foreground mt-2">
              No purchase orders found for this project.
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {orders.map((po) => (
              <div
                key={po.id}
                className="p-5 bg-muted/30 border border-border/50 rounded-xl hover:border-primary/20 transition-colors"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono font-bold text-lg text-foreground">
                        {po.po_number || "Draft"}
                      </span>
                      <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center ${getStatusColor(po.status)}`}>
                        {getStatusIcon(po.status)}
                        {po.status}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Created {new Date(po.created_at).toLocaleDateString()} by {po.created_by_name}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-primary flex items-center justify-end">
                      <DollarSign size={14} className="mr-0.5" />
                      {po.total_amount?.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">{po.vendor_name}</p>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="text-sm">
                    <span className="text-muted-foreground">Request: </span>
                    <span className="font-medium text-foreground">{po.material_request_title}</span>
                  </div>
                  {po.material_request_description && (
                     <p className="text-xs text-muted-foreground line-clamp-2 bg-background/50 p-2 rounded border border-border/30">
                       {po.material_request_description}
                     </p>
                  )}
                </div>

                <div className="flex gap-2 mt-auto">
                  {po.po_pdf_mime && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => handleDownloadPDF(po.id, po.po_number)}
                      disabled={downloadingId === po.id}
                    >
                      {downloadingId === po.id ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <FileText size={14} className="mr-2" />
                      )}
                      Download PDF
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
