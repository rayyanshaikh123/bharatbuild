import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Plus, LucideIcon } from "lucide-react";

interface DashboardHeaderProps {
  userName?: string;
  title?: string;
  subtitle?: string;
  showNewButton?: boolean;
  newButtonHref?: string;
  newButtonLabel?: string;
}

export function DashboardHeader({
  userName,
  title = "Dashboard",
  subtitle,
  showNewButton = false,
  newButtonHref = "#",
  newButtonLabel = "New",
}: DashboardHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <div>
        {userName && (
          <p className="text-sm text-muted-foreground mb-1">
            Welcome back, {userName}
          </p>
        )}
        <h1 className="text-3xl md:text-4xl font-black tracking-tight text-foreground">
          {title}
        </h1>
        {subtitle && (
          <p className="text-muted-foreground mt-1">{subtitle}</p>
        )}
      </div>
      
      {showNewButton && (
        <Link href={newButtonHref}>
          <Button className="gap-2">
            <Plus size={16} />
            {newButtonLabel}
          </Button>
        </Link>
      )}
    </div>
  );
}
