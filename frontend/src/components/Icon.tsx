// Small stroke-icon set, paths lifted from the original design so the app
// matches it visually. Add a new icon by adding a path string here.
export const ICONS = {
  dashboard: "M4 4h7v7H4z M13 4h7v5h-7z M13 11h7v9h-7z M4 13h7v7H4z",
  companies: "M4 20V6l7-2v16 M11 20h9V10h-9 M14 13h3 M14 16h3 M7 9h1 M7 12h1 M7 15h1",
  changes: "M3 13h4l2-6 3 12 2.5-8 2 4H21",
  tasks: "M4 5h16v14H4z M8 12l2.5 2.5L16 9",
  reports: "M6 3h9l4 4v14H6z M15 3v4h4 M9 12h6 M9 16h6",
  settings: "M4 8h10 M18 8h2 M4 16h4 M12 16h8 M16 8a2 2 0 1 0 0 0.01 M10 16a2 2 0 1 0 0 0.01",
  count: "M4 6h16 M4 12h16 M4 18h10",
  eye: "M2 12s4-6 10-6 10 6 10 6-4 6-10 6-10-6-10-6z M12 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4z",
  doc: "M6 3h9l4 4v14H6z M9 12h6 M9 16h6",
  chart: "M4 20V9 M10 20V4 M16 20v-7 M22 20H2",
  search: "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14z M16.5 16.5 21 21",
  back: "M15 5 8 12 15 19",
  sync: "M4 4v6h6 M20 20v-6h-6 M5.5 9a7 7 0 0 1 12-3.5L20 8 M18.5 15a7 7 0 0 1-12 3.5L4 16",
} as const;

export function Icon({ name, size = 16, color = "currentColor" }: { name: keyof typeof ICONS; size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      {ICONS[name].split(" M").map((seg, i) => (
        <path key={i} d={i === 0 ? seg : `M${seg}`} />
      ))}
    </svg>
  );
}
