import { NavLink } from "react-router-dom";
import { Icon, type ICONS } from "./Icon";

const NAV: { to: string; label: string; icon: keyof typeof ICONS; badge?: string }[] = [
  { to: "/", label: "Dashboard", icon: "dashboard" },
  { to: "/subcontractors", label: "Subcontractors", icon: "companies" },
  { to: "/changes", label: "Changes and alerts", icon: "changes" },
  { to: "/tasks", label: "Follow-up tasks", icon: "tasks" },
  { to: "/reports", label: "Reports", icon: "reports" },
  { to: "/settings", label: "Settings", icon: "settings" },
];

export function Sidebar() {
  return (
    <aside className="sticky top-0 flex h-screen w-[248px] flex-none flex-col border-r border-border bg-white">
      <div className="flex items-center gap-2.5 px-5 py-[18px] pt-6">
        <div className="flex h-[30px] w-[30px] items-center justify-center rounded-[9px] border border-border bg-surface-tint">
          <div className="h-[11px] w-[11px] rounded-[3px] border-2 border-accent" />
        </div>
        <div className="flex flex-col gap-px">
          <span className="text-sm font-semibold tracking-tight text-link">Supplier Lens</span>
          <span className="text-[11px] text-muted">Subcontractor monitoring</span>
        </div>
      </div>

      <nav className="flex flex-col gap-0.5 px-3 py-1.5">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              `flex items-center gap-2.5 rounded-[9px] px-2.5 py-[9px] text-[13.5px] ${
                isActive ? "bg-surface-tint font-semibold text-link" : "font-medium text-muted hover:bg-surface-subtle"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon name={item.icon} size={17} color={isActive ? "#1F4F6F" : "#6B7C89"} />
                <span className="flex-1">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto border-t border-border p-3.5">
        <div className="flex items-center gap-2.5 rounded-[10px] bg-surface-subtle p-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-chip text-xs font-semibold text-link">
            MS
          </div>
          <div className="flex min-w-0 flex-col gap-px">
            <span className="text-[12.5px] font-semibold text-ink">Marte Solberg</span>
            <span className="overflow-hidden truncate text-[11px] text-muted">Nordbygg Entreprenør AS</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
