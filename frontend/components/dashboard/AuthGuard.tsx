"use client";

import { useAuth } from "@/components/providers/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { UserRole } from "@/lib/api/auth";

interface AuthGuardProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export function AuthGuard({ children, allowedRoles }: AuthGuardProps) {
  const { user, isLoading, refreshSession } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Validate session on mount
  useEffect(() => {
    if (!isLoading && user) {
      refreshSession();
    }
  }, []);

  // Handle auth redirects
  useEffect(() => {
    if (isLoading) return;

    // Not logged in - redirect to login
    if (!user) {
      router.push("/login");
      return;
    }

    // Check role-based access
    if (allowedRoles && allowedRoles.length > 0) {
      if (!allowedRoles.includes(user.role)) {
        // Redirect to correct dashboard based on role
        const correctPath = user.role === "OWNER" ? "/owner" : "/manager";
        if (pathname !== correctPath) {
          router.push(correctPath);
        }
      }
    }
  }, [user, isLoading, router, allowedRoles, pathname]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground uppercase tracking-widest">
            Validating session...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // If role restrictions exist, check them
  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return null;
  }

  return <>{children}</>;
}

// Pre-configured guards for convenience
export function OwnerGuard({ children }: { children: React.ReactNode }) {
  return <AuthGuard allowedRoles={["OWNER"]}>{children}</AuthGuard>;
}

export function ManagerGuard({ children }: { children: React.ReactNode }) {
  return <AuthGuard allowedRoles={["MANAGER"]}>{children}</AuthGuard>;
}
