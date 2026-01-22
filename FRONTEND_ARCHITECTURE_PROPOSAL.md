# Frontend Architecture Proposal & Analysis

## 1. Backend vs Frontend API Analysis

**User Constraint**: Labour and Site Engineer web interfaces are **OUT OF SCOPE**. Analysis focuses on Owner/Manager roles.

| Feature Area | Backend Component | Frontend Status | Implementation Gap |
| :--- | :--- | :--- | :--- |
| **Financial Ledger** | `services/ledger.service.js` | **Missing** | A unified "Transaction History" (Material + Wages) is completely missing. |
| **Audit Logs** | `services/audit.service.js` | **Missing** | Owners cannot see who changed what (Access Logs, Project Updates), though backend supports it. |
| **Deep Analytics** | `services/analytics.service.js` | Partial | Backend computes `budget_utilization`, `delay_days`, `attendance_trends`. Frontend mostly shows simple counts. |
| **Delay Tracking** | `services/delay.service.js` | Partial | Backend tracks delay reasons & linked DPRs. Frontend lacks a "Delay Analysis" view. |
| **AI Insights** | `services/ai.service.js` | **Missing** | Hooks for DPR extraction and Delay summarization exist but aren't exposed. |
| **Auth** | `auth/` routes | Partial | Login/Signup exist. Forgot Password is in progress. |

### Critical Missing Modules (High Priority):
1.  **Financial Ledger**: A table view combining consolidated Material Bills and Wage Payments (`ledger.service.js`).
2.  **Audit Log**: A viewer for system activities (`audit.service.js`).
3.  **Analytics Dashboard**: enhancing the current dashboard to consume `getOwnerOverview` full payload (Budget vs Invested, Delay trends).

## 2. Proposed Frontend Folder Structure

Refined structure to support new modules found in services.

```text
frontend/
├── app/
│   ├── (auth)/                 # Public Auth Routes
│   │   ├── login/
│   │   ├── signup/
│   │   ├── forgot-password/
│   │   └── layout.tsx          # Auth Blueprint Layout
│   ├── (dashboard)/            # Protected App Routes
│   │   ├── owner/
│   │   │   ├── analytics/      # [Enhance] Deep Analytics
│   │   │   ├── ledger/         # [NEW] Financial Ledger
│   │   │   ├── audit/          # [NEW] System Audit Logs
│   │   │   ├── projects/
│   │   │   └── organization/
│   │   ├── manager/
│   │   │   ├── projects/
│   │   │   └── ...
│   │   └── layout.tsx          # Dashboard Blueprint Layout
│   ├── (marketing)/
│   │   └── page.tsx
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── ui/                     # Shadcn primitives
│   ├── shared/
│   │   ├── BlueprintBackground.tsx  # [NEW] Normalized Background
│   │   ├── StatCard.tsx
│   │   └── DateRangePicker.tsx
│   ├── features/               # Feature-based grouping
│   │   ├── ledger/             # [NEW] LedgerTable, TransactionRow
│   │   ├── audit/              # [NEW] AuditLogTable, UserActivityFeed
│   │   ├── analytics/          # CostTrendsChart, DelayHeatmap
│   │   ├── projects/           # ProjectCard, StatusBadge
│   │   └── auth/               # LoginForm, AuthGuard
│   └── layouts/                # DashboardSidebar, TopNav
├── lib/
│   ├── api/
│   │   ├── analytics.ts        # [NEW] Client for analytics.service
│   │   ├── ledger.ts           # [NEW] Client for ledger.service
│   │   ├── audit.ts            # [NEW] Client for audit.service
│   │   └── ...
│   └── hooks/                  # useLedger, useAnalytics
└── types/
    ├── ledger.ts
    └── analytics.ts
```

### Why this structure?
- **Feature-based components**: Prevents `components/dashboard` from becoming a dumping ground.
- **Separation of Concerns**: Layouts are distinct from feature logic.
- **Scalability**: New modules (like Material or DPR) get their own folder in `components/features`.

## 3. UI & UX Specifications

### A. Data Lists (Engineers, Labours, etc.)
-   **Component**: `Shadcn Table` (`components/ui/table`).
-   **Features**:
    -   Sortable columns (e.g., Name, Status).
    -   Filter options (e.g., Active/Inactive, Skill Type).
    -   Pagination.
    -   Search bar.
