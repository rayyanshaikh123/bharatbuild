"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, Lock, Loader2, ArrowRight, Shield, Zap } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/components/providers/AuthContext";
import { UserRole } from "@/lib/api/auth";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [selectedRole, setSelectedRole] = useState<UserRole>("OWNER");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await login(selectedRole, email, password);
      // Redirect to role-based dashboard
      const dashboardRoutes: Record<UserRole, string> = {
        OWNER: "/owner",
        MANAGER: "/manager",
        PO_MANAGER: "/po-manager",
      };
      router.push(dashboardRoutes[selectedRole] || "/login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-xl">
      {/* Glass panel */}
      <div className="relative">
        {/* Glow effect behind panel */}
        <div className="absolute -inset-2 bg-gradient-to-r from-primary/20 via-primary/5 to-primary/20 rounded-3xl blur-2xl opacity-50" />
        
        {/* Decorative corner elements */}
        <div className="absolute -top-3 -left-3 w-6 h-6 border-l-2 border-t-2 border-primary/40 rounded-tl-lg" />
        <div className="absolute -top-3 -right-3 w-6 h-6 border-r-2 border-t-2 border-primary/40 rounded-tr-lg" />
        <div className="absolute -bottom-3 -left-3 w-6 h-6 border-l-2 border-b-2 border-primary/40 rounded-bl-lg" />
        <div className="absolute -bottom-3 -right-3 w-6 h-6 border-r-2 border-b-2 border-primary/40 rounded-br-lg" />

        <div className="relative bg-card/90 backdrop-blur-2xl border border-border/50 rounded-2xl shadow-2xl overflow-hidden">
          {/* Top accent bar */}
          <div className="h-1 bg-gradient-to-r from-transparent via-primary to-transparent" />
          
          <div className="p-10">
            {/* Header */}
            <div className="text-center mb-10">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-2xl mb-4 border border-primary/20">
                <Shield className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-3xl font-black tracking-tight text-foreground uppercase italic">
                Terminal <span className="text-primary">Access</span>
              </h1>
              <p className="text-muted-foreground text-sm mt-2">
                Sign in to your command center
              </p>
            </div>

            {/* Role Selector Tabs */}
            <div className="flex mb-8 p-1.5 bg-muted/50 rounded-xl border border-border/30">
              {(["OWNER", "MANAGER", "PO_MANAGER"] as const).map((role) => {
                const roleLabels: Record<string, string> = {
                  OWNER: "Owner",
                  MANAGER: "Manager",
                  PO_MANAGER: "Purchase Mgr",
                };
                return (
                  <button
                    key={role}
                    type="button"
                    onClick={() => setSelectedRole(role)}
                    className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest rounded-lg transition-all duration-300 ${
                      selectedRole === role
                        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {roleLabels[role]}
                  </button>
                );
              })}
            </div>

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email Field */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <Mail className="h-3 w-3" />
                  Email Address
                </label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="h-12 bg-background/50 border-border/50 focus:border-primary text-base"
                  required
                />
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <Lock className="h-3 w-3" />
                  Password
                </label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-12 bg-background/50 border-border/50 focus:border-primary text-base"
                  required
                />
              </div>

              {/* Forgot Password Link */}
              <div className="flex justify-end">
                <Link 
                  href="/forgot-password" 
                  className="text-sm text-primary hover:text-primary/80 transition-colors"
                >
                  Forgot password?
                </Link>
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-xl">
                  <p className="text-destructive text-sm font-medium">{error}</p>
                </div>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-14 text-sm uppercase tracking-widest font-bold group"
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    Access Terminal
                    <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </Button>
            </form>

            {/* Divider */}
            <div className="my-8 flex items-center gap-4">
              <div className="flex-1 h-px bg-border/50" />
              <span className="text-xs text-muted-foreground uppercase tracking-widest font-medium">
                New Here?
              </span>
              <div className="flex-1 h-px bg-border/50" />
            </div>

            {/* Sign Up Link */}
            <Link href="/signup">
              <Button
                variant="outline"
                className="w-full h-12 text-xs uppercase tracking-widest"
              >
                Create Account
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Footer hint with decorative element */}
      <div className="flex items-center justify-center gap-3 mt-8">
        <div className="w-2 h-2 bg-primary/50 rounded-full animate-pulse" />
        <p className="text-xs text-muted-foreground font-medium">
          Secure session • Data encrypted
        </p>
        <div className="w-2 h-2 bg-primary/50 rounded-full animate-pulse" />
      </div>
    </div>
  );
}
