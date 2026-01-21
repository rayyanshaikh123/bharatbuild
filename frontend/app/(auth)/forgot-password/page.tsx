"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, Loader2, ArrowLeft, KeyRound, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/input";
import { UserRole, auth } from "@/lib/api/auth";

export default function ForgotPasswordPage() {
  const [selectedRole, setSelectedRole] = useState<UserRole>("OWNER");
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await auth.forgotPassword(selectedRole, email);
      setIsSubmitted(true);
    } catch (err: any) {
      setError(err.message || "Failed to send reset link");
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
                <KeyRound className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-3xl font-black tracking-tight text-foreground uppercase italic">
                Reset <span className="text-primary">Password</span>
              </h1>
              <p className="text-muted-foreground text-sm mt-2">
                {isSubmitted 
                  ? "Check your email for reset instructions"
                  : "Enter your email to receive a reset link"
                }
              </p>
            </div>

            {isSubmitted ? (
              /* Success State */
              <div className="space-y-6">
                <div className="p-6 bg-green-500/10 border border-green-500/20 rounded-2xl text-center">
                  <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-bold text-foreground mb-2">Email Sent!</h3>
                  <p className="text-muted-foreground text-sm">
                    If an account exists for <span className="text-foreground font-medium">{email}</span>, 
                    you will receive password reset instructions shortly.
                  </p>
                </div>

                <Link href="/login">
                  <Button
                    variant="outline"
                    className="w-full h-12 text-xs uppercase tracking-widest gap-2"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Login
                  </Button>
                </Link>
              </div>
            ) : (
              /* Form State */
              <>
                {/* Role Selector Tabs */}
                <div className="flex mb-8 p-1.5 bg-muted/50 rounded-xl border border-border/30">
                  {(["OWNER", "MANAGER"] as const).map((role) => (
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
                      {role}
                    </button>
                  ))}
                </div>

                {/* Form */}
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
                    className="w-full h-14 text-sm uppercase tracking-widest font-bold"
                  >
                    {isLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      "Send Reset Link"
                    )}
                  </Button>
                </form>

                {/* Back to Login Link */}
                <div className="mt-8">
                  <Link href="/login">
                    <Button
                      variant="outline"
                      className="w-full h-12 text-xs uppercase tracking-widest gap-2"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Back to Login
                    </Button>
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Footer hint with decorative element */}
      <div className="flex items-center justify-center gap-3 mt-8">
        <div className="w-2 h-2 bg-primary/50 rounded-full animate-pulse" />
        <p className="text-xs text-muted-foreground font-medium">
          Secure password recovery
        </p>
        <div className="w-2 h-2 bg-primary/50 rounded-full animate-pulse" />
      </div>
    </div>
  );
}
