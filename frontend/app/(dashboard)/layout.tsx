import "@/app/globals.css";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { AuthGuard } from "@/components/dashboard/AuthGuard";

export default function DashboardLayout({
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
      <AuthGuard>
        <div className="min-h-screen bg-background relative overflow-hidden">
          {/* Blueprint grid background - consistent with auth pages */}
          <div
            className="fixed inset-0 pointer-events-none z-0"
            style={{
              backgroundImage:
                "linear-gradient(var(--grid-accent) 1px, transparent 1px), linear-gradient(90deg, var(--grid-accent) 1px, transparent 1px)",
              backgroundSize: "40px 40px",
              opacity: 0.04,
            }}
          />
          <div
            className="fixed inset-0 pointer-events-none z-0"
            style={{
              backgroundImage:
                "linear-gradient(var(--grid-accent-weak) 1px, transparent 1px), linear-gradient(90deg, var(--grid-accent-weak) 1px, transparent 1px)",
              backgroundSize: "200px 200px",
              opacity: 0.08,
            }}
          />

          {/* Multiple ambient glow orbs for richer effect */}
          {/* Top-left large orb */}
          <div className="fixed top-[-20%] left-[-15%] w-[700px] h-[700px] bg-primary/[0.10] blur-[200px] rounded-full z-0" />
          {/* Top-right orb */}
          <div className="fixed top-[-10%] right-[10%] w-[400px] h-[400px] bg-primary/[0.06] blur-[120px] rounded-full z-0" />
          {/* Center-right orb */}
          <div className="fixed top-[30%] right-[-10%] w-[500px] h-[500px] bg-primary/[0.05] blur-[150px] rounded-full z-0" />
          {/* Bottom-left orb */}
          <div className="fixed bottom-[-15%] left-[5%] w-[450px] h-[450px] bg-primary/[0.07] blur-[140px] rounded-full z-0" />
          {/* Bottom-right large orb */}
          <div className="fixed bottom-[-25%] right-[-15%] w-[600px] h-[600px] bg-primary/[0.08] blur-[180px] rounded-full z-0" />
          {/* Center accent orb */}
          <div className="fixed top-[50%] left-[40%] w-[300px] h-[300px] bg-primary/[0.03] blur-[100px] rounded-full z-0" />

          {/* Sidebar */}
          <DashboardSidebar />
          
          {/* Main content area */}
          <main className="md:ml-72 min-h-screen relative z-10">
            <div className="p-6 md:p-8">{children}</div>
          </main>
          <script
            async
            crossOrigin="anonymous"
            src="https://tweakcn.com/live-preview.min.js"
          />
        </div>
      </AuthGuard>
    </ThemeProvider>
  );
}
