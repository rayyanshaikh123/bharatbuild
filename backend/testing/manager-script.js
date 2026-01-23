/**
 * MANAGER TESTING MODULE - SCRIPT.JS
 *
 * ✅ VERIFIED ROUTES ONLY
 * ❌ NO HALLUCINATED ENDPOINTS
 * 🔒 SESSION-BASED AUTH
 * 🎯 UUID-SAFE OPERATIONS
 *
 * Last Updated: 2026-01-23
 */

// ============ CONFIGURATION ============
const API_BASE = "http://localhost:3001";

// ============ CORE UTILITIES ============

/**
 * Centralized fetch with session cookies
 * @param {string} method - HTTP method
 * @param {string} endpoint - API endpoint (without base URL)
 * @param {object|null} body - Request body (null for GET)
 * @param {object} options - Additional fetch options
 * @returns {Promise<object>} - API response
 */
async function fetchWithSession(method, endpoint, body = null, options = {}) {
  const config = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    credentials: "include", // CRITICAL: Include session cookies
    ...options,
  };

  if (body && method !== "GET") {
    config.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, config);
    const data = await response.json();

    if (!response.ok) {
      showResponse(
        {
          route: `${method} ${endpoint}`,
          error: data.error || "Request failed",
          status: response.status,
        },
        true,
      );
      return { error: data.error, status: response.status };
    }

    showResponse({ route: `${method} ${endpoint}`, ...data }, false);
    return data;
  } catch (error) {
    showResponse(
      {
        route: `${method} ${endpoint}`,
        error: error.message,
        type: "Network Error",
      },
      true,
    );
    return { error: error.message };
  }
}

/**
 * Display API response in the UI
 * @param {object} data - Response data
 * @param {boolean} isError - Whether this is an error response
 */
function showResponse(data, isError = false) {
  const outputDiv = document.getElementById("output");
  if (!outputDiv) {
    console.warn("Output div not found");
    return;
  }

  const timestamp = new Date().toLocaleTimeString();
  const statusClass = isError ? "error" : "success";
  const statusIcon = isError ? "❌" : "✅";

  const responseHTML = `
    <div class="response ${statusClass}">
      <div class="response-header">
        <span>${statusIcon} ${timestamp}</span>
        ${isError ? '<span class="error-badge">ERROR</span>' : '<span class="success-badge">SUCCESS</span>'}
      </div>
      <pre>${JSON.stringify(data, null, 2)}</pre>
    </div>
  `;

  outputDiv.innerHTML = responseHTML + outputDiv.innerHTML;
}

/**
 * Get value from input field
 * @param {string} id - Input element ID
 * @returns {string} - Input value
 */
function getInputValue(id) {
  const element = document.getElementById(id);
  if (!element) {
    console.error(`Input element #${id} not found`);
    return "";
  }
  return element.value.trim();
}

/**
 * Clear all input fields in a section
 * @param {string} sectionId - Section container ID
 */
function clearInputs(sectionId) {
  const section = document.getElementById(sectionId);
  if (section) {
    const inputs = section.querySelectorAll("input, textarea");
    inputs.forEach((input) => (input.value = ""));
  }
}

// ============ AUTHENTICATION FUNCTIONS ============

async function registerManager() {
  const name = getInputValue("registerName");
  const email = getInputValue("registerEmail");
  const phone = getInputValue("registerPhone");
  const password = getInputValue("registerPassword");

  if (!name || !email || !phone || !password) {
    showResponse({ error: "All fields are required" }, true);
    return;
  }

  await fetchWithSession("POST", "/auth/manager/register", {
    name,
    email,
    phone,
    password,
  });
}

async function loginManager() {
  const email = getInputValue("loginEmail");
  const password = getInputValue("loginPassword");

  if (!email || !password) {
    showResponse({ error: "Email and password are required" }, true);
    return;
  }

  const result = await fetchWithSession("POST", "/auth/manager/login", {
    email,
    password,
  });

  if (result && !result.error) {
    // Store user info if needed
    if (result.user) {
      sessionStorage.setItem("managerId", result.user.id);
      sessionStorage.setItem("managerName", result.user.name);
    }
  }
}

async function logoutManager() {
  await fetchWithSession("POST", "/auth/manager/logout");
  sessionStorage.clear();
}

