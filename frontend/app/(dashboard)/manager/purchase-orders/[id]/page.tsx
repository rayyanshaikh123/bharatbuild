"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { managerPurchaseOrders } from "@/lib/api/manager";
import { Loader2, ArrowLeft, Download, FileText, User, Building, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { DataTable } from "@/components/ui/DataTable";

export default function PurchaseOrderDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [po, setPo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const fetchPO = async () => {
      try {
        const res = await managerPurchaseOrders.getById(id as string);
        setPo(res.purchase_order);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load Purchase Order");
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchPO();
  }, [id]);

  const handleDownload = async () => {
    try {
      setDownloading(true);
      const blob = await managerPurchaseOrders.getPdf(id as string);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `PO-${po.po_number}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error(err);
      toast.error("Failed to download PDF");
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!po) return <div className="p-8 text-center">Purchase Order not found</div>;

  const itemColumns = [
    { key: "material_name", label: "Item" },
    { key: "quantity", label: "Qty" },
    { key: "unit", label: "Unit" },
    { 
      key: "rate", 
      label: "Rate", 
      render: (val: any) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(val)
    },
    { 
      key: "amount", 
      label: "Total", 
      render: (val: any) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(val)
    }
  ];

  const items = Array.isArray(po.items) ? po.items : JSON.parse(po.items || "[]");

  return (
    <div className="min-h-screen bg-background pb-12">
      <div className="border-b border-border bg-background/50 backdrop-blur-md sticky top-0 z-10">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft size={18} />
            </Button>
            <div>
              <h1 className="font-semibold text-lg">{po.po_number}</h1>
              <p className="text-xs text-muted-foreground">{po.project_name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
             <Badge variant={po.status === "SENT" ? "default" : "secondary"}>
                {po.status}
             </Badge>
             {po.status === "SENT" && (
                <Button size="sm" onClick={handleDownload} disabled={downloading}>
                    {downloading ? <Loader2 size={14} className="animate-spin mr-2"/> : <Download size={14} className="mr-2"/>}
                    Download PDF
                </Button>
             )}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-4xl space-y-8">
        
        {/* Vendor & Info */}
        <div className="grid md:grid-cols-2 gap-6">
            <div className="glass-card rounded-2xl p-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <Building size={18} className="text-primary"/> 
                    Vendor Details
                </h3>
                <div className="space-y-2 text-sm">
                    <p className="text-lg font-medium">{po.vendor_name}</p>
                    {/* Add more vendor details if available in optimized JSON query */}
                </div>
            </div>

            <div className="glass-card rounded-2xl p-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <User size={18} className="text-primary"/> 
                    Internal Info
                </h3>
                <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Created By:</span>
                        <span className="font-medium">{po.created_by_name}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Date:</span>
                        <span className="font-medium">{new Date(po.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Req Title:</span>
                        <span className="font-medium">{po.material_request_title}</span>
                    </div>
                </div>
            </div>
        </div>

        {/* Items Table */}
        <div className="glass-card rounded-2xl p-6">
             <h3 className="font-semibold mb-4 flex items-center gap-2">
                <ShoppingCart size={18} className="text-primary"/> 
                Order Items
            </h3>
            <DataTable 
                data={items}
                columns={itemColumns}
            />
            <div className="flex justify-end mt-4 pt-4 border-t border-border">
                <div className="text-right">
                    <p className="text-sm text-muted-foreground">Total Amount</p>
                    <p className="text-2xl font-bold text-primary">
                        {new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(po.total_amount)}
                    </p>
                </div>
            </div>
        </div>

      </div>
    </div>
  );
}
