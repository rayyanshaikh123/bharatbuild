import ThemeToggle from "@/components/shared/theme-toggle";
import { Construction } from "lucide-react";
import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Blueprint grid background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(var(--grid-accent) 1px, transparent 1px), linear-gradient(90deg, var(--grid-accent) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
          opacity: 0.08,
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(var(--grid-accent-weak) 1px, transparent 1px), linear-gradient(90deg, var(--grid-accent-weak) 1px, transparent 1px)",
          backgroundSize: "200px 200px",
          opacity: 0.15,
        }}
      />

      {/* Ambient glow orbs */}
      <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-primary/[0.06] blur-[150px] rounded-full" />
      <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] bg-primary/[0.08] blur-[120px] rounded-full" />

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
    </div>
  );
}