-   **Implementation**: Create reusable `DataTable` component wrapping shadcn primitive.

### B. Task Management
-   **Library**: `DiceUI` (already installed).
-   **Components**:
    -   **Kanban Board**: For visual task status (ToDo -> InProgress -> Done).
    -   **Sortable Lists**: For prioritizing tasks.
-   **Note**: Priority backend logic is pending. **Keep priority UI code commented out**.

### C. Authentication UI
-   **Components**: Reuse `components/login-form.tsx` and `components/signup-form.tsx`.
-   **Adaptation**: Update visual styling to match the new system theme (ref. globals.css).
-   **Background**: Use specific `DotGrid` configuration in `(auth)/layout.tsx`:

```tsx
<div style={{ width: '1080px', height: '1080px', position: 'relative' }}>
  <DotGrid
    dotSize={5}
    gap={15}
    baseColor="#271E37"
    activeColor="#f97316"
    proximity={120}
    speedTrigger={100}
    shockRadius={250}
    shockStrength={5}
    maxSpeed={5000}
    resistance={750}
    returnDuration={1.5}
  />
</div>
```

### D. Navigation
-   **Sidebar**: Must include a `SidebarTrigger` (Toggle Button) for collapsing/expanding.
-   **Position**: Accessible on mobile and desktop layouts.

## 4. Theming & Layout Normalization

Currently, the "Blueprint" background and "Glow Orbs" are duplicated in `(auth)/layout.tsx` and `(dashboard)/layout.tsx`.

**Optimization Strategy:**
1.  Extract the background logic into a reusable component: `components/shared/BlueprintBackground.tsx`.
2.  Use this component in both layouts.

### Proposed Component: `BlueprintBackground.tsx`

```tsx
// components/shared/BlueprintBackground.tsx
import React from 'react';

interface BlueprintBackgroundProps {
  className?: string;
  variant?: 'auth' | 'dashboard'; // auth could be more intense, dashboard more subtle
}

export function BlueprintBackground({ variant = 'dashboard' }: BlueprintBackgroundProps) {
  const isAuth = variant === 'auth';
  
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {/* Grid Pattern */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(var(--grid-accent) 1px, transparent 1px), linear-gradient(90deg, var(--grid-accent) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
          opacity: isAuth ? 0.08 : 0.04,
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(var(--grid-accent-weak) 1px, transparent 1px), linear-gradient(90deg, var(--grid-accent-weak) 1px, transparent 1px)",
          backgroundSize: "200px 200px",
          opacity: isAuth ? 0.15 : 0.08,
        }}
      />

      {/* Ambient Glow Orbs - Normalized Positions */}
      <div className="absolute top-[-20%] left-[-15%] w-[700px] h-[700px] bg-primary/[0.10] blur-[200px] rounded-full" />
      <div className="absolute top-[-10%] right-[10%] w-[400px] h-[400px] bg-primary/[0.06] blur-[120px] rounded-full" />
      <div className="absolute bottom-[-15%] left-[5%] w-[450px] h-[450px] bg-primary/[0.07] blur-[140px] rounded-full" />
      
      {/* Additional orbs for Auth if needed */}
      {isAuth && (
         <div className="absolute top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/[0.05] blur-[150px] rounded-full" />
      )}
    </div>
  );
}
```

### Implementation Usage:

**In `(auth)/layout.tsx`:**
```tsx
export default function AuthLayout({ children }) {
  return (
    <div className="min-h-screen relative">
      <BlueprintBackground variant="auth" />
      <Header />
      <main className="relative z-10">{children}</main>
    </div>
  );
}
```

**In `(dashboard)/layout.tsx`:**
```tsx
export default function DashboardLayout({ children }) {
  return (
    <div className="min-h-screen relative">
      <BlueprintBackground variant="dashboard" />
      <Sidebar />
      <main className="relative z-10 md:ml-72">{children}</main>
    </div>
  );
}
```

This normalization ensures:
1.  **Consistency**: Same grid tokens and exact same orb positions/colors.
2.  **Maintainability**: Change the grid opacity or color in one place.
3.  **Performance**: Reduces code duplication and potential react node overhead.
