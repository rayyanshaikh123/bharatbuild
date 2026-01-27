"use client";

import { useEffect, useState } from "react";
import {
  Package,
  Loader2,
  ArrowLeft,
  FileText,
  Image as ImageIcon,
  Check,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ownerGRN, ownerProjects, GRN, Project } from "@/lib/api/owner";
import { toast } from "sonner";

export default function OwnerGRNPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [grns, setGRNs] = useState<GRN[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingGRNs, setIsLoadingGRNs] = useState(false);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setIsLoading(true);
        // Get organization first
        const { ownerOrganization } = await import("@/lib/api/owner");
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
      fetchGRNs();
    }
  }, [selectedProject]);

  const fetchGRNs = async () => {
    if (!selectedProject) return;

    try {
      setIsLoadingGRNs(true);
      const res = await ownerGRN.getByProject(selectedProject);
      setGRNs(res.grns || []);
    } catch (err) {
      console.error("Failed to fetch GRNs:", err);
    } finally {
      setIsLoadingGRNs(false);
    }
  };

  const handleViewImage = async (grnId: string, type: "bill" | "proof") => {
    try {
      const blob =
        type === "bill"
          ? await ownerGRN.getBillImage(grnId)
          : await ownerGRN.getProofImage(grnId);

      if (!blob || blob.size === 0) {
        toast.error(
          `${type === "bill" ? "Bill" : "Proof"} image not available`,
        );
        return;
      }

      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
    } catch (err: any) {
      // Only show error if it's not a 404 (image doesn't exist)
      if (
        err?.message &&
        !err.message.includes("404") &&
        !err.message.includes("not found")
      ) {
        console.error("Failed to fetch image:", err);
        toast.error("Failed to load image");
      } else {
        toast.error(
          `${type === "bill" ? "Bill" : "Proof"} image not available`,
        );
      }
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
            Goods Receipt <span className="text-primary">Notes</span>
          </h1>
          <p className="text-muted-foreground mt-1">
            View all goods receipt notes for your projects
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

      {/* GRNs List */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <h3 className="text-lg font-bold text-foreground mb-4 uppercase tracking-wide">
          GRNs {isLoadingGRNs ? "" : `(${grns.length})`}
        </h3>

        {isLoadingGRNs ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : grns.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground">
              No GRNs Found
            </h3>
            <p className="text-muted-foreground mt-2">
              No goods receipt notes for this project yet.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {grns.map((grn) => (
              <div
                key={grn.id}
                className="p-4 bg-muted/30 border border-border/50 rounded-xl"
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      grn.status === "VERIFIED"
                        ? "bg-green-500/10 text-green-600"
                        : "bg-yellow-500/10 text-yellow-600"
                    }`}
                  >
                    {grn.status === "VERIFIED" ? (
                      <Check size={24} />
                    ) : (
                      <Clock size={24} />
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-foreground">
                      {grn.material_request_title}
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2 text-xs text-muted-foreground">
                      <div>
                        <span className="font-semibold">PO:</span>{" "}
                        {grn.po_number}
                      </div>
                      <div>
                        <span className="font-semibold">Vendor:</span>{" "}
                        {grn.vendor_name}
                      </div>
                      <div>
                        <span className="font-semibold">Engineer:</span>{" "}
                        {grn.engineer_name}
                      </div>
                      <div>
                        <span className="font-semibold">Received:</span>{" "}
                        {new Date(grn.received_at).toLocaleDateString()}
                      </div>
                    </div>
                    {grn.remarks && (
                      <p className="text-xs text-muted-foreground mt-2">
                        <strong>Remarks:</strong> {grn.remarks}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    {grn.bill_image_mime && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewImage(grn.id, "bill")}
                      >
                        <ImageIcon size={14} className="mr-1" /> Bill
                      </Button>
                    )}
                    {grn.proof_image_mime && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewImage(grn.id, "proof")}
                      >
                        <ImageIcon size={14} className="mr-1" /> Proof
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
