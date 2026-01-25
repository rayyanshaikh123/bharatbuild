import { api } from "../api";

export interface QAEngineerRequest {
  id: string;
  request_id: string;
  org_id: string;
  qa_engineer_id: string;
  name: string;
  email: string;
  phone: string;
  organization_name: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  created_at: string;
  approved_at?: string;
}

export const ownerQARequests = {
  async getRequests() {
    return api.get<{ requests: QAEngineerRequest[] }>(
      "/owner/qa-engineer-requests/organization-requests",
    );
  },

  async updateStatus(requestId: string, status: "APPROVED" | "REJECTED") {
    return api.patch(
      `/owner/qa-engineer-requests/organization-requests/${requestId}`,
      { status },
    );
  },
};
