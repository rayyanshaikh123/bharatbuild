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
  pending_requests: number;
  pos_generated_today: number;
  pos_sent_this_week: number;
  total_pos: number;
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

// Backend returns single organization object with embedded status
export interface ApprovedOrganization {
  id: string; 
  name: string;
  address: string;
  office_phone: string;
  status: "PENDING" | "APPROVED";
  created_at?: string;
  org_id: string; // Helper for frontend consistency, populated manually if needed or mapped
}

export interface Project {
  id: string;
  name: string;
  location_text: string;
  status: string;
  org_id?: string;
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
  project_name: string;
  engineer_name: string;
  has_po?: boolean;
  po_number?: string;
  po_status?: string;
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
  po_pdf_url?: string; // This might be null if using binary upload, backend doesn't return URL usually but we might simulate or just rely on 'po_pdf' existence check
  po_pdf_mime?: string;
}

export interface CreatePurchaseOrderData {
  projectId: string;
  materialRequestId: string;
  poNumber: string; // Backend expects poNumber
  vendorName: string;
  vendorContact: string; // Backend expects vendorContact
  items: any[];
  totalAmount: number;
}

export interface GRN {
  id: string;
  status: string;
  // TODO: Define GRN structure when implementing GRN
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
    api.get<{ organizations: OrganizationListItem[] }>("/purchase-manager/organizations"),

  // Get my organization status (Backend returns single object)
  // We wrap it in array to match frontend expectations or modify frontend. 
  // Let's modify this to return exact backend response and fix frontend.
  getMyOrganization: () =>
    api.get<{ organization: ApprovedOrganization }>("/purchase-manager/organization-status"),

  // Old method kept for compatibility but implemented correctly:
  getMyOrganizations: async () => {
      try {
          const res = await api.get<{ organization: any }>("/purchase-manager/organization-status");
          if (res.organization) {
              // Map to expect structure
              return { 
                  organizations: [{
                      ...res.organization,
                      org_id: res.organization.id // Ensure org_id is available
                  }] 
              };
          }
          return { organizations: [] };
      } catch (e) {
          return { organizations: [] };
      }
  },

  // Join organization
  requestJoin: (organizationId: string) =>
    api.post<{ message: string }>("/purchase-manager/join-organization", { organizationId }),
    
  // Leave organization -- REMOVED as backend does not support it
  leave: () => Promise.reject("Feature not supported by backend"),

  // Get My Requests -- Backend doesn't have this. It only has "organization-status".
  // If status is PENDING, that is the request.
  getMyRequests: async () => {
      try {
          const res = await api.get<{ organization: ApprovedOrganization }>("/purchase-manager/organization-status");
          if (res.organization && res.organization.status === 'PENDING') {
               return { requests: [{ 
                   id: 'req_1', 
                   org_id: res.organization.id, 
                   status: 'PENDING',
                   org_name: res.organization.name,
                   purchase_manager_id: '',
                   org_address: res.organization.address,
                   org_office_phone: res.organization.office_phone
               }] };
          }
          return { requests: [] };
      } catch (e) {
          return { requests: [] };
      }
  }
};

export const purchaseManagerProjects = {
  // Get all projects in my organization to join (Available Projects)
  // Backend infers org from user, so no arg needed usually, but we keep signature compatible if possible
  getAll: (organizationId?: string) =>
    api.get<{ projects: Project[] }>("/purchase-manager/available-projects"),

  // Get my projects (Approved Projects)
  getMyProjects: (organizationId?: string) =>
    api.get<{ projects: Project[] }>("/purchase-manager/projects"),

  // Get my project join requests
  getMyRequests: (organizationId?: string) =>
    api.get<{ requests: ProjectJoinRequest[] }>("/purchase-manager/project-requests"),

  // Join project
  requestJoin: (projectId: string, organizationId?: string) =>
    api.post<{ message: string }>("/purchase-manager/join-project", { projectId }),
};

export const purchaseManagerMaterialRequests = {
  // Get by Project (Approved only, matching backend)
  getApproved: (projectId: string) =>
    api.get<{ requests: MaterialRequest[] }>(`/purchase-manager/material-requests?projectId=${projectId}`),
    
  // Update status -- REMOVED, Purchase Manager does not update status of MRs, they only create POs from them.
  // Unless there is a specific endpoint? No.
};

export const purchaseManagerPurchaseOrders = {
  // Create PO
  create: (data: CreatePurchaseOrderData) =>
    api.post<{ purchase_order: PurchaseOrder }>("/purchase-manager/purchase-orders", data),

  // Get All POs
  getAll: (projectId?: string) =>
    api.get<{ purchase_orders: PurchaseOrder[] }>(`/purchase-manager/purchase-orders${projectId ? `?projectId=${projectId}` : ''}`),
    
  // Get Single PO
  getById: (poId: string) =>
    api.get<{ purchase_order: PurchaseOrder }>(`/purchase-manager/purchase-orders/${poId}`),
    
  // Get PDF
  getPdf: (poId: string) =>
    api.getBlob(`/purchase-manager/purchase-orders/${poId}/pdf`),

  // Upload PDF (Binary)
  uploadPDF: (poId: string, file: File) => {
    const formData = new FormData();
    formData.append("pdf", file);
    return api.patch<{ message: string }>(`/purchase-manager/purchase-orders/${poId}/upload`, formData);
  },

  // Send PO
  send: (poId: string) =>
    api.patch<{ message: string }>(`/purchase-manager/purchase-orders/${poId}/send`, {}),
};

export const purchaseManagerGRN = {
  getAll: (organizationId: string) =>
     // Placeholder, backend likely /purchase-manager/grns
    api.get<{ grns: GRN[] }>(`/purchase-manager/grns`),
};
