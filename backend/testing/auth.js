/**
 * BharatBuild API Testing Harness - Authentication Functions
 *
 * CRITICAL: All fetch calls MUST include credentials: "include"
 * This is required for session cookies to work correctly with express-session
 *
 * Why Live Server works:
 * - Live Server runs on port 5500
 * - Backend runs on port 3001
 * - CORS is configured to allow http://localhost:5500 with credentials
 * - Session cookies are shared across all requests from the same origin
 *
 * How this scales to other modules:
 * - Same pattern: create HTML buttons + JS fetch functions
 * - Always use credentials: "include"
 * - Test real API flows without mocking
 * - Verify sessions, cookies, and authorization
 */

const BASE_URL = "http://localhost:3001";

// ============================================================================
// OWNER AUTHENTICATION
// ============================================================================

async function registerOwner() {
  try {
    const response = await fetch(`${BASE_URL}/auth/owner/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include", // REQUIRED for session cookies
      body: JSON.stringify({
        name: "Test Owner",
        email: "userOwner@gmail.com",
        phone: "9876543210",
        password: "Test@123",
      }),
    });

    const data = await response.json();
    console.log("Register Owner Response:", data);

    if (response.ok) {
      alert("✅ Owner registered successfully!");
    } else {
      alert(`❌ Registration failed: ${data.error || "Unknown error"}`);
    }
  } catch (error) {
    console.error("Register Owner Error:", error);
    alert(`❌ Error: ${error.message}`);
  }
}

async function loginOwner() {
  try {
    const response = await fetch(`${BASE_URL}/auth/owner/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include", // REQUIRED for session cookies
      body: JSON.stringify({
        email: "userOwner@gmail.com",
        password: "Test@123",
      }),
    });

    const data = await response.json();
    console.log("Login Owner Response:", data);

    if (response.ok) {
      alert(
        `✅ Owner logged in successfully!\nUser: ${JSON.stringify(data.user, null, 2)}`,
      );
    } else {
      alert(`❌ Login failed: ${data.error || "Unknown error"}`);
    }
  } catch (error) {
    console.error("Login Owner Error:", error);
    alert(`❌ Error: ${error.message}`);
  }
}

async function getOwnerProfile() {
  try {
    const response = await fetch(`${BASE_URL}/owner/profile`, {
      method: "GET",
      credentials: "include", // REQUIRED for session cookies
    });

    const data = await response.json();
    console.log("Owner Profile Response:", data);

    if (response.ok) {
      alert(`✅ Owner Profile:\n${JSON.stringify(data.owner, null, 2)}`);
    } else {
      alert(`❌ Failed to get profile: ${data.error || "Not authenticated"}`);
    }
  } catch (error) {
    console.error("Get Owner Profile Error:", error);
    alert(`❌ Error: ${error.message}`);
  }
}

async function logoutOwner() {
  try {
    const response = await fetch(`${BASE_URL}/auth/owner/logout`, {
      method: "POST",
      credentials: "include", // REQUIRED for session cookies
    });

    const data = await response.json();
    console.log("Logout Owner Response:", data);

    if (response.ok) {
      alert("✅ Owner logged out successfully!");
    } else {
      alert(`❌ Logout failed: ${data.error || "Unknown error"}`);
    }
  } catch (error) {
    console.error("Logout Owner Error:", error);
    alert(`❌ Error: ${error.message}`);
  }
}

// ============================================================================
// MANAGER AUTHENTICATION
// ============================================================================

async function registerManager() {
  try {
    const response = await fetch(`${BASE_URL}/auth/manager/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include", // REQUIRED for session cookies
      body: JSON.stringify({
        name: "Test Manager",
        email: "userManager2@gmail.com",
        phone: "9876543222", // Unique phone for Manager
        password: "Test@123",
      }),
    });

    const data = await response.json();
    console.log("Register Manager Response:", data);

    if (response.ok) {
      alert("✅ Manager registered successfully!");
    } else {
      alert(`❌ Registration failed: ${data.error || "Unknown error"}`);
    }
  } catch (error) {
    console.error("Register Manager Error:", error);
    alert(`❌ Error: ${error.message}`);
  }
}

async function loginManager() {
  try {
    const response = await fetch(`${BASE_URL}/auth/manager/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include", // REQUIRED for session cookies
      body: JSON.stringify({
        email: "userManager@gmail.com",
        password: "Test@123",
      }),
    });

    const data = await response.json();
    console.log("Login Manager Response:", data);

    if (response.ok) {
      alert(
        `✅ Manager logged in successfully!\nUser: ${JSON.stringify(data.user, null, 2)}`,
      );
    } else {
      alert(`❌ Login failed: ${data.error || "Unknown error"}`);
    }
  } catch (error) {
    console.error("Login Manager Error:", error);
    alert(`❌ Error: ${error.message}`);
  }
}

