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
    <div className="flex flex-col h-full justify-between">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-muted-foreground">{title}</span>
        <div className={cn("p-2 rounded-lg", colorClasses[color])}>
          {icon}
        </div>
      </div>
      <div>
        <div className="text-2xl font-bold text-foreground">{value}</div>
        {(description || subtitle) && (
          <p className="text-xs text-muted-foreground mt-1">{description || subtitle}</p>
        )}
      </div>
    </div>
  );

  const cardClasses = cn(
    "p-4 rounded-xl border border-border bg-card shadow-sm transition-all duration-200 hover:shadow-md",
    href && "cursor-pointer hover:border-primary/50",
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

