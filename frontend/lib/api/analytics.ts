// Analytics API client - consuming backend analytics.service.js endpoints
import { api } from "../api";
import type {
  OwnerOverview,
  ProjectAnalytics,
  ManagerOverview,
  ManagerProjectAnalytics,
} from "@/types/analytics";

// ==================== OWNER ANALYTICS API ====================

export const ownerAnalytics = {
  /**
   * Get organization-wide analytics overview
   * Endpoint: GET /owner/analytics/overview
   */
  getOverview: () => api.get<OwnerOverview>("/owner/analytics/overview"),

  /**
   * Get detailed analytics for a specific project
   * Endpoint: GET /owner/analytics/project/:projectId
   */
  getProjectAnalytics: (projectId: string | number) =>
    api.get<ProjectAnalytics>(`/owner/analytics/project/${projectId}`),
};

// ==================== MANAGER ANALYTICS API ====================

export const managerAnalytics = {
  /**
   * Get manager's overview of assigned projects
   * Endpoint: GET /manager/analytics/overview
   */
  getOverview: () => api.get<ManagerOverview>("/manager/analytics/overview"),

  /**
   * Get detailed analytics for a specific assigned project
   * Endpoint: GET /manager/analytics/project/:projectId
   */
  getProjectAnalytics: (projectId: string | number) =>
    api.get<ManagerProjectAnalytics>(`/manager/analytics/project/${projectId}`),
};
