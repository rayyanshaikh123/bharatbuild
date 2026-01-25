"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/AuthContext";
import { managerGrn } from "@/lib/api/manager";
import {
  Loader2,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  FileText,
  Image as ImageIcon,
  AlertTriangle,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import Image from "next/image";

interface GRNItem {
  material_name: string;
  quantity_received: number;
  unit: string;
}

interface POItem {
  material_name: string;
  quantity: string; // comes as string from DB JSON
  unit: string;
  rate: number;
}

interface ValidationResult {
  material_name: string;
  status: "MATCHED" | "SHORT_RECEIVED" | "OVER_RECEIVED" | "NOT_IN_PO";
  po_quantity?: number;
  received_quantity?: number;
  difference?: number;
}

export default function GRNVerificationPage() {
  const { id } = useParams();
  const router = useRouter();
  const [grn, setGrn] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Image State
  const [billUrl, setBillUrl] = useState<string | null>(null);
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const [viewImage, setViewImage] = useState<"BILL" | "PROOF" | null>(null);

  // Verification Logic
  const [comparison, setComparison] = useState<ValidationResult[]>([]);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const res = await managerGrn.getById(id as string);
        setGrn(res.grn);

        // Calculate comparison immediately for UI
        if (res.grn) {
          const receivedItems: GRNItem[] = res.grn.received_items || [];
          const poItems: POItem[] = res.grn.po_items || [];

          const results: ValidationResult[] = [];

          receivedItems.forEach((recv) => {
            const poItem = poItems.find(
              (p) => p.material_name === recv.material_name,
            );
            if (!poItem) {
              results.push({
                material_name: recv.material_name,
                status: "NOT_IN_PO",
              });
            } else {
              const poQty = parseFloat(poItem.quantity);
              const recvQty = recv.quantity_received;

              if (recvQty < poQty) {
                results.push({
                  material_name: recv.material_name,
                  status: "SHORT_RECEIVED",
                  po_quantity: poQty,
                  received_quantity: recvQty,
                  difference: poQty - recvQty,
                });
              } else if (recvQty > poQty) {
                results.push({
                  material_name: recv.material_name,
                  status: "OVER_RECEIVED",
                  po_quantity: poQty,
                  received_quantity: recvQty,
                  difference: recvQty - poQty,
                });
              } else {
                results.push({
                  material_name: recv.material_name,
                  status: "MATCHED",
                  po_quantity: poQty,
                  received_quantity: recvQty,
                });
              }
            }
          });
          setComparison(results);
        }

        // Fetch Images blobs (only if they exist)
        try {
          const billBlob = await managerGrn.getBillImage(id as string);
          if (billBlob && billBlob.size > 0) {
            setBillUrl(URL.createObjectURL(billBlob));
          }
        } catch (e: any) {
          // Only log if it's not a 404 (image doesn't exist)
          if (
            e?.message &&
            !e.message.includes("404") &&
            !e.message.includes("not found")
          ) {
            console.error("Failed to load bill image:", e);
          }
        }

        try {
          const proofBlob = await managerGrn.getDeliveryProofImage(
            id as string,
          );
          if (proofBlob && proofBlob.size > 0) {
            setProofUrl(URL.createObjectURL(proofBlob));
          }
        } catch (e: any) {
          // Only log if it's not a 404 (image doesn't exist)
          if (
            e?.message &&
            !e.message.includes("404") &&
            !e.message.includes("not found")
          ) {
            console.error("Failed to load proof image:", e);
          }
        }
      } catch (err) {
        console.error(err);
        toast.error("Failed to load GRN details");
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchDetails();

    return () => {
      if (billUrl) URL.revokeObjectURL(billUrl);
      if (proofUrl) URL.revokeObjectURL(proofUrl);
    };
  }, [id]);

  const handleAction = async (action: "APPROVE" | "REJECT") => {
    const remarks = window.prompt(
      action === "REJECT"
        ? "Reason for rejection (Required):"
        : "Approval remarks (Optional):",
    );
    if (action === "REJECT" && !remarks) {
      return toast.error("Rejection reason is mandatory");
    }
    if (remarks === null) return; // Cancelled

    try {
      setSubmitting(true);
      if (action === "APPROVE") {
        await managerGrn.approve(id as string, remarks || "Approved");
        toast.success("GRN Approved Successfully");
      } else {
        await managerGrn.reject(id as string, remarks);
        toast.success("GRN Rejected");
      }
      router.push("/manager/grn"); // Go back to list
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || "Action failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!grn) return <div className="p-8 text-center">GRN not found</div>;

  return (
    <div className="min-h-screen bg-background pb-12">
      {/* Header */}
      <div className="border-b border-border bg-background/50 backdrop-blur-md sticky top-0 z-10">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft size={18} />
            </Button>
            <div>
              <h1 className="font-semibold text-lg">Verify GRN</h1>
              <p className="text-xs text-muted-foreground">{grn.po_number}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant={
                grn.status === "APPROVED"
                  ? "default"
                  : grn.status === "REJECTED"
                    ? "destructive"
                    : "secondary"
              }
            >
              {grn.status}
            </Badge>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-5xl space-y-8">
        {/* Comparison Section */}
        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <div className="glass-card rounded-2xl p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <FileText size={18} className="text-primary" />
                Validating Against PO
              </h3>

              <div className="space-y-3">
                {comparison.map((res, idx) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-xl border flex items-center justify-between ${
                      res.status === "MATCHED"
                        ? "bg-green-500/5 border-green-500/10"
                        : res.status === "SHORT_RECEIVED"
                          ? "bg-orange-500/5 border-orange-500/10"
                          : "bg-red-500/5 border-red-500/10"
                    }`}
                  >
                    <div>
                      <p className="font-medium">{res.material_name}</p>
                      <div className="text-sm text-muted-foreground flex gap-4 mt-1">
                        <span>PO Qty: {res.po_quantity}</span>
                        <span className="font-semibold text-foreground">
                          Received: {res.received_quantity}
                        </span>
                      </div>
                    </div>

                    {res.status === "MATCHED" && (
                      <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/20 border-0">
                        Matched
                      </Badge>
                    )}
                    {res.status === "SHORT_RECEIVED" && (
                      <Badge className="bg-orange-500/10 text-orange-600 hover:bg-orange-500/20 border-0">
                        Short by {res.difference}
                      </Badge>
                    )}
                    {res.status === "OVER_RECEIVED" && (
                      <Badge className="bg-red-500/10 text-red-600 hover:bg-red-500/20 border-0">
                        Over by {res.difference}
                      </Badge>
                    )}
                    {res.status === "NOT_IN_PO" && (
                      <Badge className="bg-red-500/10 text-red-600 hover:bg-red-500/20 border-0">
                        Unexpected Item
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Basic Info */}
            <div className="glass-card rounded-2xl p-6 grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground mb-1">Vendor</p>
                <p className="font-medium">{grn.vendor_name}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Received By</p>
                <p className="font-medium">{grn.received_by_name}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Project</p>
                <p className="font-medium">{grn.project_name}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Received Date</p>
                <p className="font-medium">
                  {new Date(grn.received_at).toLocaleDateString()}{" "}
                  {new Date(grn.received_at).toLocaleTimeString()}
                </p>
              </div>
            </div>
          </div>

          {/* Images & Actions */}
          <div className="space-y-6">
            <div className="glass-card rounded-2xl p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <ImageIcon size={18} className="text-primary" />
                Evidence
              </h3>
              <div className="grid p-1 gap-3">
                <Button
                  variant="outline"
                  className="w-full justify-start h-12"
                  onClick={() => setViewImage("BILL")}
                  disabled={!billUrl}
                >
                  <FileText size={16} className="mr-2" />
                  {billUrl ? "View Bill" : "Bill Not Available"}
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start h-12"
                  onClick={() => setViewImage("PROOF")}
                  disabled={!proofUrl}
                >
                  <ImageIcon size={16} className="mr-2" />
                  {proofUrl ? "View Delivery Proof" : "Proof Not Available"}
                </Button>
              </div>
            </div>

            {grn.status === "PENDING" && (
              <div className="glass-card rounded-2xl p-6 sticky top-24">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <AlertCircle size={18} className="text-primary" />
                  Manager Decision
                </h3>
                <div className="space-y-3">
                  <Button
                    className="w-full bg-green-600 hover:bg-green-700"
                    onClick={() => handleAction("APPROVE")}
                    disabled={submitting}
                  >
                    <CheckCircle2 size={16} className="mr-2" /> Approve GRN
                  </Button>
                  <Button
                    variant="destructive"
                    className="w-full bg-red-600/10 text-red-600 hover:bg-red-600/20 border-0"
                    onClick={() => handleAction("REJECT")}
                    disabled={submitting}
                  >
                    <XCircle size={16} className="mr-2" /> Reject GRN
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-4 text-center">
                  Approved GRNs will update inventory automatically.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Image Modal Overlay */}
        {viewImage && (
          <div
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm"
            onClick={() => setViewImage(null)}
          >
            <div
              className="relative max-w-4xl max-h-[90vh] w-full bg-background rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 border-b flex justify-between items-center">
                <h3 className="font-semibold">
                  {viewImage === "BILL" ? "Vendor Bill" : "Delivery Proof"}
                </h3>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setViewImage(null)}
                >
                  <XCircle size={20} />
                </Button>
              </div>
              <div className="p-4 bg-muted/20 h-[70vh] flex items-center justify-center relative">
                <img
                  src={viewImage === "BILL" ? billUrl! : proofUrl!}
                  alt="Evidence"
                  className="max-w-full max-h-full object-contain rounded-lg"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
