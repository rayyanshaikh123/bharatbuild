import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { AuthGuard } from "@/components/dashboard/AuthGuard";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-background">
        <DashboardSidebar />
        {/* Main content area */}
        <main className="md:ml-72 min-h-screen">
          <div className="p-6 md:p-8">
            {children}
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}