async function checkAuth() {
  await fetchWithSession("GET", "/manager/check-auth");
}

async function getProfile() {
  await fetchWithSession("GET", "/manager/profile");
}

// ============ ORGANIZATION FUNCTIONS ============

async function getMyOrganizations() {
  await fetchWithSession("GET", "/manager/organization");
}

async function getAllOrganizations() {
  await fetchWithSession("GET", "/manager/organization/all");
}

async function joinOrganization() {
  const organizationId = getInputValue("organizationId");

  if (!organizationId) {
    showResponse({ error: "Organization ID is required" }, true);
    return;
  }

  await fetchWithSession("POST", "/manager/organization/join-organization", {
    organizationId,
  });
}

async function getMyOrganizationRequests() {
  await fetchWithSession("GET", "/manager/organization/my-requests");
}

async function leaveOrganization() {
  const organizationId = getInputValue("leaveOrgId");

  if (!organizationId) {
    showResponse({ error: "Organization ID is required" }, true);
    return;
  }

  if (
    !confirm(
      "Are you sure you want to leave this organization? This will remove you from all projects.",
    )
  ) {
    return;
  }

  await fetchWithSession("POST", "/manager/organization/leave", {
    organizationId,
  });
}

// ============ PROJECT FUNCTIONS ============

async function createProject() {
  const name = getInputValue("projectName");
  const organizationId = getInputValue("projectOrgId");
  const startDate = getInputValue("projectStartDate");
  const endDate = getInputValue("projectEndDate");

  if (!name || !organizationId) {
    showResponse(
      { error: "Project name and organization ID are required" },
      true,
    );
    return;
  }

  const body = { name, organizationId };
  if (startDate) body.startDate = startDate;
  if (endDate) body.endDate = endDate;

  await fetchWithSession("POST", "/manager/project/create-project", body);
}

async function getMyProjects() {
  const organizationId = getInputValue("myProjectsOrgId");

  let url = "/manager/project/my-projects";
  if (organizationId) {
    url += `?organizationId=${organizationId}`;
  }

  await fetchWithSession("GET", url);
}

async function getAllProjects() {
  const organizationId = getInputValue("allProjectsOrgId");

  if (!organizationId) {
    showResponse({ error: "Organization ID is required" }, true);
    return;
  }

  await fetchWithSession(
    "GET",
    `/manager/project/all-projects?organizationId=${organizationId}`,
  );
}

async function getProjectDetails() {
  const projectId = getInputValue("projectDetailsId");

  if (!projectId) {
    showResponse({ error: "Project ID is required" }, true);
    return;
  }

  await fetchWithSession("GET", `/manager/project/project/${projectId}`);
}

async function updateProject() {
  const projectId = getInputValue("updateProjectId");
  const name = getInputValue("updateProjectName");
  const startDate = getInputValue("updateProjectStartDate");
  const endDate = getInputValue("updateProjectEndDate");

  if (!projectId) {
    showResponse({ error: "Project ID is required" }, true);
    return;
  }

  const body = {};
  if (name) body.name = name;
  if (startDate) body.startDate = startDate;
  if (endDate) body.endDate = endDate;

  if (Object.keys(body).length === 0) {
    showResponse(
      { error: "At least one field must be provided to update" },
      true,
    );
    return;
  }

  await fetchWithSession("PUT", `/manager/project/project/${projectId}`, body);
}

async function deleteProject() {
  const projectId = getInputValue("deleteProjectId");

  if (!projectId) {
    showResponse({ error: "Project ID is required" }, true);
    return;
  }

  if (
    !confirm(
      "Are you sure you want to delete this project? This action cannot be undone.",
    )
  ) {
    return;
  }

  await fetchWithSession("DELETE", `/manager/project/project/${projectId}`);
}

async function updateProjectStatus() {
  const projectId = getInputValue("statusProjectId");
  const status = getInputValue("projectStatus");

  if (!projectId || !status) {
    showResponse({ error: "Project ID and status are required" }, true);
    return;
  }

  await fetchWithSession(
    "PUT",
    `/manager/project/project/${projectId}/status`,
    { status },
  );
}

// ============ MANAGER PROJECT JOIN FUNCTIONS ============

