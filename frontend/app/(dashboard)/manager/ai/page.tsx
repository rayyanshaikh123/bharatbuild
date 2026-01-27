"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/providers/AuthContext";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import {
  managerProjects,
  Project,
  managerAI,
  managerOrganization,
} from "@/lib/api/manager";
import {
  Rocket,
  AlertTriangle,
  Package2,
  ShieldCheck,
  Activity,
  BrainCircuit,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

// Project Selector
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
      <option value="">Select a Project</option>
      {projects.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name}
        </option>
      ))}
    </select>
  );
}

// Health Tab
function HealthAnalysis({ projectId }: { projectId: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    managerAI
      .getProjectHealth(projectId)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [projectId]);

  if (loading)
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  if (!data) return <div>No data available</div>;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Card className="glass-card col-span-full">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <Activity className="text-primary" />
            Health Score: {data.health_score}/100
          </CardTitle>
          <CardDescription>
            {data.health_status} - {data.overall_assessment}
          </CardDescription>
        </CardHeader>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Budget</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">
            {data.financial_health?.utilization ?? 0}%
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Utilization of budget
          </p>
          <p className="mt-2 text-sm">
            {data.financial_health?.status ?? "N/A"}
          </p>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Schedule</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">
            {data.schedule_health?.delayed_percentage ?? 0}%
          </div>
          <p className="text-sm text-muted-foreground mt-2">Tasks delayed</p>
          <p className="mt-2 text-sm">
            {data.schedule_health?.status ?? "N/A"}
          </p>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Operational</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">
            {data.operational_health?.score ?? 0}/10
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Operational Score
          </p>
          <p className="mt-2 text-sm">
            {data.operational_health?.issues ?? "No data"}
          </p>
        </CardContent>
      </Card>

      <div className="col-span-full mt-4">
        <h3 className="font-semibold mb-2">Recommendations</h3>
        <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
          {data.recommendations?.map((rec: string, i: number) => (
            <li key={i}>{rec}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// Delays Tab
function DelayAnalysis({ projectId }: { projectId: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    managerAI
      .getDelayAnalysis(projectId)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [projectId]);

  if (loading) return <Skeleton className="h-[400px] w-full" />;
  if (!data) return <div>No delay analysis available</div>;

  return (
    <div className="space-y-6">
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Root Cause Analysis</CardTitle>
          <CardDescription>
            AI-identified primary causes for project delays
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.root_causes?.map((cause: any, i: number) => (
              <div
                key={i}
                className="flex justify-between items-center border-b border-border pb-2 last:border-0"
              >
                <span>{cause.cause}</span>
                <span className="font-mono bg-muted px-2 py-1 rounded text-xs">
                  {cause.probability}% Prob.
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Impact Assessment</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {data.impact_assessment}
            </p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Recovery Plan</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
              {data.recovery_steps?.map((step: string, i: number) => (
                <li key={i}>{step}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Materials Tab
function MaterialAnalysis({ projectId }: { projectId: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    managerAI
      .getMaterialAnomalies(projectId)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [projectId]);

  if (loading) return <Skeleton className="h-[400px] w-full" />;
  if (!data) return <div>No material data available</div>;

  return (
    <div className="space-y-6">
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package2 className="text-primary" />
            Consumption Anomalies
          </CardTitle>
          <CardDescription>
            Detected irregularities in material usage vs requests
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.anomalies?.length === 0 ? (
            <p className="text-muted-foreground">
              No significant anomalies detected.
            </p>
          ) : (
            <div className="space-y-4">
              {data.anomalies?.map((anomaly: any, i: number) => (
                <div
                  key={i}
                  className="p-3 bg-muted/20 rounded-lg border border-border"
                >
                  <div className="flex justify-between font-medium">
                    <span>{anomaly.category}</span>
                    <span className="text-red-400">{anomaly.severity}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {anomaly.description}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Expected: {anomaly.expected} | Actual: {anomaly.actual}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Audit Tab
function AuditAnalysis({ projectId }: { projectId: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    managerAI
      .getAuditInsights(projectId)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [projectId]);

  if (loading) return <Skeleton className="h-[400px] w-full" />;
  if (!data) return <div>No audit data available</div>;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Risk Factors</CardTitle>
        </CardHeader>
        <CardContent>
          {data.risk_factors?.map((risk: any, i: number) => (
            <div key={i} className="mb-4 last:mb-0">
              <h4 className="font-semibold text-sm">{risk.factor}</h4>
              <p className="text-xs text-muted-foreground">{risk.details}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Unusual Patterns</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground">
            {data.patterns?.map((pattern: string, i: number) => (
              <li key={i}>{pattern}</li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ManagerAIPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const orgsRes = await managerOrganization.getMyOrganizations();
        if (orgsRes.organizations && orgsRes.organizations.length > 0) {
          const approvedOrg = orgsRes.organizations[0];
          const res = await managerProjects.getMyProjects(approvedOrg.id);
          setProjects(res.projects || []);

          if (!selectedProjectId && res.projects && res.projects.length > 0) {
            setSelectedProjectId(res.projects[0].id);
          }
        }
      } catch (e) {
        console.error("Failed to fetch projects:", e);
      }
    };
    fetchProjects();
  }, []);

  return (
    <div className="space-y-8 pt-12 md:pt-0 pb-12">
      <DashboardHeader
        userName={user?.name?.split(" ")[0]}
        title="AI Insights Center"
      />

      {/* Controls */}
      <div className="glass-card rounded-2xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BrainCircuit className="text-primary h-5 w-5" />
          <span className="font-medium hidden md:block">
            Select project to analyze
          </span>
        </div>
        <ProjectSelector
          projects={projects}
          selected={selectedProjectId}
          onSelect={setSelectedProjectId}
        />
      </div>

      {/* Content */}
      <div className="min-h-[500px]">
        {!selectedProjectId ? (
          <div className="glass-card rounded-2xl p-12 text-center text-muted-foreground">
            <Rocket className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>Select a project to generate AI insights</p>
          </div>
        ) : (
          <Tabs defaultValue="health" className="space-y-6">
            <TabsList className="bg-background/20 backdrop-blur border border-border">
              <TabsTrigger
                value="health"
                className="data-[state=active]:bg-primary/20"
              >
                <Activity className="w-4 h-4 mr-2" /> Health
              </TabsTrigger>
              <TabsTrigger
                value="delays"
                className="data-[state=active]:bg-primary/20"
              >
                <AlertTriangle className="w-4 h-4 mr-2" /> Delays
              </TabsTrigger>
              <TabsTrigger
                value="materials"
                className="data-[state=active]:bg-primary/20"
              >
                <Package2 className="w-4 h-4 mr-2" /> Materials
              </TabsTrigger>
              <TabsTrigger
                value="audit"
                className="data-[state=active]:bg-primary/20"
              >
                <ShieldCheck className="w-4 h-4 mr-2" /> Audit
              </TabsTrigger>
            </TabsList>

            <TabsContent
              value="health"
              className="animate-in fade-in-50 slide-in-from-bottom-2"
            >
              <HealthAnalysis projectId={selectedProjectId} />
            </TabsContent>

            <TabsContent
              value="delays"
              className="animate-in fade-in-50 slide-in-from-bottom-2"
            >
              <DelayAnalysis projectId={selectedProjectId} />
            </TabsContent>

            <TabsContent
              value="materials"
              className="animate-in fade-in-50 slide-in-from-bottom-2"
            >
              <MaterialAnalysis projectId={selectedProjectId} />
            </TabsContent>

            <TabsContent
              value="audit"
              className="animate-in fade-in-50 slide-in-from-bottom-2"
            >
              <AuditAnalysis projectId={selectedProjectId} />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
