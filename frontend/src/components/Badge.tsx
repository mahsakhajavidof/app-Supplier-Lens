import { badgeClass } from "../lib/badges";

export function Badge({ label }: { label: string }) {
  return (
    <span className={`inline-block whitespace-nowrap rounded-full px-[9px] py-[3px] text-[11.5px] font-medium ${badgeClass(label)}`}>
      {label}
    </span>
  );
}