async function joinProject() {
  const projectId = getInputValue("joinProjectId");
  const organizationId = getInputValue("joinProjectOrgId");

  if (!projectId || !organizationId) {
    showResponse(
      { error: "Project ID and Organization ID are required" },
      true,
    );
    return;
  }

  await fetchWithSession("POST", "/manager/project-requests/join-project", {
    projectId,
    organizationId,
  });
}

async function getMyProjectRequests() {
  await fetchWithSession(
    "GET",
    "/manager/project-requests/my-project-requests",
  );
}

// ============ MANAGER REQUEST APPROVAL (CREATOR ONLY) ============

async function getManagerRequests() {
  const projectId = getInputValue("managerReqProjectId");
  const organizationId = getInputValue("managerReqOrgId");

  if (!projectId || !organizationId) {
    showResponse(
      { error: "Project ID and Organization ID are required" },
      true,
    );
    return;
  }

  await fetchWithSession(
    "GET",
    `/manager/projects/manager-requests?projectId=${projectId}&organizationId=${organizationId}`,
  );
}

async function approveManagerRequest() {
  const requestId = getInputValue("approveManagerReqId");
  const projectId = getInputValue("approveManagerProjectId");
  const organizationId = getInputValue("approveManagerOrgId");

  if (!requestId || !projectId || !organizationId) {
    showResponse(
      { error: "Request ID, Project ID, and Organization ID are required" },
      true,
    );
    return;
  }

  await fetchWithSession(
    "PUT",
    `/manager/projects/manager-requests/${requestId}/decision`,
    {
      decision: "ACTIVE",
      projectId,
      organizationId,
    },
  );
}

async function rejectManagerRequest() {
  const requestId = getInputValue("rejectManagerReqId");
  const projectId = getInputValue("rejectManagerProjectId");
  const organizationId = getInputValue("rejectManagerOrgId");

  if (!requestId || !projectId || !organizationId) {
    showResponse(
      { error: "Request ID, Project ID, and Organization ID are required" },
      true,
    );
    return;
  }

  await fetchWithSession(
    "PUT",
    `/manager/projects/manager-requests/${requestId}/decision`,
    {
      decision: "REJECTED",
      projectId,
      organizationId,
    },
  );
}

// ============ ENGINEER REQUEST FUNCTIONS ============

async function getEngineerRequests() {
  const projectId = getInputValue("engineerReqProjectId");
  const organizationId = getInputValue("engineerReqOrgId");

  if (!projectId || !organizationId) {
    showResponse(
      { error: "Project ID and Organization ID are required" },
      true,
    );
    return;
  }

  await fetchWithSession(
    "GET",
    `/manager/projects/project-requests?projectId=${projectId}&organizationId=${organizationId}`,
  );
}

async function approveEngineerRequest() {
  const requestId = getInputValue("approveEngineerReqId");
  const projectId = getInputValue("approveEngineerProjectId");
  const organizationId = getInputValue("approveEngineerOrgId");

  if (!requestId || !projectId || !organizationId) {
    showResponse(
      { error: "Request ID, Project ID, and Organization ID are required" },
      true,
    );
    return;
  }

  await fetchWithSession(
    "PUT",
    `/manager/projects/project-requests/${requestId}/decision`,
    {
      decision: "APPROVED",
      projectId,
      organizationId,
    },
  );
}

async function rejectEngineerRequest() {
  const requestId = getInputValue("rejectEngineerReqId");
  const projectId = getInputValue("rejectEngineerProjectId");
  const organizationId = getInputValue("rejectEngineerOrgId");

  if (!requestId || !projectId || !organizationId) {
    showResponse(
      { error: "Request ID, Project ID, and Organization ID are required" },
      true,
    );
    return;
  }

  await fetchWithSession(
    "PUT",
    `/manager/projects/project-requests/${requestId}/decision`,
    {
      decision: "REJECTED",
      projectId,
      organizationId,
    },
  );
}

async function getPendingEngineerRequests() {
  const projectId = getInputValue("pendingEngProjectId");

  if (!projectId) {
    showResponse({ error: "Project ID is required" }, true);
    return;
  }

  await fetchWithSession(
    "GET",
    `/manager/project-engineer-requests/engineer-requests?projectId=${projectId}`,
  );
}

async function getAcceptedEngineerRequests() {
  const projectId = getInputValue("acceptedEngProjectId");

  if (!projectId) {
    showResponse({ error: "Project ID is required" }, true);
    return;
  }

  await fetchWithSession(
    "GET",
    `/manager/project-engineer-requests/engineer-accepted-requests?projectId=${projectId}`,
  );
}

