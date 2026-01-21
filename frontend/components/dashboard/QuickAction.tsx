import Link from "next/link";
import { ArrowUpRight, LucideIcon } from "lucide-react";

interface QuickActionProps {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
}

export function QuickAction({ title, description, href, icon: Icon }: QuickActionProps) {
  return (
    <Link href={href} className="block group">
      <div className="glass-card flex items-center gap-4 p-4 rounded-2xl hover:border-primary/30 transition-all duration-300">
        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
          <Icon size={20} />
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-bold text-foreground">{title}</h4>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        <ArrowUpRight size={16} className="text-muted-foreground group-hover:text-primary transition-colors" />
      </div>
    </Link>
  );
}
