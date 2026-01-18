import { ManagerGuard } from "@/components/dashboard/AuthGuard";

export default function ManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ManagerGuard>{children}</ManagerGuard>;
}