async function getRejectedEngineerRequests() {
  const projectId = getInputValue("rejectedEngProjectId");

  if (!projectId) {
    showResponse({ error: "Project ID is required" }, true);
    return;
  }

  await fetchWithSession(
    "GET",
    `/manager/project-engineer-requests/engineer-rejected-requests?projectId=${projectId}`,
  );
}

// ============ ANALYTICS FUNCTIONS ============

async function getAnalyticsOverview() {
  const organizationId = getInputValue("analyticsOrgId");

  if (!organizationId) {
    showResponse({ error: "Organization ID is required" }, true);
    return;
  }

  await fetchWithSession(
    "GET",
    `/manager/analytics/overview?organizationId=${organizationId}`,
  );
}

async function getProjectAnalytics() {
  const projectId = getInputValue("analyticsProjectId");

  if (!projectId) {
    showResponse({ error: "Project ID is required" }, true);
    return;
  }

  await fetchWithSession(
    "GET",
    `/manager/analytics/project?projectId=${projectId}`,
  );
}

// ============ LEDGER FUNCTIONS ============

async function getProjectLedger() {
  const projectId = getInputValue("ledgerProjectId");
  const startDate = getInputValue("ledgerStartDate");
  const endDate = getInputValue("ledgerEndDate");

  if (!projectId) {
    showResponse({ error: "Project ID is required" }, true);
    return;
  }

  let url = `/manager/ledger/project/${projectId}`;
  const params = [];
  if (startDate) params.push(`startDate=${startDate}`);
  if (endDate) params.push(`endDate=${endDate}`);
  if (params.length > 0) url += `?${params.join("&")}`;

  await fetchWithSession("GET", url);
}

// ============ DELAY FUNCTIONS ============

async function getProjectDelays() {
  const projectId = getInputValue("delaysProjectId");

  if (!projectId) {
    showResponse({ error: "Project ID is required" }, true);
    return;
  }

  await fetchWithSession("GET", `/manager/delays/project/${projectId}`);
}

async function updatePlanItemStatus() {
  const itemId = getInputValue("planItemId");
  const status = getInputValue("planItemStatus");
  const delayInfo = getInputValue("planItemDelayInfo");

  if (!itemId || !status) {
    showResponse({ error: "Item ID and status are required" }, true);
    return;
  }

  const body = { status };
  if (delayInfo) {
    try {
      body.delayInfo = JSON.parse(delayInfo);
    } catch (e) {
      showResponse({ error: "Invalid JSON in delay info" }, true);
      return;
    }
  }

  await fetchWithSession(
    "PATCH",
    `/manager/delays/plan-items/${itemId}/status`,
    body,
  );
}

// ============ REPORT FUNCTIONS ============

async function getFinancialReport() {
  const projectId = getInputValue("finReportProjectId");
  const startDate = getInputValue("finReportStartDate");
  const endDate = getInputValue("finReportEndDate");

  if (!projectId) {
    showResponse({ error: "Project ID is required" }, true);
    return;
  }

  let url = `/manager/reports/financial?projectId=${projectId}`;
  if (startDate) url += `&startDate=${startDate}`;
  if (endDate) url += `&endDate=${endDate}`;

  await fetchWithSession("GET", url);
}

async function getProgressReport() {
  const projectId = getInputValue("progressReportProjectId");

  if (!projectId) {
    showResponse({ error: "Project ID is required" }, true);
    return;
  }

  await fetchWithSession(
    "GET",
    `/manager/reports/project-progress?projectId=${projectId}`,
  );
}

async function getAttendanceReport() {
  const projectId = getInputValue("attReportProjectId");
  const startDate = getInputValue("attReportStartDate");
  const endDate = getInputValue("attReportEndDate");

  if (!projectId) {
    showResponse({ error: "Project ID is required" }, true);
    return;
  }

  let url = `/manager/reports/attendance?projectId=${projectId}`;
  if (startDate) url += `&startDate=${startDate}`;
  if (endDate) url += `&endDate=${endDate}`;

  await fetchWithSession("GET", url);
}

