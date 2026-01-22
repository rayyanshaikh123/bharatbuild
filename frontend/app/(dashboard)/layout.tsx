import "@/app/globals.css";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { BlueprintBackground } from "@/components/shared/BlueprintBackground";
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
          {/* Normalized Blueprint Background */}
          <BlueprintBackground variant="dashboard" />

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
