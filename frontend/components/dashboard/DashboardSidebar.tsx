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
  Menu,
  X,
  Receipt,
  History,
  Calendar,
  Clock,
  Package,
  BarChart,
  TrendingUp,
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
  { label: "Projects", href: "/owner/projects", icon: Building2 },
  { label: "Plans", href: "/owner/plans", icon: Calendar },
  { label: "Timeline", href: "/owner/timeline", icon: Clock },
  { label: "DPR", href: "/owner/dpr", icon: FileText },
  { label: "Materials", href: "/owner/materials", icon: Package },
  { label: "Managers", href: "/owner/managers", icon: Users },
  { label: "Ledger", href: "/owner/ledger", icon: Receipt },
  { label: "Audit Logs", href: "/owner/audit", icon: History },
  { label: "Analytics", href: "/owner/analytics", icon: TrendingUp },
  { label: "Reports", href: "/owner/reports", icon: BarChart },
];

const managerNavItems: NavItem[] = [
  { label: "Dashboard", href: "/manager", icon: LayoutDashboard },
  { label: "Projects", href: "/manager/projects", icon: Building2 },
  { label: "Engineers", href: "/manager/engineers", icon: Users },
  { label: "Ledger", href: "/manager/ledger", icon: Receipt },
  { label: "Audit Logs", href: "/manager/audit", icon: History },
  { label: "DPRs", href: "/manager/dprs", icon: FileText },
];

export function DashboardSidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = user?.role === "OWNER" ? ownerNavItems : managerNavItems;

  const handleLogout = async () => {
    await logout();
    window.location.href = "/";
  };

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="fixed top-4 left-4 z-50 md:hidden p-2 bg-card border border-border rounded-lg shadow-lg"
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-full w-72 bg-card border-r border-border z-40 transition-transform duration-300 md:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-border">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-primary-foreground shadow-lg">
                <Construction size={22} />
              </div>
              <span className="text-xl font-black tracking-tighter uppercase italic">
                Bharat<span className="text-primary">Build</span>
              </span>
            </Link>
          </div>

          {/* User info */}
          {user && (
            <div className="p-4 mx-4 mt-4 bg-muted/50 rounded-xl border border-border/50">
              <p className="text-sm font-bold text-foreground truncate">{user.name}</p>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              <div className="mt-2 inline-flex items-center px-2 py-1 bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-widest rounded-md">
                {user.role}
              </div>
            </div>
          )}

          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href + "/"));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                    isActive
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                >
                  <item.icon size={18} />
                  <span className="text-sm font-medium">{item.label}</span>
                  {isActive && (
                    <ChevronRight size={14} className="ml-auto" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Bottom actions */}
          <div className="p-4 border-t border-border space-y-3">
            <div className="flex items-center justify-between px-2">
              <span className="text-xs text-muted-foreground uppercase tracking-widest">Theme</span>
              <ThemeToggle />
            </div>
            <Button
              variant="outline"
              onClick={handleLogout}
              className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive hover:border-destructive"
            >
              <LogOut size={18} />
              Sign Out
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
}
