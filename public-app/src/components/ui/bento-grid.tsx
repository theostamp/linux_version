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
        "row-span-1 rounded-2xl group/bento border border-border/50 bg-card shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg p-5 sm:p-6 flex flex-col gap-5",
        className
      )}
    >
      {header && <div className={cn("flex-1", hasMeta && "min-h-[5rem]")}>{header}</div>}
      {hasMeta && (
        <div className="space-y-2">
          {icon && (
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
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