async function getMaterialsReport() {
  const projectId = getInputValue("matReportProjectId");

  if (!projectId) {
    showResponse({ error: "Project ID is required" }, true);
    return;
  }

  await fetchWithSession(
    "GET",
    `/manager/reports/materials?projectId=${projectId}`,
  );
}

async function getAuditReport() {
  const projectId = getInputValue("auditReportProjectId");
  const startDate = getInputValue("auditReportStartDate");
  const endDate = getInputValue("auditReportEndDate");

  if (!projectId) {
    showResponse({ error: "Project ID is required" }, true);
    return;
  }

  let url = `/manager/reports/audit?projectId=${projectId}`;
  if (startDate) url += `&startDate=${startDate}`;
  if (endDate) url += `&endDate=${endDate}`;

  await fetchWithSession("GET", url);
}

// ============ AUDIT FUNCTIONS ============

async function getProjectAudits() {
  const projectId = getInputValue("auditsProjectId");
  const startDate = getInputValue("auditsStartDate");
  const endDate = getInputValue("auditsEndDate");
  const limit = getInputValue("auditsLimit");

  if (!projectId) {
    showResponse({ error: "Project ID is required" }, true);
    return;
  }

  let url = `/manager/audits/project/${projectId}?`;
  const params = [];
  if (startDate) params.push(`startDate=${startDate}`);
  if (endDate) params.push(`endDate=${endDate}`);
  if (limit) params.push(`limit=${limit}`);
  url += params.join("&");

  await fetchWithSession("GET", url);
}

// ============ DASHBOARD FUNCTIONS ============

async function getDashboard() {
  await fetchWithSession("GET", "/manager/dashboard");
}

// ============ PLAN MANAGEMENT FUNCTIONS ============

async function createPlan() {
  const projectId = getInputValue("planProjectId");
  const startDate = getInputValue("planStartDate");
  const endDate = getInputValue("planEndDate");

  if (!projectId || !startDate || !endDate) {
    showResponse(
      { error: "Project ID, start date, and end date are required" },
      true,
    );
    return;
  }

  await fetchWithSession("POST", "/manager/plan/plans", {
    project_id: projectId,
    start_date: startDate,
    end_date: endDate,
  });
}

async function getPlan() {
  const projectId = getInputValue("getPlanProjectId");

  if (!projectId) {
    showResponse({ error: "Project ID is required" }, true);
    return;
  }

  await fetchWithSession("GET", `/manager/plan/plans/${projectId}`);
}

async function updatePlan() {
  const planId = getInputValue("updatePlanId");
  const startDate = getInputValue("updatePlanStartDate");
  const endDate = getInputValue("updatePlanEndDate");

  if (!planId) {
    showResponse({ error: "Plan ID is required" }, true);
    return;
  }

  const body = {};
  if (startDate) body.start_date = startDate;
  if (endDate) body.end_date = endDate;

  if (Object.keys(body).length === 0) {
    showResponse(
      { error: "At least one field must be provided to update" },
      true,
    );
    return;
  }

  await fetchWithSession("PUT", `/manager/plan/plans/${planId}`, body);
}

async function deletePlan() {
  const planId = getInputValue("deletePlanId");

  if (!planId) {
    showResponse({ error: "Plan ID is required" }, true);
    return;
  }

  if (
    !confirm(
      "Are you sure you want to delete this plan? This will delete all plan items.",
    )
  ) {
    return;
  }

  await fetchWithSession("DELETE", `/manager/plan/plans/${planId}`);
}

async function addPlanItem() {
  const planId = getInputValue("planItemPlanId");
  const periodType = getInputValue("planItemPeriodType");
  const periodStart = getInputValue("planItemPeriodStart");
  const periodEnd = getInputValue("planItemPeriodEnd");
  const taskName = getInputValue("planItemTaskName");
  const description = getInputValue("planItemDescription");
  const plannedQuantity = getInputValue("planItemQuantity");
  const plannedManpower = getInputValue("planItemManpower");
  const plannedCost = getInputValue("planItemCost");

  if (!planId || !periodType || !periodStart || !periodEnd || !taskName) {
    showResponse(
      { error: "Plan ID, period type, dates, and task name are required" },
      true,
    );
    return;
  }

  const body = {
    period_type: periodType,
    period_start: periodStart,
    period_end: periodEnd,
    task_name: taskName,
  };

  if (description) body.description = description;
  if (plannedQuantity) body.planned_quantity = parseFloat(plannedQuantity);
  if (plannedManpower) body.planned_manpower = parseInt(plannedManpower);
  if (plannedCost) body.planned_cost = parseFloat(plannedCost);

  await fetchWithSession("POST", `/manager/plan/plans/${planId}/items`, body);
}

