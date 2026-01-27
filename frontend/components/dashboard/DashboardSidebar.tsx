"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Construction,
  LayoutDashboard,
  Building2,
  Users,
  FileText,
  Settings,
  LogOut,
  ChevronRight,
  ChevronLeft,
  Menu,
  X,
  Receipt,
  ReceiptIndianRupeeIcon,
  ReceiptIndianRupee,
  History,
  Calendar,
  Clock,
  Package,
  BarChart,
  TrendingUp,
  ShieldAlert,
  ClipboardCheck,
  AlertTriangle,
  UserCog,
  FileInput,
  Timer,
  Factory,
  BrainCircuit,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/components/providers/AuthContext";
import ThemeToggle from "@/components/shared/theme-toggle";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

const ownerNavItems: NavItem[] = [
  { label: "Dashboard", href: "/owner", icon: LayoutDashboard },
  { label: "AI Insights", href: "/owner/ai", icon: BrainCircuit },
  { label: "Projects", href: "/owner/projects", icon: Building2 },
  { label: "Plans", href: "/owner/plans", icon: Calendar },
  { label: "Timeline", href: "/owner/timeline", icon: Clock },
  { label: "Managers", href: "/owner/managers", icon: Users },
  { label: "Subcontractors", href: "/owner/subcontractors", icon: UserCog },
  { label: "Materials", href: "/owner/materials", icon: Package },
  { label: "Material-stock", href: "/owner/material-stock", icon: Package },
  { label: "QA Engineers", href: "/owner/qa-engineers", icon: ClipboardCheck },
  { label: "Ledger", href: "/owner/ledger", icon: Receipt },
  { label: "Materials", href: "/owner/materials", icon: Package },
  { label: "Purchase Orders", href: "/owner/purchase-orders", icon: FileText },
  { label: "GRN", href: "/owner/grn", icon: ClipboardCheck },
  { label: "DPR", href: "/owner/dpr", icon: FileText },
  { label: "Dangerous Work", href: "/owner/dangerous-work", icon: ShieldAlert },
  { label: "Blacklist", href: "/owner/blacklist", icon: ShieldAlert },
  { label: "Reports", href: "/owner/reports", icon: BarChart },
  { label: "Analytics", href: "/owner/analytics", icon: TrendingUp },
  { label: "Audit Logs", href: "/owner/audits", icon: History },
];

const managerNavItems: NavItem[] = [
  { label: "Dashboard", href: "/manager", icon: LayoutDashboard },
  { label: "AI Insights", href: "/manager/ai", icon: BrainCircuit },
  { label: "Projects", href: "/manager/projects", icon: Building2 },
  {
    label: "Project Requests",
    href: "/manager/project-requests",
    icon: FileInput,
  },
  { label: "Engineers", href: "/manager/engineers", icon: Users },
  { label: "Subcontractors", href: "/manager/subcontractors", icon: UserCog },
  {
    label: "QA Engineers",
    href: "/manager/qa-engineers",
    icon: ClipboardCheck,
  },
  { label: "Ledger", href: "/manager/ledger", icon: ReceiptIndianRupee },
  { label: "Wages", href: "/manager/wages", icon: ReceiptIndianRupeeIcon },
  { label: "Wage Rates", href: "/manager/wage-rates", icon: Settings },
  { label: "Working Hours", href: "/manager/working-hours", icon: Timer },
  { label: "Blacklist", href: "/manager/blacklist", icon: ShieldAlert },
  {
    label: "Dangerous Work",
    href: "/manager/dangerous-work",
    icon: ShieldAlert,
  },
  { label: "Timeline", href: "/manager/timeline", icon: Clock },
  { label: "Delays", href: "/manager/delays", icon: AlertTriangle },

  { label: "DPRs", href: "/manager/dprs", icon: FileText },
  {
    label: "Purchase-orders",
    href: "/manager/purchase-orders",
    icon: FileText,
  },
  { label: "Materials", href: "/manager/materials", icon: Package },
  { label: "Material Stock", href: "/manager/material-stock", icon: Factory },
  { label: "GRN", href: "/manager/grn", icon: ClipboardCheck },
  { label: "Labour-requests", href: "/manager/labour-requests", icon: Users },
  { label: "Analytics", href: "/manager/analytics", icon: TrendingUp },
  { label: "Audit Logs", href: "/manager/audits", icon: History },
  { label: "Reports", href: "/manager/reports", icon: BarChart },
  { label: "Profile", href: "/manager/profile", icon: Settings },
];

const poManagerNavItems: NavItem[] = [
  { label: "Dashboard", href: "/po-manager", icon: LayoutDashboard },
  { label: "Organization", href: "/po-manager/organization", icon: Building2 },
  { label: "Projects", href: "/po-manager/projects", icon: Building2 },
  {
    label: "Material Requests",
    href: "/po-manager/material-requests",
    icon: Package,
  },
  {
    label: "Purchase Orders",
    href: "/po-manager/purchase-orders",
    icon: FileText,
  },
  { label: "Profile", href: "/po-manager/profile", icon: Settings },
];

