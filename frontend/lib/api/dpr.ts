import { api } from "../api";

export interface DprListResponse {
  dprs: any[];
}

export const managerDpr = {
  // Get all DPRs for a specific project
  getAll: (projectId: string) => {
    return api.get<DprListResponse>(`/manager/dpr/projects/${projectId}/dprs`);
  },
  
  // Get pending DPRs for a project
  getPending: (projectId: string) => {
    return api.get<DprListResponse>(`/manager/dpr/projects/${projectId}/dprs/pending`);
  },
  
  // Get approved DPRs for a project
  getApproved: (projectId: string) => {
    return api.get<DprListResponse>(`/manager/dpr/projects/${projectId}/dprs/approved`);
  },
  
  // Get single DPR by ID
  getById: (dprId: string) => {
    return api.get<{ dpr: any }>(`/manager/dpr/dprs/${dprId}`);
  },
  
  // Review DPR (approve/reject)
  review: (dprId: string, status: 'APPROVED' | 'REJECTED', remarks?: string) => {
    return api.patch<{ dpr: any }>(`/manager/dpr/dprs/${dprId}/review`, { status, remarks });
  },
};
