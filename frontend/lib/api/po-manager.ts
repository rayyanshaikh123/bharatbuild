import { api } from "../api";

// ==================== PO MANAGER TYPES ====================

export interface MaterialRequest {
  id: string;
  project_id: string;
  project_name: string;
  title: string;
  category: string;
  quantity: number;
  description?: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  manager_feedback?: string;
  engineer_name: string;
  engineer_email?: string;
  reviewed_by_name?: string;
  created_at: string;
  reviewed_at?: string;
  // PO-related fields from backend
  has_po?: boolean;
  po_number?: string;
  po_status?: string;
}

export interface PurchaseOrder {
  id: string;
  material_request_id: string;
  project_id: string;
  project_name?: string;
  po_number: string;
  vendor_name: string;
  vendor_contact?: string;
  items: POItem[];
  total_amount: number;
  status: "DRAFT" | "SENT" | "ACKNOWLEDGED";
  po_pdf_mime?: string;
  created_by: string;
  created_by_role?: string;
  created_at: string;
  sent_at?: string;
  // Additional fields from backend
  material_request_title?: string;
  material_category?: string;
  location_text?: string;
  requested_quantity?: number;
  material_description?: string;
}

export interface POItem {
  material_name: string;
  quantity: number;
  unit: string;
  rate: number;
  amount: number;
}

export interface PODashboardSummary {
  pending_requests: number;
  pos_generated_today: number;
  pos_sent_this_week: number;
  total_pos: number;
}

// ==================== PROJECT & ORG TYPES ====================

export interface Project {
  id: string;
  name: string;
  location_text?: string;
  latitude?: number;
  longitude?: number;
  start_date?: string;
  end_date?: string;
  budget?: number;
  status: string;
  current_invested?: number;
  access_status?: string;
  assigned_at?: string;
  org_name?: string;
  join_status?: string;
}

export interface Organization {
  id: string;
  name: string;
  address?: string;
  office_phone?: string;
  status?: string;
  created_at?: string;
  approved_at?: string;
}

export interface ProjectRequest {
  id: string;
  project_id: string;
  project_name: string;
  location_text?: string;
  start_date?: string;
  end_date?: string;
  project_status?: string;
  org_name?: string;
  status: string;
  assigned_at: string;
}

// ==================== PO MANAGER DASHBOARD API ====================

export const poManagerDashboard = {
  getSummary: async (): Promise<{ summary: PODashboardSummary }> => {
    return api.get<{ summary: PODashboardSummary }>("/purchase-manager/dashboard");
  },
};

// ==================== MATERIAL REQUESTS API ====================

export const poManagerRequests = {
  // Get approved material requests pending PO generation
  getApproved: async (projectId: string): Promise<{ requests: MaterialRequest[] }> => {
    return api.get<{ requests: MaterialRequest[] }>(
      `/purchase-manager/material-requests?projectId=${projectId}`
    );
  },

  // Get single request details
  getById: async (requestId: string): Promise<{ request: MaterialRequest }> => {
    return api.get<{ request: MaterialRequest }>(
      `/purchase-manager/material-requests/${requestId}`
    );
  },

  // Get material request image
  getImage: async (requestId: string): Promise<Blob> => {
    return api.getBlob(`/purchase-manager/material-requests/${requestId}/image`);
  },
};

// ==================== PURCHASE ORDERS API ====================

