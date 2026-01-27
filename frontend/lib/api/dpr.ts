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

  // Get rejected DPRs for a project
  getRejected: (projectId: string) => {
    return api.get<DprListResponse>(`/manager/dpr/projects/${projectId}/dprs/rejected`);
  },
  
  // Get single DPR by ID
  getById: (dprId: string) => {
    return api.get<{ dpr: any }>(`/manager/dpr/dprs/${dprId}`);
  },
  
  // Review DPR (approve/reject)
  review: (dprId: string, status: 'APPROVED' | 'REJECTED', remarks?: string, material_usage?: any[]) => {
    return api.patch<{ dpr: any }>(`/manager/dpr/dprs/${dprId}/review`, { status, remarks, material_usage });
  },

  // Get DPR image
  getImage: (dprId: string) => {
    return api.getBlob(`/manager/dpr/dprs/${dprId}/image`);
  },

  // Delete DPR (only if not approved)
  delete: (dprId: string) => {
    return api.delete<{ message: string }>(`/manager/dpr/dprs/${dprId}`);
  },
};
