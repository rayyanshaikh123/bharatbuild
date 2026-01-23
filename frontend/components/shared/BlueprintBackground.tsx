"use client";

import React from "react";

interface BlueprintBackgroundProps {
  className?: string;
  variant?: "auth" | "dashboard";
}

/**
 * BlueprintBackground - Normalized background component for auth and dashboard layouts
 * Provides consistent grid pattern and ambient glow orbs across the application
 */
export function BlueprintBackground({
  variant = "dashboard",
}: BlueprintBackgroundProps) {
  const isAuth = variant === "auth";

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {/* Fine Grid Pattern */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(var(--grid-accent) 1px, transparent 1px), linear-gradient(90deg, var(--grid-accent) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
          opacity: isAuth ? 0.08 : 0.04,
        }}
      />

      {/* Coarse Grid Pattern */}
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
      {/* Top-left large orb */}
      <div className="absolute top-[-20%] left-[-15%] w-[700px] h-[700px] bg-primary/[0.10] blur-[200px] rounded-full" />
      
      {/* Top-right orb */}
      <div className="absolute top-[-10%] right-[10%] w-[400px] h-[400px] bg-primary/[0.06] blur-[120px] rounded-full" />
      
      {/* Bottom-left orb */}
      <div className="absolute bottom-[-15%] left-[5%] w-[450px] h-[450px] bg-primary/[0.07] blur-[140px] rounded-full" />

      {/* Dashboard-specific orbs for richer effect */}
      {!isAuth && (
        <>
          {/* Center-right orb */}
          <div className="absolute top-[30%] right-[-10%] w-[500px] h-[500px] bg-primary/[0.05] blur-[150px] rounded-full" />
          {/* Bottom-right large orb */}
          <div className="absolute bottom-[-25%] right-[-15%] w-[600px] h-[600px] bg-primary/[0.08] blur-[180px] rounded-full" />
          {/* Center accent orb */}
          <div className="absolute top-[50%] left-[40%] w-[300px] h-[300px] bg-primary/[0.03] blur-[100px] rounded-full" />
        </>
      )}

      {/* Auth-specific center orb for focus effect */}
      {isAuth && (
        <div className="absolute top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/[0.05] blur-[150px] rounded-full" />
      )}
    </div>
  );
}
