import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "border-border bg-surface shadow-card rounded-3xl border transition-colors",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({
  title,
  description,
  action,
  icon,
  className,
}: {
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6",
        className,
      )}
    >
      <div className="flex min-w-0 items-start gap-3.5">
        {icon && (
          <span className="bg-brand-soft text-brand grid size-10 shrink-0 place-items-center rounded-2xl">
            {icon}
          </span>
        )}
        <div className="min-w-0">
          <h2 className="text-fg text-lg font-bold">{title}</h2>
          {description && <p className="text-fg-2 mt-1 text-sm leading-relaxed">{description}</p>}
        </div>
      </div>
      {action && <div className="flex shrink-0 flex-wrap gap-2">{action}</div>}
    </div>
  );
}

export function CardBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-5 pb-5 sm:px-6 sm:pb-6", className)} {...props} />;
}
