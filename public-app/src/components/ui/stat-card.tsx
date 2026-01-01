import * as React from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"

export interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  subtitle?: string;
  icon: React.ReactNode;
  color?: "default" | "primary" | "success" | "warning" | "danger" | "info";
  href?: string;
  className?: string;
}

const colorClasses = {
  default: "bg-muted text-muted-foreground",
  primary: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
  success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  danger: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  info: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
};

export function StatCard({
  title,
  value,
  description,
  subtitle,
  icon,
  color = "default",
  href,
  className
}: StatCardProps) {
  const handleClick = (e: React.MouseEvent) => {
    if (href && href.includes('#')) {
      const [path, hash] = href.split('#');
      if (path === window.location.pathname || path === '') {
        e.preventDefault();
        const element = document.getElementById(hash);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    }
  };

  const content = (
    <div className="flex items-center gap-3">
      <div className={cn("p-2 rounded-lg shrink-0", colorClasses[color])}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <span className="text-xs font-medium text-accent-primary">{title}</span>
        <div className="flex items-baseline gap-1.5">
          <span className="text-xl font-bold text-foreground">{value}</span>
          {(description || subtitle) && (
            <span className="text-xs text-muted-foreground truncate">{description || subtitle}</span>
          )}
        </div>
      </div>
    </div>
  );

  const cardClasses = cn(
    "px-4 py-3 rounded-3xl bg-bg-card shadow-card-soft transition-all duration-200 hover:shadow-card-soft",
    href && "cursor-pointer",
    className
  );

  if (href) {
    return (
      <Link href={href} onClick={handleClick} className={cardClasses}>
        {content}
      </Link>
    );
  }

  return <div className={cardClasses}>{content}</div>;
}
