import { OwnerGuard } from "@/components/dashboard/AuthGuard";

export default function OwnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <OwnerGuard>{children}</OwnerGuard>;
}
