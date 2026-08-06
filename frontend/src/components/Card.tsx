import type { ReactNode } from "react";

export function Card({ children, className = "", tint = false }: { children: ReactNode; className?: string; tint?: boolean }) {
  return (
    <div className={`rounded-lg border border-border ${tint ? "bg-surface-tint" : "bg-white"} ${className}`}>
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-4">
      <div className="flex flex-col gap-0.5">
        <h2 className="text-[15px] font-semibold">{title}</h2>
        {subtitle && <span className="text-[12.5px] text-muted">{subtitle}</span>}
      </div>
      {action}
    </div>
  );
}
