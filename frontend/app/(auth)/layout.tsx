"use client";

import "@/app/globals.css";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { BlueprintBackground } from "@/components/shared/BlueprintBackground";
import DotGrid from "@/components/DotGrid";
import ThemeToggle from "@/components/shared/theme-toggle";
import { Construction } from "lucide-react";
import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange={false}
    >
      <div className="min-h-screen bg-background relative overflow-hidden">
        {/* Blueprint Background for grid pattern */}
        <BlueprintBackground variant="auth" />

        {/* Interactive DotGrid Background */}
        <div className="fixed inset-0 z-0 opacity-60 pointer-events-auto">
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

        {/* Header */}
        <header className="relative z-50 p-6 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-3">
            <div className="brand-badge inline-flex items-center gap-3 px-3 py-1 rounded-xl shadow-sm">
              <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center text-primary-foreground shadow-xl">
                <Construction size={20} />
              </div>
              <span className="text-xl font-black tracking-tighter uppercase italic brand-text">
                Bharat<span className="text-primary">Build</span>
              </span>
            </div>
          </Link>
          <ThemeToggle />
        </header>

        {/* Main content */}
        <main className="relative z-10 flex items-center justify-center min-h-[calc(100vh-100px)] px-6 pb-12">
          {children}
        </main>
        <script
          async
          crossOrigin="anonymous"
          src="https://tweakcn.com/live-preview.min.js"
        />
      </div>
    </ThemeProvider>
  );
}
