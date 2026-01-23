// Labour Offline Sync Testing Script
const BASE_URL = "http://localhost:3000";
let jwtToken = null;
let offlineQueue = [];

// Utility: Generate UUID v4
function generateUUID() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    var r = (Math.random() * 16) | 0,
      v = c == "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Utility: Display JSON
function displayJSON(elementId, data) {
  const element = document.getElementById(elementId);
  element.textContent = JSON.stringify(data, null, 2);
  element.style.display = "block";
}

// 1️⃣ Labour Authentication
async function labourAuth() {
  const phone = document.getElementById("labourPhone").value.trim();

  if (!phone) {
    alert("Please enter a phone number");
    return;
  }

  try {
    const response = await fetch(`${BASE_URL}/auth/labour/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, otp: "123456" }), // Adjust based on your auth
    });

    const data = await response.json();

    if (response.ok && data.token) {
      jwtToken = data.token;
      displayJSON("authStatus", {
        success: true,
        message: "Authenticated successfully!",
        labour: data.labour,
      });
    } else {
      displayJSON("authStatus", {
        error: data.error || "Authentication failed",
      });
    }
  } catch (error) {
    displayJSON("authStatus", {
      error: "Network error: " + error.message,
    });
  }
}

// 2️⃣ Queue Offline Action
function queueAction() {
  if (!jwtToken) {
    alert("Please authenticate first!");
    return;
  }

  const actionType = document.getElementById("actionType").value;
  const projectId = document.getElementById("projectId").value.trim();
  const latitude = parseFloat(document.getElementById("latitude").value);
  const longitude = parseFloat(document.getElementById("longitude").value);

  if (!projectId) {
    alert("Project ID is required");
    return;
  }

  if (isNaN(latitude) || isNaN(longitude)) {
    alert("Valid latitude and longitude are required");
    return;
  }

  const action = {
    id: generateUUID(),
    action_type: actionType,
    entity_type: "ATTENDANCE",
    project_id: projectId,
    payload: {
      latitude,
      longitude,
      timestamp: new Date().toISOString(),
    },
    timestamp: new Date().toISOString(),
  };

  offlineQueue.push(action);
  updateQueueDisplay();
}

// Clear Queue
function clearQueue() {
  if (confirm("Clear all queued actions?")) {
    offlineQueue = [];
    updateQueueDisplay();
  }
}

// Update Queue Display
function updateQueueDisplay() {
  const display = document.getElementById("queueDisplay");
  const count = document.getElementById("queueCount");

  count.textContent = offlineQueue.length;

  if (offlineQueue.length === 0) {
    display.innerHTML = '<div class="empty-state">No queued actions</div>';
    return;
  }

  display.innerHTML = offlineQueue
    .map(
      (action, idx) => `
        <div class="queue-item">
            <strong>${idx + 1}. ${action.action_type}</strong>
            <span class="badge success">${action.entity_type}</span>
            <div style="margin-top: 5px; font-size: 12px; color: #666;">
                ID: ${action.id.substring(0, 8)}...
                | Project: ${action.project_id.substring(0, 8)}...
                | Time: ${new Date(action.timestamp).toLocaleTimeString()}
            </div>
        </div>
    `,
    )
    .join("");
}

// 3️⃣ Sync to Server
async function syncToServer() {
  if (!jwtToken) {
    alert("Please authenticate first!");
    return;
  }

  if (offlineQueue.length === 0) {
    alert("No actions to sync!");
    return;
  }

  const syncButton = event.target;
  syncButton.disabled = true;
  syncButton.textContent = "⏳ Syncing...";

  try {
    const response = await fetch(`${BASE_URL}/labour/sync`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${jwtToken}`,
      },
      body: JSON.stringify({ actions: offlineQueue }),
    });

    const data = await response.json();

    // Display raw response
    displayJSON("syncResult", data);

    // Display formatted results
    displayResults(data);

    // Clear queue if all succeeded
    if (data.applied && data.applied.length === offlineQueue.length) {
      offlineQueue = [];
      updateQueueDisplay();
    }
  } catch (error) {
    displayJSON("syncResult", {
      error: "Network error: " + error.message,
    });
  } finally {
    syncButton.disabled = false;
    syncButton.textContent = "🚀 Sync All Actions";
  }
}

// 4️⃣ Display Results
function displayResults(data) {
  const resultsDisplay = document.getElementById("resultsDisplay");

  let html = "";

  // Applied Actions
  if (data.applied && data.applied.length > 0) {
    html +=
      '<h3 style="color: #28a745;">✅ Applied Actions (' +
      data.applied.length +
      ")</h3>";
    html += data.applied
      .map(
        (item) => `
            <div class="queue-item" style="border-left-color: #28a745;">
                <strong>${item.action_type}</strong>
                <span class="badge success">APPLIED</span>
                <div style="margin-top: 5px; font-size: 12px; color: #666;">
                    Action ID: ${item.action_id.substring(0, 8)}...
                    | Entity: ${item.entity_id ? item.entity_id.substring(0, 8) + "..." : "N/A"}
                </div>
            </div>
        `,
      )
      .join("");
  }

  // Skipped Actions (Duplicates)
  if (data.skipped && data.skipped.length > 0) {
    html +=
      '<h3 style="color: #ffc107; margin-top: 20px;">⏭️ Skipped Actions (' +
      data.skipped.length +
      ")</h3>";
    html += data.skipped
      .map(
        (item) => `
            <div class="queue-item" style="border-left-color: #ffc107;">
                <strong>${item.action_type}</strong>
                <span class="badge warning">SKIPPED</span>
                <div style="margin-top: 5px; font-size: 12px; color: #666;">
                    ${item.reason} | Status: ${item.status}
                </div>
            </div>
        `,
      )
      .join("");
  }

  // Rejected Actions
  if (data.rejected && data.rejected.length > 0) {
    html +=
      '<h3 style="color: #dc3545; margin-top: 20px;">❌ Rejected Actions (' +
      data.rejected.length +
      ")</h3>";
    html += data.rejected
      .map(
        (item) => `
            <div class="queue-item" style="border-left-color: #dc3545;">
                <strong>${item.action_type}</strong>
                <span class="badge error">REJECTED</span>
                <div style="margin-top: 5px; font-size: 12px; color: #666;">
                    Error: ${item.error}
                </div>
            </div>
        `,
      )
      .join("");
  }

  if (html === "") {
    html = '<div class="empty-state">No results</div>';
  }

  resultsDisplay.innerHTML = html;
}

// Initialize
window.addEventListener("load", () => {
  updateQueueDisplay();
  console.log("Labour Sync Testing loaded");
});