export const poManagerPurchaseOrders = {
  // Get all purchase orders
  getAll: async (projectId?: string, status?: string): Promise<{ purchase_orders: PurchaseOrder[] }> => {
    const params = new URLSearchParams();
    if (projectId) params.append("projectId", projectId);
    if (status) params.append("status", status);
    const queryString = params.toString();
    return api.get<{ purchase_orders: PurchaseOrder[] }>(
      `/purchase-manager/purchase-orders${queryString ? `?${queryString}` : ""}`
    );
  },

  // Get single PO
  getById: async (poId: string): Promise<{ purchase_order: PurchaseOrder }> => {
    return api.get<{ purchase_order: PurchaseOrder }>(
      `/purchase-manager/purchase-orders/${poId}`
    );
  },

  // Create PO from material request
  create: async (data: {
    materialRequestId: string;
    projectId: string;
    poNumber: string;
    vendorName: string;
    vendorContact?: string;
    items: POItem[];
    totalAmount: number;
  }): Promise<{ message: string; purchase_order: PurchaseOrder }> => {
    return api.post<{ message: string; purchase_order: PurchaseOrder }>(
      "/purchase-manager/purchase-orders",
      data
    );
  },

  // Upload PO PDF File (FormData)
  uploadPDF: async (poId: string, file: File): Promise<{ message: string; purchase_order: PurchaseOrder }> => {
    const formData = new FormData();
    formData.append("pdf", file);
    
    // Note: api.patch usually sets Content-Type to application/json. 
    // We need to bypass that for FormData to let browser set boundary.
    // Assuming custom implementation or handling in api.ts. 
    // If api.ts wrapper forces JSON, we might need a direct fetch or update api.ts.
    // For now, let's try to pass FormData. If api.ts handles it, good. 
    // Checking api.ts (Step 998): "body: JSON.stringify(data)". This will BREAK FormData.
    // So we need a custom fetch here or extend api.ts.
    // I will use api.upload (if exists) or direct fetch with credentials.
    
    // Let's use the fetcher directly if exposed, or fallback to fetch.
    const container = new FormData();
    container.append("pdf", file);

    return fetch(`${api.defaults.baseURL}/purchase-manager/purchase-orders/${poId}/upload`, {
        method: "PATCH",
        body: container,
        credentials: "include", // Essential
    }).then(async (res) => {
        if (!res.ok) {
            const error = await res.json().catch(() => ({ error: "Upload failed" }));
            throw new Error(error.error || error.message || "Upload failed");
        }
        return res.json();
    });
  },

  // Send PO to site engineer
  send: async (poId: string): Promise<{ message: string; purchase_order: PurchaseOrder }> => {
    return api.patch<{ message: string; purchase_order: PurchaseOrder }>(
      `/purchase-manager/purchase-orders/${poId}/send`,
      {}
    );
  },
};

// ==================== PROJECTS API ====================

export const poManagerProjects = {
  // Get my approved projects
  getMyProjects: async (): Promise<{ projects: Project[] }> => {
    return api.get<{ projects: Project[] }>("/purchase-manager/projects");
  },

  // Get my project join requests
  getProjectRequests: async (): Promise<{ requests: ProjectRequest[] }> => {
    return api.get<{ requests: ProjectRequest[] }>("/purchase-manager/project-requests");
  },

  // Get available projects to join
  getAvailableProjects: async (): Promise<{ projects: Project[] }> => {
    return api.get<{ projects: Project[] }>("/purchase-manager/available-projects");
  },

  // Join a project
  joinProject: async (projectId: string): Promise<{ message: string }> => {
    return api.post<{ message: string }>("/purchase-manager/join-project", { projectId });
  },
};

// ==================== ORGANIZATION API ====================

export const poManagerOrganization = {
  // Get current organization status
  getStatus: async (): Promise<{ organization: Organization }> => {
    return api.get<{ organization: Organization }>("/purchase-manager/organization-status");
  },

  // Get all available organizations
  getAllOrganizations: async (): Promise<{ organizations: Organization[] }> => {
    return api.get<{ organizations: Organization[] }>("/purchase-manager/organizations");
  },

  // Join an organization
  joinOrganization: async (organizationId: string): Promise<{ message: string }> => {
    return api.post<{ message: string }>("/purchase-manager/join-organization", { organizationId });
  },
};

// ==================== GRN API ====================

export interface GRN {
  id: string;
  project_id: string;
  project_name: string;
  purchase_order_id: string;
  po_number: string;
  vendor_name: string;
  material_request_id: string;
  material_request_title: string;
  site_engineer_id: string;
  engineer_name: string;
  grn_number: string;
  quantity_received: number;
  unit: string;
  quality_check_status: "PENDING" | "PASSED" | "FAILED";
  remarks?: string;
  received_at: string;
  created_at: string;
  verified_by?: string;
  verified_by_name?: string;
  verified_at?: string;
}

export const poManagerGRN = {
  // Get GRNs for a project
  getByProject: async (projectId: string): Promise<{ grns: GRN[] }> => {
    return api.get<{ grns: GRN[] }>(`/purchase-manager/grns?projectId=${projectId}`);
  },
};

