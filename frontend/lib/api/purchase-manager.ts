import { api } from "../api";

// ==================== TYPES ====================

export interface PurchaseManagerProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
}

export interface PurchaseManagerDashboardSummary {
  total_projects: number;
  active_projects: number;
  pending_material_requests: number;
  approved_material_requests: number;
  purchase_orders_issued: number;
  pending_grns: number;
}

export interface OrganizationListItem {
  id: string;
  name: string;
  address: string;
  office_phone: string;
}

export interface PurchaseManagerOrgRequest {
  id: string;
  org_id: string;
  purchase_manager_id: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  org_name: string;
  org_address: string;
  org_office_phone: string;
}

export interface ApprovedOrganization {
  id: string; // This is the request ID usually, or link ID
  org_id: string;
  purchase_manager_id: string;
  status: "APPROVED";
  org_name: string;
  org_address: string;
}

export interface Project {
  id: string;
  name: string;
  location_text: string;
  status: string;
  org_id: string;
  organization_name?: string;
}

export interface ProjectJoinRequest {
  id: string;
  project_id: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  project_name: string;
  organization_name: string;
  assigned_at?: string;
}

export interface MaterialRequest {
  id: string;
  project_id: string;
  site_engineer_id: string;
  title: string;
  category: string;
  quantity: number;
  description?: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  created_at: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT"; // Check backend if priority exists
  project_name: string;
  engineer_name: string;
  manager_feedback?: string;
}

export interface PurchaseOrder {
  id: string;
  project_id: string;
  material_request_id: string;
  po_number: string;
  vendor_name: string;
  vendor_contact?: string;
  items: any; // JSON
  total_amount: number;
  status: "DRAFT" | "SENT" | "ACKNOWLEDGED";
  created_by: string;
  created_at: string;
  project_name?: string;
  material_request_title?: string;
}

export interface CreatePurchaseOrderData {
  projectId: string;
  materialRequestId: string;
  vendorName: string;
  vendorContact: string;
  items: any[];
  totalAmount: number;
}

export interface GRN {
  id: string;
  project_id: string;
  purchase_order_id: string;
  material_request_id: string;
  site_engineer_id: string;
  status: "CREATED" | "VERIFIED";
  received_items: any;
  remarks?: string;
  created_at: string;
  project_name: string;
  po_number: string;
  vendor_name: string;
  engineer_name: string;
}

// ==================== API MODULES ====================

export const purchaseManagerProfile = {
  get: () =>
    api.get<{ purchase_manager: PurchaseManagerProfile }>("/purchase-manager/profile"),
    
  checkAuth: () => 
    api.get<{ authenticated: boolean; user: any }>("/purchase-manager/check-auth"),
};

export const purchaseManagerDashboard = {
  getSummary: () =>
    api.get<{ summary: PurchaseManagerDashboardSummary }>("/purchase-manager/dashboard"),
};

export const purchaseManagerOrganization = {
  // Get all organizations (for browsing)
  getAll: () =>
    api.get<{ organizations: OrganizationListItem[] }>("/purchase-manager/organization/all"),

  // Get my approved organizations
  getMyOrganizations: () =>
    api.get<{ organizations: ApprovedOrganization[] }>("/purchase-manager/organization"),

  // Get my join requests
  getMyRequests: () =>
    api.get<{ requests: PurchaseManagerOrgRequest[] }>("/purchase-manager/organization/my-requests"),

  // Join organization
  requestJoin: (organizationId: string) =>
    api.post<{ message: string }>("/purchase-manager/organization/join-organization", { organizationId }),
    
  // Leave organization
  leave: () =>
    api.post<{ message: string }>("/purchase-manager/organization/leave", {}),
};

export const purchaseManagerProjects = {
  // Get all projects in my organization to join
  getAll: (organizationId: string) =>
    api.get<{ projects: Project[] }>(`/purchase-manager/project/organization-projects?organizationId=${organizationId}`),

  // Get my projects (where I am assigned)
  getMyProjects: (organizationId: string) =>
    api.get<{ projects: Project[] }>(`/purchase-manager/project/my-projects?organizationId=${organizationId}`),

  // Get my project join requests
  getMyRequests: (organizationId: string) =>
    api.get<{ requests: ProjectJoinRequest[] }>(`/purchase-manager/project/my-requests?organizationId=${organizationId}`),

  // Join project
  requestJoin: (projectId: string, organizationId: string) =>
    api.post<{ message: string }>("/purchase-manager/project/join-project", { projectId, organizationId }),
};

export const purchaseManagerMaterialRequests = {
  // Get pending requests
  getPending: (organizationId: string) =>
    api.get<{ material_requests: MaterialRequest[] }>(`/purchase-manager/material-requests/pending?organizationId=${organizationId}`),

  // Get all requests (history)
  getAll: (organizationId: string) =>
    api.get<{ material_requests: MaterialRequest[] }>(`/purchase-manager/material-requests/all?organizationId=${organizationId}`),
    
  // Get by Project (Approved only, matching backend)
  getApproved: (projectId: string) =>
    api.get<{ requests: MaterialRequest[] }>(`/purchase-manager/material-requests?projectId=${projectId}`),
    
  // Update status (Approve/Reject)
  updateStatus: (requestId: string, status: "APPROVED" | "REJECTED", feedback?: string) =>
      api.patch<{ message: string }>(`/purchase-manager/material-requests/${requestId}/status`, { status, feedback }),
};

export const purchaseManagerPurchaseOrders = {
  // Create PO
  create: (data: CreatePurchaseOrderData) =>
    api.post<{ purchase_order: PurchaseOrder }>("/purchase-manager/purchase-orders/create", data),

  // Get All POs
  getAll: (projectId?: string) =>
    api.get<{ purchase_orders: PurchaseOrder[] }>(`/purchase-manager/purchase-orders${projectId ? `?projectId=${projectId}` : ''}`),
    
  // Get Single PO
  getById: (poId: string) =>
    api.get<{ purchase_order: PurchaseOrder }>(`/purchase-manager/purchase-orders/${poId}`),
    
  // Get PDF
  getPdf: (poId: string) =>
    api.getBlob(`/purchase-manager/purchase-orders/${poId}/pdf`),

  // Upload PDF URL
  uploadPDF: (poId: string, pdfUrl: string) =>
    api.patch<{ message: string }>(`/purchase-manager/purchase-orders/${poId}/upload-pdf`, { pdf_url: pdfUrl }),

  // Send PO
  send: (poId: string) =>
    api.post<{ message: string }>(`/purchase-manager/purchase-orders/${poId}/send`, {}),
};

export const purchaseManagerGRN = {
  // Get All GRNs
  getAll: (organizationId: string) =>
    api.get<{ grns: GRN[] }>(`/purchase-manager/goods-receipt-notes?organizationId=${organizationId}`),
    
  // Get Single GRN
  getById: (grnId: string) =>
    api.get<{ grn: GRN }>(`/purchase-manager/goods-receipt-notes/${grnId}`),
    
  // Get Images
  getBillImage: (grnId: string) =>
    api.getBlob(`/purchase-manager/goods-receipt-notes/${grnId}/bill-image`),
    
  getProofImage: (grnId: string) =>
    api.getBlob(`/purchase-manager/goods-receipt-notes/${grnId}/proof-image`),
};
