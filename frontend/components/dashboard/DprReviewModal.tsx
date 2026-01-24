import { useState, useEffect } from "react";
import { X, CheckCircle, AlertCircle, Loader2, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { managerDPR } from "@/lib/api/manager";

interface DprReviewModalProps {
  dpr: any;
  onClose: () => void;
  onReview: (dprId: string, status: "APPROVED" | "REJECTED", remarks: string) => Promise<void>;
  isReviewing: boolean;
}

export function DprReviewModal({ dpr, onClose, onReview, isReviewing }: DprReviewModalProps) {
  const [remarks, setRemarks] = useState(dpr.remarks || "");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoadingImage, setIsLoadingImage] = useState(false);
  const [showFullImage, setShowFullImage] = useState(false);

  useEffect(() => {
    // Fetch image if it exists and hasn't been fetched yet
    if (dpr.report_image && !imageUrl) {
      const fetchImage = async () => {
        try {
          setIsLoadingImage(true);
          const blob = await managerDPR.getImage(dpr.id);
          const url = URL.createObjectURL(blob);
          setImageUrl(url);
        } catch (err) {
          console.error("Failed to load DPR image:", err);
        } finally {
          setIsLoadingImage(false);
        }
      };

      fetchImage();
    }
    
    // Cleanup URL on unmount
    return () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl);
    };
  }, [dpr.id, dpr.report_image]); // Only re-run if DPR changes

  if (!dpr) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 animate-in fade-in duration-200">
      <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
          <div>
            <h3 className="text-lg font-bold">DPR Review</h3>
            <p className="text-xs text-muted-foreground">
              {new Date(dpr.report_date).toLocaleDateString()} • {dpr.engineer_name}
            </p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X size={20} />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Details */}
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Work Description</h4>
                <div className="bg-muted/30 p-4 rounded-lg text-sm leading-relaxed border border-border/50">
                  {dpr.work_description}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div className="bg-card border border-border p-3 rounded-lg">
                    <span className="text-xs text-muted-foreground block">Manpower</span>
                    <span className="text-xl font-mono font-medium">{dpr.manpower_total}</span>
                 </div>
                 <div className="bg-card border border-border p-3 rounded-lg">
                    <span className="text-xs text-muted-foreground block">Submitted At</span>
                    <span className="text-sm font-medium">{new Date(dpr.submitted_at).toLocaleTimeString()}</span>
                 </div>
              </div>

              {dpr.plan_item_task_name && (
                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Associated Plan Task</h4>
                   <div className="bg-primary/5 border border-primary/10 p-3 rounded-lg">
                      <p className="font-medium text-primary text-sm">{dpr.plan_item_task_name}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Planned: {new Date(dpr.plan_item_period_start).toLocaleDateString()} - {new Date(dpr.plan_item_period_end).toLocaleDateString()}
                      </p>
                   </div>
                </div>
              )}
              
              {/* Remarks Input */}
              <div>
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Manager Remarks</h4>
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Enter remarks for approval or rejection..."
                  className="w-full min-h-[100px] p-3 rounded-lg bg-background border border-border text-sm focus:ring-2 focus:ring-primary/30 outline-none resize-none"
                  disabled={dpr.status !== 'PENDING' || isReviewing}
                />
              </div>
            </div>

            {/* Right: Image */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Site Photo</h4>
              <div className="relative aspect-video bg-muted/50 rounded-lg border border-border flex items-center justify-center overflow-hidden group">
                {isLoadingImage ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="animate-spin text-primary" />
                    <span className="text-xs text-muted-foreground">Loading image...</span>
                  </div>
                ) : imageUrl ? (
                  <>
                    <img 
                      src={imageUrl} 
                      alt="Site Photo" 
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer" onClick={() => setShowFullImage(true)}>
                       <Maximize2 className="text-white" />
                    </div>
                  </>
                ) : (
                  <span className="text-sm text-muted-foreground italic">No image attached</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-border bg-muted/30 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={isReviewing}>
            Close
          </Button>
          
          {dpr.status === 'PENDING' && (
            <>
              <Button 
                onClick={() => onReview(dpr.id, "REJECTED", remarks)}
                disabled={isReviewing || !remarks.trim()} // Require remarks for rejection? Maybe optional. But usually good practice.
                className="bg-red-500 hover:bg-red-600 text-white border-red-600"
              >
                {isReviewing ? "Processing..." : (
                  <>
                    <AlertCircle size={16} className="mr-2" /> Reject
                  </>
                )}
              </Button>
              <Button 
                onClick={() => onReview(dpr.id, "APPROVED", remarks)}
                disabled={isReviewing}
                className="bg-green-600 hover:bg-green-700 text-white border-green-700"
              >
                {isReviewing ? "Processing..." : (
                  <>
                    <CheckCircle size={16} className="mr-2" /> Approve
                  </>
                )}
              </Button>
            </>
          )}

          {dpr.status !== 'PENDING' && (
            <span className={`px-3 py-2 rounded-lg text-sm font-bold ${
              dpr.status === 'APPROVED' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
            }`}>
              {dpr.status}
            </span>
          )}
        </div>
      </div>
      
      {/* Full Image Preview Modal */}
      {showFullImage && imageUrl && (
         <div className="fixed inset-0 z-[10000] bg-black/90 flex flex-col items-center justify-center p-4" onClick={() => setShowFullImage(false)}>
            <img src={imageUrl} className="max-w-full max-h-[90vh] object-contain rounded-lg" />
            <p className="text-white/70 text-sm mt-2">Click anywhere to close</p>
         </div>
      )}
    </div>
  );
}
