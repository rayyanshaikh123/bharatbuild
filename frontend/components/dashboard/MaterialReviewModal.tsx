import { useState } from "react";
import { X, CheckCircle, AlertCircle, Package, Receipt } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface MaterialReviewModalProps {
  item: any;
  type: "REQUEST" | "BILL";
  onClose: () => void;
  onReview: (id: string, status: "APPROVED" | "REJECTED", remarks: string) => Promise<void>;
  isReviewing: boolean;
}

export function MaterialReviewModal({ item, type, onClose, onReview, isReviewing }: MaterialReviewModalProps) {
  const [remarks, setRemarks] = useState("");

  if (!item) return null;

  const isRequest = type === "REQUEST";
  const title = isRequest ? "Review Material Request" : "Review Material Bill";
  const Icon = isRequest ? Package : Receipt;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 animate-in fade-in duration-200">
      <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <Icon size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold">{title}</h3>
              <p className="text-xs text-muted-foreground">
                {new Date(item.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Key Details */}
          <div className="bg-muted/30 border border-border rounded-lg p-4 space-y-3">
             <div className="flex justify-between items-center">
               <span className="text-sm text-muted-foreground">Project</span>
               <span className="font-medium text-sm text-right">{item.project_name || "N/A"}</span>
             </div>
             
             {isRequest ? (
               <>
                 <div className="flex justify-between items-center">
                   <span className="text-sm text-muted-foreground">Material</span>
                   <span className="font-bold text-base">{item.title}</span>
                 </div>
                 <div className="flex justify-between items-center">
                   <span className="text-sm text-muted-foreground">Category</span>
                   <span className="text-sm">{item.category || "-"}</span>
                 </div>
                 <div className="flex justify-between items-center">
                   <span className="text-sm text-muted-foreground">Quantity</span>
                   <span className="font-mono font-medium">{item.quantity}</span>
                 </div>
                 <div className="flex justify-between items-center">
                   <span className="text-sm text-muted-foreground">Requested By</span>
                   <span className="text-sm">{item.engineer_name || "Unknown"}</span>
                 </div>
               </>
             ) : (
               <>
                 <div className="flex justify-between items-center">
                   <span className="text-sm text-muted-foreground">Vendor</span>
                   <span className="font-bold text-base">{item.vendor_name}</span>
                 </div>
                 <div className="flex justify-between items-center">
                   <span className="text-sm text-muted-foreground">Bill #</span>
                   <span className="font-mono font-medium">{item.bill_number}</span>
                 </div>
                 <div className="flex justify-between items-center">
                   <span className="text-sm text-muted-foreground">Amount</span>
                   <span className="font-bold text-lg text-primary">
                     {new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(item.total_amount)}
                   </span>
                 </div>
                 {item.bill_image && (
                   <div className="pt-2 border-t border-border">
                     <p className="text-sm text-muted-foreground mb-2">Bill Image</p>
                     <img 
                       src={`data:${item.bill_image_mime || 'image/jpeg'};base64,${item.bill_image}`}
                       alt="Bill"
                       className="w-full max-h-48 object-contain rounded-lg border border-border bg-background cursor-pointer hover:opacity-90"
                       onClick={() => window.open(`data:${item.bill_image_mime || 'image/jpeg'};base64,${item.bill_image}`, '_blank')}
                     />
                   </div>
                 )}
               </>
             )}
          </div>

          {/* Remarks */}
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1 block">Remarks / Feedback</label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Enter remarks..."
              className="w-full min-h-[80px] p-3 rounded-lg bg-background border border-border text-sm focus:ring-2 focus:ring-primary/30 outline-none resize-none"
              disabled={isReviewing}
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-border bg-muted/30 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={isReviewing}>
            Cancel
          </Button>
          
          <Button 
            onClick={() => onReview(item.id, "REJECTED", remarks)}
            disabled={isReviewing || (!remarks.trim() && false)} // Remarks optional?
            className="bg-red-500 hover:bg-red-600 text-white border-red-600"
          >
            {isReviewing ? "Processing..." : (
              <>
                <AlertCircle size={16} className="mr-2" /> Reject
              </>
            )}
          </Button>
          <Button 
            onClick={() => onReview(item.id, "APPROVED", remarks)}
            disabled={isReviewing}
            className="bg-green-600 hover:bg-green-700 text-white border-green-700"
          >
            {isReviewing ? "Processing..." : (
              <>
                <CheckCircle size={16} className="mr-2" /> Approve
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
