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
  created_at: string;
  reviewed_at?: string;
}

export interface PurchaseOrder {
  id: string;
  material_request_id: string;
  project_id: string;
  project_name: string;
  po_number: string;
  vendor_name: string;
  vendor_contact?: string;
  items: POItem[];
  total_amount: number;
  status: "DRAFT" | "SENT" | "ACKNOWLEDGED";
  po_pdf_url?: string;
  created_by: string;
  created_at: string;
  sent_at?: string;
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

// ==================== MOCK DATA ====================

const mockRequests: MaterialRequest[] = [
  {
    id: "req-001",
    project_id: "proj-001",
    project_name: "Metro Station Phase 1",
    title: "Cement Bags",
    category: "Building Materials",
    quantity: 100,
    description: "OPC 53 Grade Cement",
    status: "APPROVED",
    engineer_name: "Rajesh Kumar",
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    reviewed_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "req-002",
    project_id: "proj-001",
    project_name: "Metro Station Phase 1",
    title: "Steel TMT Bars",
    category: "Steel",
    quantity: 50,
    description: "Fe500D Grade, 12mm",
    status: "APPROVED",
    engineer_name: "Priya Singh",
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    reviewed_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "req-003",
    project_id: "proj-002",
    project_name: "Highway Bridge Construction",
    title: "Aggregate",
    category: "Aggregates",
    quantity: 200,
    description: "20mm coarse aggregate",
    status: "APPROVED",
    engineer_name: "Amit Sharma",
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    reviewed_at: new Date().toISOString(),
  },
];

const mockPurchaseOrders: PurchaseOrder[] = [
  {
    id: "po-001",
    material_request_id: "req-001",
    project_id: "proj-001",
    project_name: "Metro Station Phase 1",
    po_number: "PO-2024-001",
    vendor_name: "ABC Cement Suppliers",
    vendor_contact: "9876543210",
    items: [
      { material_name: "OPC 53 Grade Cement", quantity: 100, unit: "bags", rate: 350, amount: 35000 },
    ],
    total_amount: 35000,
    status: "SENT",
    created_by: "PO Manager",
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    sent_at: new Date().toISOString(),
  },
];

// ==================== PO MANAGER API ====================

export const poManagerDashboard = {
  getSummary: async (): Promise<{ summary: PODashboardSummary }> => {
    // Mock data - replace with actual API when backend is ready
    return {
      summary: {
        pending_requests: mockRequests.length,
        pos_generated_today: 2,
        pos_sent_this_week: 5,
        total_pos: mockPurchaseOrders.length,
      },
    };
  },
};

export const poManagerRequests = {
  // Get approved material requests pending PO generation
  getApproved: async (projectId?: string): Promise<{ requests: MaterialRequest[] }> => {
    let requests = mockRequests.filter(r => r.status === "APPROVED");
    if (projectId) {
      requests = requests.filter(r => r.project_id === projectId);
    }
    return { requests };
  },

  // Get single request
  getById: async (requestId: string): Promise<{ request: MaterialRequest | null }> => {
    const request = mockRequests.find(r => r.id === requestId) || null;
    return { request };
  },
};

export const poManagerPurchaseOrders = {
  // Get all purchase orders
  getAll: async (projectId?: string): Promise<{ purchase_orders: PurchaseOrder[] }> => {
    let pos = [...mockPurchaseOrders];
    if (projectId) {
      pos = pos.filter(po => po.project_id === projectId);
    }
    return { purchase_orders: pos };
  },

  // Get single PO
  getById: async (poId: string): Promise<{ purchase_order: PurchaseOrder | null }> => {
    const po = mockPurchaseOrders.find(p => p.id === poId) || null;
    return { purchase_order: po };
  },

  // Create PO from material request
  create: async (requestId: string, vendorName: string, items: POItem[]): Promise<{ purchase_order: PurchaseOrder }> => {
    const request = mockRequests.find(r => r.id === requestId);
    const newPO: PurchaseOrder = {
      id: `po-${Date.now()}`,
      material_request_id: requestId,
      project_id: request?.project_id || "",
      project_name: request?.project_name || "",
      po_number: `PO-2024-${String(mockPurchaseOrders.length + 1).padStart(3, "0")}`,
      vendor_name: vendorName,
      items,
      total_amount: items.reduce((sum, item) => sum + item.amount, 0),
      status: "DRAFT",
      created_by: "PO Manager",
      created_at: new Date().toISOString(),
    };
    mockPurchaseOrders.push(newPO);
    return { purchase_order: newPO };
  },

  // Upload PO PDF
  uploadPDF: async (poId: string, _file: File): Promise<{ message: string; url: string }> => {
    // Mock - in real implementation, upload file to server
    const po = mockPurchaseOrders.find(p => p.id === poId);
    if (po) {
      po.po_pdf_url = `/uploads/po/${poId}.pdf`;
      po.status = "SENT";
      po.sent_at = new Date().toISOString();
    }
    return { message: "PO PDF uploaded successfully", url: `/uploads/po/${poId}.pdf` };
  },

  // Mark PO as sent
  markSent: async (poId: string): Promise<{ purchase_order: PurchaseOrder | null }> => {
    const po = mockPurchaseOrders.find(p => p.id === poId);
    if (po) {
      po.status = "SENT";
      po.sent_at = new Date().toISOString();
    }
    return { purchase_order: po || null };
  },
};

// Project list for PO Manager (reusing existing structure)
export interface Project {
  id: string;
  name: string;
  org_id: string;
  status: string;
}

export const poManagerProjects = {
  getMyProjects: async (): Promise<{ projects: Project[] }> => {
    // Mock projects - in real implementation, fetch from API
    return {
      projects: [
        { id: "proj-001", name: "Metro Station Phase 1", org_id: "org-001", status: "ACTIVE" },
        { id: "proj-002", name: "Highway Bridge Construction", org_id: "org-001", status: "ACTIVE" },
      ],
    };
  },
};