async function updatePlanItem() {
  const itemId = getInputValue("updatePlanItemId");
  const periodType = getInputValue("updatePlanItemPeriodType");
  const periodStart = getInputValue("updatePlanItemPeriodStart");
  const periodEnd = getInputValue("updatePlanItemPeriodEnd");
  const taskName = getInputValue("updatePlanItemTaskName");
  const description = getInputValue("updatePlanItemDescription");
  const plannedQuantity = getInputValue("updatePlanItemQuantity");
  const plannedManpower = getInputValue("updatePlanItemManpower");
  const plannedCost = getInputValue("updatePlanItemCost");

  if (!itemId) {
    showResponse({ error: "Plan item ID is required" }, true);
    return;
  }

  const body = {};
  if (periodType) body.period_type = periodType;
  if (periodStart) body.period_start = periodStart;
  if (periodEnd) body.period_end = periodEnd;
  if (taskName) body.task_name = taskName;
  if (description) body.description = description;
  if (plannedQuantity) body.planned_quantity = parseFloat(plannedQuantity);
  if (plannedManpower) body.planned_manpower = parseInt(plannedManpower);
  if (plannedCost) body.planned_cost = parseFloat(plannedCost);

  if (Object.keys(body).length === 0) {
    showResponse(
      { error: "At least one field must be provided to update" },
      true,
    );
    return;
  }

  await fetchWithSession("PUT", `/manager/plan/plans/items/${itemId}`, body);
}

async function deletePlanItem() {
  const itemId = getInputValue("deletePlanItemId");

  if (!itemId) {
    showResponse({ error: "Plan item ID is required" }, true);
    return;
  }

  if (!confirm("Are you sure you want to delete this plan item?")) {
    return;
  }

  await fetchWithSession("DELETE", `/manager/plan/plans/items/${itemId}`);
}

// ============ WAGE RATES FUNCTIONS ============

async function createWageRate() {
  const projectId = getInputValue("wageRateProjectId");
  const skillType = getInputValue("wageRateSkillType");
  const category = getInputValue("wageRateCategory");
  const hourlyRate = getInputValue("wageRateAmount");

  if (!projectId || !skillType || !category || !hourlyRate) {
    showResponse(
      {
        error: "Project ID, skill type, category, and hourly rate are required",
      },
      true,
    );
    return;
  }

  await fetchWithSession("POST", "/manager/wage-rates", {
    project_id: projectId,
    skill_type: skillType,
    category: category,
    hourly_rate: parseFloat(hourlyRate),
  });
}

async function getWageRates() {
  const projectId = getInputValue("getWageRatesProjectId");

  if (!projectId) {
    showResponse({ error: "Project ID is required" }, true);
    return;
  }

  await fetchWithSession("GET", `/manager/wage-rates?project_id=${projectId}`);
}

async function updateWageRate() {
  const id = getInputValue("updateWageRateId");
  const hourlyRate = getInputValue("updateWageRateAmount");

  if (!id || !hourlyRate) {
    showResponse(
      { error: "Wage rate ID and new hourly rate are required" },
      true,
    );
    return;
  }

  await fetchWithSession("PATCH", `/manager/wage-rates/${id}`, {
    hourly_rate: parseFloat(hourlyRate),
  });
}

async function deleteWageRate() {
  const id = getInputValue("deleteWageRateId");

  if (!id) {
    showResponse({ error: "Wage rate ID is required" }, true);
    return;
  }

  if (!confirm("Are you sure you want to delete this wage rate?")) {
    return;
  }

  await fetchWithSession("DELETE", `/manager/wage-rates/${id}`);
}

// ============ UTILITY FUNCTIONS ============

function clearOutput() {
  const outputDiv = document.getElementById("output");
  if (outputDiv) {
    outputDiv.innerHTML = "";
  }
}

// ============ INITIALIZATION ============

document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ Manager Testing Module Loaded");
  console.log("📡 API Base:", API_BASE);
  console.log("🔒 Session-based authentication enabled");
});
