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
  default: "bg-slate-100 text-slate-600",
  primary: "bg-indigo-100 text-indigo-600",
  success: "bg-emerald-100 text-emerald-600",
  warning: "bg-amber-100 text-amber-600",
  danger: "bg-rose-100 text-rose-600",
  info: "bg-blue-100 text-blue-600",
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
        <span className="text-sm font-medium text-slate-500">{title}</span>
        <div className={cn("p-2 rounded-lg", colorClasses[color])}>
          {icon}
        </div>
      </div>
      <div>
        <div className="text-2xl font-bold text-slate-900">{value}</div>
        {(description || subtitle) && (
          <p className="text-xs text-slate-500 mt-1">{description || subtitle}</p>
        )}
      </div>
    </div>
  );

  const cardClasses = cn(
    "p-4 rounded-xl border border-slate-200/50 bg-white shadow-sm transition-all duration-200 hover:shadow-md",
    href && "cursor-pointer hover:border-slate-300/50",
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

