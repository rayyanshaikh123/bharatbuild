"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/AuthContext";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { managerDpr } from "@/lib/api/dpr";
import { Button } from "@/components/ui/Button";
import {
  ArrowLeft,
  Loader2,
  Calendar,
  User,
  Clock,
  CheckCircle,
  AlertCircle,
  FileText,
  Maximize2,
} from "lucide-react";
import { toast } from "sonner";

export default function DprReviewPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const dprId = params.id as string;

  const [dpr, setDpr] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Image State
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoadingImage, setIsLoadingImage] = useState(false);
  const [showFullImage, setShowFullImage] = useState(false);

  // Review State
  const [remarks, setRemarks] = useState("");
  const [isReviewing, setIsReviewing] = useState(false);

  useEffect(() => {
    const fetchDpr = async () => {
      try {
        setIsLoading(true);
        const res = await managerDpr.getById(dprId);

        // Parse material_usage if it's a string
        let dprData = res.dpr;
        if (
          dprData.material_usage &&
          typeof dprData.material_usage === "string"
        ) {
          try {
            dprData.material_usage = JSON.parse(dprData.material_usage);
          } catch (e) {
            console.error("Failed to parse material_usage:", e);
            dprData.material_usage = [];
          }
        }

        console.log("DPR Data:", dprData);
        console.log("Material Usage:", dprData.material_usage);

        setDpr(dprData);
        setRemarks(dprData.remarks || "");
      } catch (err) {
        console.error("Failed to fetch DPR:", err);
        toast.error("Failed to load DPR details");
      } finally {
        setIsLoading(false);
      }
    };

    if (dprId) {
      fetchDpr();
    }
  }, [dprId]);

  // Fetch image separately when DPR is loaded
  useEffect(() => {
    if (dpr && dpr.report_image && !imageUrl) {
      const fetchImage = async () => {
        try {
          setIsLoadingImage(true);
          const blob = await managerDpr.getImage(dpr.id);
          const url = URL.createObjectURL(blob);
          setImageUrl(url);
        } catch (err) {
          console.error("Failed to load image:", err);
        } finally {
          setIsLoadingImage(false);
        }
      };
      fetchImage();
    }

    return () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl);
    };
  }, [dpr]);

  const handleReview = async (status: "APPROVED" | "REJECTED") => {
    try {
      setIsReviewing(true);
      await managerDpr.review(dprId, status, remarks);
      toast.success(
        `DPR ${status === "APPROVED" ? "Approved" : "Rejected"} Successfully`,
      );
      router.push("/manager/dprs");
    } catch (err) {
      console.error("Review failed:", err);
      toast.error("Failed to submit review");
    } finally {
      setIsReviewing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!dpr) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        DPR not found or unauthorized.
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pt-12 md:pt-0 pb-12">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => router.back()}>
          <ArrowLeft size={16} className="mr-2" />
          Back
        </Button>
        <h1 className="text-2xl font-bold">DPR Review</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header Card */}
          <div className="glass-card rounded-2xl p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-foreground mb-1">
                  {dpr.project_name}
                </h2>
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <User size={14} />
                  <span>{dpr.engineer_name}</span>
                  <span>•</span>
                  <Calendar size={14} />
                  <span>{new Date(dpr.report_date).toLocaleDateString()}</span>
                </div>
              </div>
              <div
                className={`px-3 py-1 rounded-full text-xs font-bold ${
                  dpr.status === "APPROVED"
                    ? "bg-green-500/10 text-green-500"
                    : dpr.status === "REJECTED"
                      ? "bg-red-500/10 text-red-500"
                      : "bg-amber-500/10 text-amber-500"
                }`}
              >
                {dpr.status}
              </div>
            </div>

            <div className="mt-6">
              <div className="p-4 bg-muted/30 rounded-xl border border-border">
                <p className="text-xs text-muted-foreground mb-1">
                  Submitted At
                </p>
                <p className="text-sm font-medium">
                  {new Date(dpr.submitted_at).toLocaleTimeString()}
                </p>
              </div>
            </div>
          </div>

          {/* Work Description */}
          <div className="glass-card rounded-2xl p-6">
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <FileText size={18} className="text-primary" />
              Work Description
            </h3>
            <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
              {dpr.description}
            </p>
          </div>

          {/* Material Usage */}
          {dpr.material_usage && dpr.material_usage.length > 0 && (
            <div className="glass-card rounded-2xl p-6">
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <FileText size={18} className="text-primary" />
                Material Usage
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left text-xs font-semibold text-muted-foreground pb-3 px-2">
                        Material
                      </th>
                      <th className="text-left text-xs font-semibold text-muted-foreground pb-3 px-2">
                        Category
                      </th>
                      <th className="text-right text-xs font-semibold text-muted-foreground pb-3 px-2">
                        Quantity
                      </th>
                      <th className="text-left text-xs font-semibold text-muted-foreground pb-3 px-2">
                        Unit
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {dpr.material_usage.map((item: any, idx: number) => (
                      <tr
                        key={idx}
                        className="border-b border-border/50 last:border-0"
                      >
                        <td className="py-3 px-2 text-sm font-medium">
                          {item.material_name}
                        </td>
                        <td className="py-3 px-2 text-sm text-muted-foreground">
                          {item.category || "-"}
                        </td>
                        <td className="py-3 px-2 text-sm font-mono text-right">
                          {item.quantity_used}
                        </td>
                        <td className="py-3 px-2 text-sm text-muted-foreground">
                          {item.unit}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Review Actions */}
          <div className="glass-card rounded-2xl p-6">
            <h3 className="font-bold mb-4">Manager Review</h3>

            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Enter remarks..."
              className="w-full min-h-[100px] p-3 rounded-xl bg-background border border-border text-sm mb-4 focus:ring-2 focus:ring-primary/30 outline-none resize-none"
              disabled={dpr.status !== "PENDING" || isReviewing}
            />

            {dpr.status === "PENDING" ? (
              <div className="flex gap-3">
                <Button
                  onClick={() => handleReview("REJECTED")}
                  disabled={isReviewing || !remarks.trim()}
                  variant="destructive"
                  className="w-full sm:w-auto"
                >
                  {isReviewing ? (
                    <Loader2 className="animate-spin" size={16} />
                  ) : (
                    <AlertCircle size={16} className="mr-2" />
                  )}
                  Reject
                </Button>
                <Button
                  onClick={() => handleReview("APPROVED")}
                  disabled={isReviewing}
                  className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white"
                >
                  {isReviewing ? (
                    <Loader2 className="animate-spin" size={16} />
                  ) : (
                    <CheckCircle size={16} className="mr-2" />
                  )}
                  Approve
                </Button>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground italic">
                This DPR has already been {dpr.status.toLowerCase()}.
              </div>
            )}
          </div>
        </div>

        {/* Sidebar / Image */}
        <div className="space-y-6">
          <div className="glass-card rounded-2xl p-6">
            <h3 className="font-bold mb-4">Site Photo</h3>
            <div
              className="relative aspect-[3/4] bg-muted/50 rounded-xl border border-border flex items-center justify-center overflow-hidden group cursor-pointer"
              onClick={() => imageUrl && setShowFullImage(true)}
            >
              {isLoadingImage ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="animate-spin text-primary" />
                  <span className="text-xs text-muted-foreground">
                    Loading image...
                  </span>
                </div>
              ) : imageUrl ? (
                <>
                  <img
                    src={imageUrl}
                    alt="Site"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Maximize2 className="text-white" />
                  </div>
                </>
              ) : (
                <span className="text-sm text-muted-foreground italic">
                  No image attached
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Full Image Modal */}
      {showFullImage && imageUrl && (
        <div
          className="fixed inset-0 z-[10000] bg-black/90 flex flex-col items-center justify-center p-4"
          onClick={() => setShowFullImage(false)}
        >
          <img
            src={imageUrl}
            className="max-w-full max-h-[90vh] object-contain rounded-lg"
          />
          <p className="text-white/70 text-sm mt-2">Click anywhere to close</p>
        </div>
      )}
    </div>
  );
}