async function getManagerProfile() {
  try {
    const response = await fetch(`${BASE_URL}/manager/profile`, {
      method: "GET",
      credentials: "include", // REQUIRED for session cookies
    });

    const data = await response.json();
    console.log("Manager Profile Response:", data);

    if (response.ok) {
      alert(`✅ Manager Profile:\n${JSON.stringify(data.manager, null, 2)}`);
    } else {
      alert(`❌ Failed to get profile: ${data.error || "Not authenticated"}`);
    }
  } catch (error) {
    console.error("Get Manager Profile Error:", error);
    alert(`❌ Error: ${error.message}`);
  }
}

async function logoutManager() {
  try {
    const response = await fetch(`${BASE_URL}/auth/manager/logout`, {
      method: "POST",
      credentials: "include", // REQUIRED for session cookies
    });

    const data = await response.json();
    console.log("Logout Manager Response:", data);

    if (response.ok) {
      alert("✅ Manager logged out successfully!");
    } else {
      alert(`❌ Logout failed: ${data.error || "Unknown error"}`);
    }
  } catch (error) {
    console.error("Logout Manager Error:", error);
    alert(`❌ Error: ${error.message}`);
  }
}

// ============================================================================
// SITE ENGINEER AUTHENTICATION
// ============================================================================

async function registerEngineer() {
  try {
    const response = await fetch(`${BASE_URL}/auth/engineer/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include", // REQUIRED for session cookies
      body: JSON.stringify({
        name: "Test Engineer",
        email: "userEngineer@gmail.com",
        phone: "9876543222", // Unique phone for Engineer
        password: "Test@123",
      }),
    });

    const data = await response.json();
    console.log("Register Engineer Response:", data);

    if (response.ok) {
      alert("✅ Site Engineer registered successfully!");
    } else {
      alert(`❌ Registration failed: ${data.error || "Unknown error"}`);
    }
  } catch (error) {
    console.error("Register Engineer Error:", error);
    alert(`❌ Error: ${error.message}`);
  }
}

async function loginEngineer() {
  try {
    const response = await fetch(`${BASE_URL}/auth/engineer/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include", // REQUIRED for session cookies
      body: JSON.stringify({
        email: "userEngineer@gmail.com",
        password: "Test@123",
      }),
    });

    const data = await response.json();
    console.log("Login Engineer Response:", data);

    if (response.ok) {
      alert(
        `✅ Site Engineer logged in successfully!\nUser: ${JSON.stringify(data.user, null, 2)}`,
      );
    } else {
      alert(`❌ Login failed: ${data.error || "Unknown error"}`);
    }
  } catch (error) {
    console.error("Login Engineer Error:", error);
    alert(`❌ Error: ${error.message}`);
  }
}

async function getEngineerProfile() {
  try {
    const response = await fetch(`${BASE_URL}/engineer/profile`, {
      method: "GET",
      credentials: "include", // REQUIRED for session cookies
    });

    const data = await response.json();
    console.log("Engineer Profile Response:", data);

    if (response.ok) {
      alert(`✅ Engineer Profile:\n${JSON.stringify(data.engineer, null, 2)}`);
    } else {
      alert(`❌ Failed to get profile: ${data.error || "Not authenticated"}`);
    }
  } catch (error) {
    console.error("Get Engineer Profile Error:", error);
    alert(`❌ Error: ${error.message}`);
  }
}

