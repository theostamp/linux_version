import { cn } from "@/lib/utils";

export const BentoGrid = ({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) => {
  return (
    <div
      className={cn(
        "grid w-full grid-cols-1 md:auto-rows-[minmax(18rem,auto)] md:grid-cols-3 gap-4 md:gap-5 lg:gap-6 max-w-7xl mx-auto",
        className
      )}
    >
      {children}
    </div>
  );
};

export const BentoGridItem = ({
  className,
  title,
  description,
  header,
  icon,
}: {
  className?: string;
  title?: string | React.ReactNode;
  description?: string | React.ReactNode;
  header?: React.ReactNode;
  icon?: React.ReactNode;
}) => {
  const hasMeta = icon || title || description;

  return (
    <div
      className={cn(
        "row-span-1 rounded-2xl group/bento bg-[hsl(var(--card)/0.8)] backdrop-blur-sm shadow-[0_1px_3px_rgba(0,0,0,0.05),0_1px_2px_rgba(0,0,0,0.03)] ring-1 ring-black/[0.03] transition-all duration-200 p-5 sm:p-6 flex flex-col gap-5",
        "hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.1)] hover:ring-black/[0.06]",
        className
      )}
    >
      {header && <div className={cn("flex-1", hasMeta && "min-h-[5rem]")}>{header}</div>}
      {hasMeta && (
        <div className="space-y-2">
          {icon && (
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
              {icon}
            </div>
          )}
          {title && (
            <div className="font-condensed text-lg font-semibold text-slate-900">
              {title}
            </div>
          )}
          {description && (
            <p className="text-sm text-slate-500">
              {description}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

