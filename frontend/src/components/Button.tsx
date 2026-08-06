import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost";

const BASE = "rounded-sm text-[13px] font-medium cursor-pointer disabled:cursor-not-allowed disabled:opacity-60";
const VARIANTS: Record<Variant, string> = {
  primary: "bg-accent text-white font-semibold px-4 py-2.5 hover:bg-accent-hover",
  secondary: "bg-white text-link border border-border px-3.5 py-2 hover:bg-surface-subtle",
  ghost: "bg-transparent text-muted px-0 py-0 hover:text-link",
};

export function Button({
  variant = "secondary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button className={`${BASE} ${VARIANTS[variant]} ${className}`} {...props} />;
}
