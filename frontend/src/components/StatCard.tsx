import type { ReactNode } from "react";

export function StatCard({ label, value, note, icon }: { label: string; value: ReactNode; note?: string; icon?: ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-surface-tint p-5">
      <div className="mb-3.5 flex items-center justify-between">
        <span className="text-[12.5px] font-medium text-link">{label}</span>
        {icon}
      </div>
      <div className="text-[34px] font-semibold leading-none tracking-tight text-ink">{value}</div>
      {note && <div className="mt-2.5 text-xs text-muted">{note}</div>}
    </div>
  );
}
