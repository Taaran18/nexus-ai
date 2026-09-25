import { cn } from "@/lib/utils";

export function Table({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("scrollbar-thin overflow-x-auto", className)}>
      <table className="w-full border-collapse text-left text-sm text-fg">{children}</table>
    </div>
  );
}

export function THead({ children }: { children: React.ReactNode }) {
  return (
    <thead className="border-y border-border bg-bg-subtle text-[12px] font-bold tracking-wider text-muted uppercase">
      {children}
    </thead>
  );
}

export function Th({ className, children }: { className?: string; children?: React.ReactNode }) {
  return (
    <th className={cn("px-5 py-3 font-bold whitespace-nowrap first:pl-6 last:pr-6", className)}>
      {children}
    </th>
  );
}

export function Tr({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn(
        "border-b border-border transition-colors last:border-0 even:bg-bg-subtle/60 hover:bg-brand-soft",
        className,
      )}
      {...props}
    />
  );
}

export function Td({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      className={cn("px-5 py-3.5 align-middle text-fg first:pl-6 last:pr-6", className)}
      {...props}
    />
  );
}
