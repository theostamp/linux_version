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
        "grid w-full grid-cols-1 auto-rows-auto md:grid-cols-3 gap-4 md:gap-5 lg:gap-6 max-w-7xl mx-auto",
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
        "row-span-1 rounded-2xl group/bento bg-[hsl(var(--card))] shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-all duration-200 p-5 sm:p-6 flex flex-col gap-5",
        "hover:-translate-y-0.5 hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)]",
        className
      )}
    >
      {header && <div className={cn("flex-1", hasMeta && "min-h-[5rem]")}>{header}</div>}
      {hasMeta && (
        <div className="space-y-2">
          {icon && (
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-300">
              {icon}
            </div>
          )}
          {title && (
            <div className="font-condensed text-lg font-semibold text-foreground">
              {title}
            </div>
          )}
          {description && (
            <p className="text-sm text-muted-foreground">
              {description}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
