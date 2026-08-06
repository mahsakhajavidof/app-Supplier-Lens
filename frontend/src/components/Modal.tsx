import type { ReactNode } from "react";

export function Modal({
  title,
  subtitle,
  onClose,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-ink/25 p-6" onClick={onClose}>
      <div
        className="animate-rise w-[520px] max-w-full rounded-2xl border border-border bg-white p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-1 text-lg font-semibold">{title}</h2>
        {subtitle && <p className="mb-5 text-[13px] text-muted">{subtitle}</p>}
        <div className="flex flex-col gap-3.5">{children}</div>
        <div className="mt-5 flex justify-end gap-2.5">{footer}</div>
      </div>
    </div>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-muted">{label}</label>
      {children}
    </div>
  );
}

export const inputClass =
  "rounded-sm border border-border px-3 py-2.5 text-[13px] text-ink outline-none focus:border-accent";
