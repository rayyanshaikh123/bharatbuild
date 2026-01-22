// Types for Analytics API responses - based on backend analytics.service.js

// ==================== OWNER ANALYTICS ====================

export interface OwnerOverview {
  total_projects: number;
  projects_by_status: Record<string, number>;
  total_budget: number;
  total_current_invested: number;
  budget_utilization_percentage: number;
  total_material_cost: number;
  total_wages_paid: number;
  total_pending_approvals: {
    material_requests: number;
    material_bills: number;
    wages: number;
  };
  top_5_costliest_projects: {
    id: number;
    name: string;
    budget: number;
    current_invested: number;
    status: string;
  }[];
  delayed_projects_count: number;
}

export interface ProjectAnalytics {
  project: {
    id: number;
    name: string;
    status: string;
    budget: number;
    current_invested: number;
  };
  budget_vs_invested: {
    budget: number;
    invested: number;
    remaining: number;
    utilization_percentage: number;
  };
  material_cost_breakdown: Record<string, number>;
  wages_cost_breakdown: {
    total: number;
    by_skill: Record<string, number>;
  };
  attendance_summary: {
    total_hours: number;
    unique_labours: number;
    avg_hours_per_labour: number;
  };
  plan_progress: {
    total_items: number;
    completed: number;
    pending: number;
    delayed: number;
    completion_percentage: number;
  };
  delay_summary: {
    total_delayed_items: number;
    total_delay_days: number;
    avg_delay_per_item: number;
  };
  audit_activity_count: number;
}

// ==================== MANAGER ANALYTICS ====================

export interface ManagerOverview {
  assigned_projects_count: number;
  projects_by_status: Record<string, number>;
  delayed_projects: number;
  total_material_requests: {
    pending: number;
    approved: number;
  };
  total_bills: {
    pending: number;
    approved: number;
  };
  total_attendance_hours: number;
  total_wages_pending: number;
}

// Manager project analytics uses the same structure as owner
export type ManagerProjectAnalytics = ProjectAnalytics;
