"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/providers/AuthContext";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

import { 
  poManagerRequests, 
  poManagerPurchaseOrders, 
  MaterialRequest, 
  POItem,
  PurchaseOrder 
} from "@/lib/api/po-manager";
import { 
  Loader2, 
  ArrowLeft, 
  Save, 
  Upload, 
  Send, 
  FileText, 
  Building2, 
  IndianRupee 
} from "lucide-react";
import { toast } from "sonner";

function CreatePOContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  
  const requestId = searchParams.get("requestId");
  const projectId = searchParams.get("projectId");

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [materialRequest, setMaterialRequest] = useState<MaterialRequest | null>(null);
  const [createdPO, setCreatedPO] = useState<PurchaseOrder | null>(null);

  // Form State
  const [poNumber, setPoNumber] = useState("");
  const [vendorName, setVendorName] = useState("");
  const [vendorContact, setVendorContact] = useState("");
  const [items, setItems] = useState<POItem[]>([]);
  
  // Upload State
  const [poPdfFile, setPoPdfFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!requestId || !projectId) {
        toast.error("Missing Request ID or Project ID");
        return;
      }

      try {
        setIsLoading(true);
        const res = await poManagerRequests.getById(requestId);
        setMaterialRequest(res.request);
        
        // Initialize items from MR
        setItems([{
          material_name: res.request.title,
          quantity: res.request.quantity,
          unit: "units", // Default, MR doesn't have unit strict field in interface but assumable
          rate: 0,
          amount: 0
        }]);

        // Auto-generate PO number suggestion (optional)
        setPoNumber(`PO-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000)}`);
      } catch (err) {
        console.error("Failed to fetch MR:", err);
        toast.error("Failed to load Material Request details");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [requestId, projectId]);

  // Calculations
  const totalAmount = items.reduce((sum, item) => sum + (item.amount || 0), 0);

  const handleItemChange = (index: number, field: keyof POItem, value: any) => {
    const newItems = [...items];
    const item = { ...newItems[index], [field]: value };
    
    // Recalculate amount if rate/qty changes
    if (field === "rate" || field === "quantity") {
      item.amount = (Number(item.quantity) || 0) * (Number(item.rate) || 0);
    }
    
    newItems[index] = item;
    setItems(newItems);
  };

  const handleCreatePO = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestId || !projectId) return;

    if (!poNumber || !vendorName || items.length === 0 || totalAmount <= 0) {
      toast.error("Please fill all required fields and ensure total amount is > 0");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await poManagerPurchaseOrders.create({
        materialRequestId: requestId,
        projectId: projectId,
        poNumber,
        vendorName,
        vendorContact,
        items,
        totalAmount
      });
      
      setCreatedPO(res.purchase_order);
      toast.success("Purchase Order Created! Please upload PDF URL.");
    } catch (err: any) {
      console.error("Failed to create PO:", err);
      toast.error(err.message || "Failed to create Purchase Order");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (file.type !== "application/pdf") {
          toast.error("Please select a PDF file");
          return;
      }

      if (file.size > 10 * 1024 * 1024) { // 10MB limit (matches backend)
          toast.error("File size must be less than 10MB");
          return;
      }

      setPoPdfFile(file);
      // No Base64 conversion needed for FormData upload
  };

  const handleUploadFile = async () => {
    if (!createdPO || !poPdfFile) return;

    try {
      setIsUploading(true);
      await poManagerPurchaseOrders.uploadPDF(createdPO.id, poPdfFile);
      
      setCreatedPO({ ...createdPO, po_pdf_mime: "application/pdf" }); 
      toast.success("PDF Uploaded Successfully");
    } catch (err: any) {
      console.error("Failed to upload PDF:", err);
      toast.error(err.message || "Failed to upload PDF");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSendPO = async () => {
    if (!createdPO) return;
    
    if (!confirm("Are you sure you want to send this PO to the Site Engineer? This cannot be undone.")) return;

    try {
        setIsSubmitting(true);
        await poManagerPurchaseOrders.send(createdPO.id);
        
        setCreatedPO({ ...createdPO, status: "SENT" }); // Immediate UI update
        toast.success("PO Sent Successfully!");
        router.push("/po-manager/purchase-orders");
    } catch (err: any) {
        console.error("Failed to send PO:", err);
        toast.error("Failed to send PO");
    } finally {
         setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
        <div className="flex h-[50vh] items-center justify-center">
            <Loader2 className="animate-spin h-8 w-8 text-primary" />
        </div>
    );
  }

  if (!materialRequest) {
    return (
        <div className="p-8 text-center">
            <h2 className="text-xl font-bold text-red-500">Request Not Found</h2>
            <Button className="mt-4" variant="outline" onClick={() => router.back()}>Go Back</Button>
        </div>
    );
  }

  return (
    <div className="space-y-6 pt-6 pb-12 max-w-5xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft size={16} className="mr-2" /> Back
        </Button>
        <DashboardHeader 
          title="Create Purchase Order" 
          subtitle={`For MR: ${materialRequest.title}`}
        />
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Left Column: MR Details */}
        <div className="md:col-span-1 space-y-6">
          <div className="glass-card p-6 rounded-xl space-y-4">
            <div className="flex items-center gap-2 text-primary font-semibold">
              <FileText size={20} />
              <h3>Material Request</h3>
            </div>
            
            <div className="space-y-3 text-sm">
               <div>
                 <span className="text-muted-foreground block text-xs uppercase tracking-wider">Title</span>
                 <span className="font-medium">{materialRequest.title}</span>
               </div>
               <div>
                 <span className="text-muted-foreground block text-xs uppercase tracking-wider">Category</span>
                 <Badge variant="secondary" className="mt-1">{materialRequest.category}</Badge>
               </div>
               <div>
                 <span className="text-muted-foreground block text-xs uppercase tracking-wider">Project</span>
                 <div className="flex items-center gap-1 mt-1">
                   <Building2 size={12} className="text-muted-foreground" />
                   <span>{materialRequest.project_name}</span>
                 </div>
               </div>
               <div>
                 <span className="text-muted-foreground block text-xs uppercase tracking-wider">Requested Qty</span>
                 <span className="font-mono text-lg">{materialRequest.quantity}</span>
               </div>
               {materialRequest.description && (
                   <div>
                     <span className="text-muted-foreground block text-xs uppercase tracking-wider">Description</span>
                     <p className="text-muted-foreground mt-1 bg-muted/50 p-2 rounded">{materialRequest.description}</p>
                   </div>
               )}
            </div>
          </div>
        </div>

        {/* Right Column: PO Form */}
        <div className="md:col-span-2 space-y-6">
            {!createdPO ? (
                // STEP 1: CREATE PO FORM
                <form onSubmit={handleCreatePO} className="glass-card p-6 rounded-xl space-y-6 animate-in fade-in slide-in-from-right-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="poNumber">PO Number</Label>
                            <Input 
                                id="poNumber" 
                                value={poNumber} 
                                onChange={(e) => setPoNumber(e.target.value)}
                                placeholder="Enter PO Number"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="vendorContact">Vendor Contact</Label>
                            <Input 
                                id="vendorContact" 
                                value={vendorContact} 
                                onChange={(e) => setVendorContact(e.target.value)}
                                placeholder="Phone / Email"
                            />
                        </div>
                    </div>
                    
                    <div className="space-y-2">
                        <Label htmlFor="vendorName">Vendor Name</Label>
                        <Input 
                            id="vendorName" 
                            value={vendorName} 
                            onChange={(e) => setVendorName(e.target.value)}
                            placeholder="Supplier Company Name"
                            required
                        />
                    </div>

                    <div className="space-y-4 pt-4 border-t border-border">
                        <div className="flex justify-between items-center">
                            <Label>Line Items</Label>
                        </div>
                        
                        {items.map((item, idx) => (
                            <div key={idx} className="grid grid-cols-12 gap-2 items-end bg-muted/20 p-3 rounded-lg">
                                <div className="col-span-4">
                                    <Label className="text-xs">Item</Label>
                                    <Input value={item.material_name} disabled className="h-8 text-sm" />
                                </div>
                                <div className="col-span-2">
                                    <Label className="text-xs">Qty</Label>
                                    <Input 
                                        type="number" 
                                        value={item.quantity} 
                                        onChange={(e) => handleItemChange(idx, "quantity", e.target.value)}
                                        className="h-8 text-sm"
                                    />
                                </div>
                                <div className="col-span-3">
                                    <Label className="text-xs">Rate (₹)</Label>
                                    <Input 
                                        type="number" 
                                        value={item.rate} 
                                        onChange={(e) => handleItemChange(idx, "rate", e.target.value)}
                                        className="h-8 text-sm"
                                        placeholder="0.00"
                                    />
                                </div>
                                <div className="col-span-3">
                                    <Label className="text-xs">Amount</Label>
                                    <div className="h-8 flex items-center px-3 bg-muted rounded text-sm font-mono font-medium">
                                        ₹{item.amount.toLocaleString()}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="flex justify-between items-center pt-4 border-t border-border bg-muted/10 p-4 rounded-lg">
                        <span className="font-semibold text-muted-foreground">Total Amount</span>
                        <div className="flex items-center gap-1 text-2xl font-bold text-primary">
                            <IndianRupee size={20} />
                            {totalAmount.toLocaleString()}
                        </div>
                    </div>

                    <div className="pt-4 flex justify-end">
                        <Button type="submit" disabled={isSubmitting} className="min-w-[150px]">
                            {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2" size={16} />}
                            Create Draft PO
                        </Button>
                    </div>
                </form>
            ) : (
                // STEP 2: UPLOAD & SEND
                <div className="space-y-6 animate-in fade-in zoom-in-95">
                    <div className="glass-card p-6 rounded-xl border-l-4 border-green-500 bg-green-500/5">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 bg-green-500/10 rounded-full flex items-center justify-center text-green-600">
                                <FileText size={20} />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg text-foreground">Draft PO Created!</h3>
                                <p className="text-muted-foreground text-sm">PO Number: <span className="font-mono text-foreground">{createdPO.po_number}</span></p>
                            </div>
                        </div>
                    </div>

                    <div className="glass-card p-6 rounded-xl space-y-4">
                        <div className="flex items-center gap-2 font-semibold">
                            <Upload size={18} />
                            <h3>Upload Signed PO (PDF)</h3>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            Please upload the signed Purchase Order PDF. Max size: 10MB.
                        </p>
                        
                        <div className="flex gap-2 items-center">
                             <Input 
                                type="file"
                                accept="application/pdf"
                                onChange={handleFileChange}
                                disabled={!!createdPO.po_pdf_mime || createdPO.status === "SENT" || isUploading}
                                className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                             />
                             <Button 
                                onClick={handleUploadFile} 
                                disabled={isUploading || !poPdfFile || !!createdPO.po_pdf_mime || createdPO.status === "SENT"}
                             >
                                {isUploading ? <Loader2 className="animate-spin" /> : "Upload PDF"}
                             </Button>
                        </div>
                        
                        {createdPO.po_pdf_mime && (
                             <div className="bg-muted/30 p-2 rounded text-xs flex items-center gap-2 text-green-600">
                                 <FileText size={12} /> PDF Uploaded
                             </div>
                        )}
                    </div>

                    <div className="glass-card p-6 rounded-xl space-y-4">
                         <div className="flex items-center gap-2 font-semibold">
                            <Send size={18} />
                            <h3>Finalize & Send</h3>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            Sending the PO will notify the Site Engineer ({materialRequest.engineer_name}). This action cannot be undone.
                        </p>

                        <Button 
                            className="w-full" 
                            size="lg" 
                            onClick={handleSendPO}
                            disabled={!createdPO.po_pdf_mime || isSubmitting || createdPO.status !== "DRAFT"}
                        >
                             {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <Send className="mr-2" size={18} />}
                             Send Purchase Order
                        </Button>
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
}

export default function CreatePOPage() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin" /></div>}>
            <CreatePOContent />
        </Suspense>
    );
}
