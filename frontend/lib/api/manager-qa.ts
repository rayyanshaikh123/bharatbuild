import { api } from "../api";

export interface QAProjectRequest {
  id: string;
  request_id: string;
  project_id: string;
  qa_engineer_id: string;
  name: string;
  email: string;
  phone: string;
  project_name: string;
  org_id: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  requested_at: string;
}

export const managerQARequests = {
  async getRequests() {
    return api.get<{ requests: QAProjectRequest[] }>(
      "/manager/qa-engineer-requests/project-requests",
    );
  },

  async updateStatus(requestId: string, status: "APPROVED" | "REJECTED") {
    return api.patch(
      `/manager/qa-engineer-requests/project-requests/${requestId}`,
      { status },
    );
  },
};