export function DashboardSidebar({
  isCollapsed = false,
  toggleCollapse,
}: {
  isCollapsed?: boolean;
  toggleCollapse?: () => void;
}) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Internal state fallback if not controlled
  // const [internalCollapsed, setInternalCollapsed] = useState(false);
  // const collapsed = isCollapsed ?? internalCollapsed;
  // simplified: we assume it's controlled or defaults to false.
  const collapsed = isCollapsed;

  const navItems =
    user?.role === "OWNER"
      ? ownerNavItems
      : user?.role === "PO_MANAGER"
        ? poManagerNavItems
        : managerNavItems;

  const handleLogout = async () => {
    await logout();
    window.location.href = "/";
  };

  return (
    <>
      {/* Mobile menu button with logo */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="fixed top-4 left-4 z-50 md:hidden flex items-center gap-2 p-2 bg-card border border-border rounded-lg shadow-lg"
      >
        {mobileOpen ? (
          <X size={20} />
        ) : (
          <>
            <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center text-primary-foreground">
              <Construction size={16} />
            </div>
            <Menu size={18} className="text-muted-foreground" />
          </>
        )}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`fixed left-0 top-0 h-full bg-card border-r border-border z-40 transition-all duration-300 ease-in-out md:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        } ${collapsed ? "w-20" : "w-72"}`}
      >
        {/* Floating Toggle Button (Desktop) */}
        <div className="hidden md:flex absolute -right-[12px] top-8 z-50">
          <Button
            variant="outline"
            size="icon"
            onClick={toggleCollapse}
            className="h-6 w-6 rounded-full border bg-background shadow-md hover:bg-accent hover:text-accent-foreground hover:scale-110 transition-all duration-200"
          >
            {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
          </Button>
        </div>

        <div className="flex flex-col h-full">
          {/* Logo */}
          <div
            className={`h-20 flex items-center border-b border-border transition-all duration-300 ${collapsed ? "justify-center px-0" : "px-6"}`}
          >
            <Link href="/" className="flex items-center gap-3 overflow-hidden">
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-primary-foreground shadow-lg flex-shrink-0 transition-transform duration-300 hover:scale-105">
                <Construction size={22} />
              </div>
              <div
                className={`flex flex-col transition-all duration-300 ${collapsed ? "w-0 opacity-0 overflow-hidden" : "w-auto opacity-100"}`}
              >
                <span className="text-xl font-black tracking-tighter uppercase italic whitespace-nowrap">
                  Bharat<span className="text-primary">Build</span>
                </span>
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest -mt-1">
                  Enterprise
                </span>
              </div>
            </Link>
          </div>

          {/* User info */}
          {user && (
            <div
              className={`mx-4 mt-4 bg-muted/50 rounded-xl border border-border/50 transition-all ${collapsed ? "p-2 flex justify-center" : "p-4"}`}
            >
              {collapsed ? (
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                  {user.name?.[0]}
                </div>
              ) : (
                <>
                  <p className="text-sm font-bold text-foreground truncate">
                    {user.name}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {user.email}
                  </p>
                  <div className="mt-2 inline-flex items-center px-2 py-1 bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-widest rounded-md">
                    {user.role}
                  </div>
                </>
              )}
            </div>
          )}

          <nav className="flex-1 p-4 space-y-1 overflow-y-auto overflow-x-hidden">
            {navItems.map((item) => {
              // For dashboard routes (exact base path), only match exact pathname
              const isDashboardRoute =
                item.href === "/owner" ||
                item.href === "/manager" ||
                item.href === "/po-manager";
              const isActive = isDashboardRoute
                ? pathname === item.href
                : pathname === item.href ||
                  pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={collapsed ? item.label : ""}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                    isActive
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  } ${collapsed ? "justify-center px-2" : ""}`}
                >
                  <item.icon size={18} className="flex-shrink-0" />
                  {!collapsed && (
                    <span className="text-sm font-medium whitespace-nowrap">
                      {item.label}
                    </span>
                  )}
                  {!collapsed && isActive && (
                    <ChevronRight size={14} className="ml-auto" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Bottom actions */}
          <div className="p-4 border-t border-border space-y-3">
            {!collapsed && (
              <div className="flex items-center justify-between px-2">
                <span className="text-xs text-muted-foreground uppercase tracking-widest">
                  Theme
                </span>
                <ThemeToggle />
              </div>
            )}
            {collapsed && (
              <div className="flex justify-center">
                <ThemeToggle />
              </div>
            )}

            <Button
              variant="outline"
              onClick={handleLogout}
              className={`w-full justify-start gap-3 text-muted-foreground hover:text-destructive hover:border-destructive ${collapsed ? "justify-center px-0" : ""}`}
            >
              <LogOut size={18} />
              {!collapsed && "Sign Out"}
            </Button>

            {/* Collapse Toggle Removed from Bottom */}
          </div>
        </div>
      </aside>
    </>
  );
}