async function logoutEngineer() {
  try {
    const response = await fetch(`${BASE_URL}/auth/engineer/logout`, {
      method: "POST",
      credentials: "include", // REQUIRED for session cookies
    });

    const data = await response.json();
    console.log("Logout Engineer Response:", data);

    if (response.ok) {
      alert("✅ Site Engineer logged out successfully!");
    } else {
      alert(`❌ Logout failed: ${data.error || "Unknown error"}`);
    }
  } catch (error) {
    console.error("Logout Engineer Error:", error);
    alert(`❌ Error: ${error.message}`);
  }
}

// ============================================================================
// LABOUR AUTHENTICATION (OTP-based)
// ============================================================================

async function registerLabour() {
  try {
    const response = await fetch(`${BASE_URL}/auth/labour/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include", // REQUIRED for session cookies
      body: JSON.stringify({
        name: "Test Labour",
        phone: "9876543223", // Unique phone for Labour
      }),
    });

    const data = await response.json();
    console.log("Register Labour Response:", data);

    if (response.ok) {
      alert("✅ Labour registered successfully!");
    } else {
      alert(`❌ Registration failed: ${data.error || "Unknown error"}`);
    }
  } catch (error) {
    console.error("Register Labour Error:", error);
    alert(`❌ Error: ${error.message}`);
  }
}

async function requestLabourOtp() {
  try {
    const response = await fetch(`${BASE_URL}/auth/labour/otp/request`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include", // REQUIRED for session cookies
      body: JSON.stringify({
        phone: "9876543223", // Unique phone for Labour
      }),
    });

    const data = await response.json();
    console.log("Request OTP Response:", data);

    if (response.ok) {
      alert("✅ OTP sent! Check the backend console for the OTP code.");
    } else {
      alert(
        `❌ OTP request failed: ${data.error || data.message || "Unknown error"}`,
      );
    }
  } catch (error) {
    console.error("Request OTP Error:", error);
    alert(`❌ Error: ${error.message}`);
  }
}

async function verifyLabourOtp() {
  const otp = prompt("Enter the OTP from backend console:");
  if (!otp) {
    alert("❌ OTP is required");
    return;
  }

  try {
    const response = await fetch(`${BASE_URL}/auth/labour/otp/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include", // REQUIRED for session cookies
      body: JSON.stringify({
        phone: "9876543223", // Unique phone for Labour
        otp: otp,
      }),
    });

    const data = await response.json();
    console.log("Verify OTP Response:", data);

    if (response.ok) {
      alert(
        `✅ Labour logged in successfully!\nUser: ${JSON.stringify(data.user, null, 2)}`,
      );
    } else {
      alert(`❌ OTP verification failed: ${data.error || "Unknown error"}`);
    }
  } catch (error) {
    console.error("Verify OTP Error:", error);
    alert(`❌ Error: ${error.message}`);
  }
}

async function getLabourProfile() {
  try {
    const response = await fetch(`${BASE_URL}/labour/profile`, {
      method: "GET",
      credentials: "include", // REQUIRED for session cookies
    });

    const data = await response.json();
    console.log("Labour Profile Response:", data);

    if (response.ok) {
      alert(
        `✅ Labour Profile:\n${JSON.stringify(data.labour || data, null, 2)}`,
      );
    } else {
      alert(`❌ Failed to get profile: ${data.error || "Not authenticated"}`);
    }
  } catch (error) {
    console.error("Get Labour Profile Error:", error);
    alert(`❌ Error: ${error.message}`);
  }
}

async function logoutLabour() {
  try {
    const response = await fetch(`${BASE_URL}/auth/labour/logout`, {
      method: "POST",
      credentials: "include", // REQUIRED for session cookies
    });

    const data = await response.json();
    console.log("Logout Labour Response:", data);

    if (response.ok) {
      alert("✅ Labour logged out successfully!");
    } else {
      alert(`❌ Logout failed: ${data.error || "Unknown error"}`);
    }
  } catch (error) {
    console.error("Logout Labour Error:", error);
    alert(`❌ Error: ${error.message}`);
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

console.log("🎯 BharatBuild API Testing Harness Loaded");
console.log("📍 Base URL:", BASE_URL);
console.log("🔐 All fetch calls include credentials for session cookies");
console.log(
  "💡 Open DevTools → Application → Cookies to verify session cookies",
);
