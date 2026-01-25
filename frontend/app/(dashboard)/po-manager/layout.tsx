import { POManagerGuard } from "@/components/dashboard/AuthGuard";

export default function POManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <POManagerGuard>{children}</POManagerGuard>;
}
