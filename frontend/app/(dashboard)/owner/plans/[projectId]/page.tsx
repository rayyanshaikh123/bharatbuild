"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/AuthContext";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DataTable, Column } from "@/components/ui/DataTable";
import { ownerPlans, ownerProjects, ownerOrganization, PlanItem } from "@/lib/api/owner";
import { Loader2, Calendar, FileText, AlertCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";
import Link from "next/link";

export default function OwnerPlanDetailPage() {
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;

  const [plan, setPlan] = useState<any | null>(null);
  const [tasks, setTasks] = useState<PlanItem[]>([]);
  const [projectName, setProjectName] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // Get organization and project details
        const orgRes = await ownerOrganization.get();
        if (orgRes.organization) {
          const projectRes = await ownerProjects.getById(projectId, orgRes.organization.id);
          setProjectName(projectRes.project.name);
        }

        // Get plan and tasks
        const planRes = await ownerPlans.getByProjectId(projectId);
        setPlan(planRes.plan);
        setTasks(planRes.items || []);
      } catch (err) {
        console.error("Failed to fetch plan:", err);
        setError("Failed to load plan details");
      } finally {
        setIsLoading(false);
      }
    };

    if (projectId) {
      fetchData();
    }
  }, [projectId]);

  const columns: Column<PlanItem>[] = [
    {
      key: "task_name",
      label: "Task Name",
      sortable: true,
      render: (value: string, row: PlanItem) => (
        <div>
          <div className="font-medium">{value}</div>
          {row.description && (
            <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
              {row.description}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "period_type",
      label: "Period",
      width: "100px",
      render: (value: string) => (
        <span className="text-xs bg-muted/30 px-2 py-1 rounded capitalize">
          {value}
        </span>
      ),
    },
    {
      key: "period_start",
      label: "Start Date",
      sortable: true,
      width: "120px",
      render: (value: string) => new Date(value).toLocaleDateString("en-IN"),
    },
    {
      key: "period_end",
      label: "End Date",
      sortable: true,
      width: "120px",
      render: (value: string) => new Date(value).toLocaleDateString("en-IN"),
    },
    {
      key: "planned_quantity",
      label: "Qty",
      width: "80px",
      render: (value: number) => value || "-",
    },
    {
      key: "planned_manpower",
      label: "Manpower",
      width: "100px",
      render: (value: number) => value || "-",
    },
    {
      key: "planned_cost",
      label: "Cost",
      width: "120px",
      render: (value: number) =>
        value
          ? new Intl.NumberFormat("en-IN", {
              style: "currency",
              currency: "INR",
              maximumFractionDigits: 0,
            }).format(value)
          : "-",
    },
  ];

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !plan) {
    return (
      <div className="space-y-8 pt-12 md:pt-0 pb-12">
        <DashboardHeader
          userName={user?.name?.split(" ")[0]}
          title="Plan Details"
        />
        <div className="glass-card rounded-2xl p-12 text-center">
          <AlertCircle className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-semibold text-muted-foreground">
            {error || "Plan Not Found"}
          </h3>
          <Link href="/owner/plans">
            <Button variant="outline" className="mt-4">
              <ArrowLeft size={16} className="mr-2" />
              Back to Plans
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pt-12 md:pt-0 pb-12">
      <DashboardHeader
        userName={user?.name?.split(" ")[0]}
        title={`Plan: ${projectName}`}
      />

      {/* Plan Info Card */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold mb-2">Plan Details</h3>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar size={14} />
                {new Date(plan.start_date).toLocaleDateString("en-IN")} -{" "}
                {new Date(plan.end_date).toLocaleDateString("en-IN")}
              </span>
              <span className="flex items-center gap-1">
                <FileText size={14} />
                {tasks.length} {tasks.length === 1 ? "Task" : "Tasks"}
              </span>
            </div>
          </div>
          <Link href="/owner/plans">
            <Button variant="outline">
              <ArrowLeft size={16} className="mr-2" />
              Back to Plans
            </Button>
          </Link>
        </div>
      </div>

      {/* Tasks Table */}
      {tasks.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center">
          <FileText className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-semibold text-muted-foreground">No Tasks</h3>
          <p className="text-sm text-muted-foreground/60 mt-2">
            This plan has no tasks yet.
          </p>
        </div>
      ) : (
        <DataTable
          data={tasks}
          columns={columns}
          searchable={true}
          searchKeys={["task_name", "description"]}
          emptyMessage="No tasks found"
          itemsPerPage={15}
        />
      )}
    </div>
  );
}
