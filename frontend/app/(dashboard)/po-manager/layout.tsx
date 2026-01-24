import { POManagerGuard } from "@/components/dashboard/AuthGuard";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";

export default function POManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <POManagerGuard>
      <div className="min-h-screen bg-background">
        <DashboardSidebar />
        <main className="md:ml-72 p-6 lg:p-8 pb-24">
          {children}
        </main>
      </div>
    </POManagerGuard>
  );
}
