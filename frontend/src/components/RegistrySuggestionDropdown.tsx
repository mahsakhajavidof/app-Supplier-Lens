import type { RegistrySearchResult } from "../types";

export function RegistrySuggestionDropdown({
  suggestions,
  onPick,
}: {
  suggestions: RegistrySearchResult[];
  onPick: (s: RegistrySearchResult) => void;
}) {
  return (
    <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-56 overflow-y-auto rounded-md border border-border bg-white shadow-lg">
      {suggestions.map((s) => (
        <button
          key={s.orgNr}
          type="button"
          // onMouseDown (not onClick) so this fires before the input's onBlur
          // would otherwise close the dropdown first.
          onMouseDown={(e) => {
            e.preventDefault();
            onPick(s);
          }}
          className="flex w-full flex-col gap-0.5 border-b border-border px-3.5 py-2.5 text-left last:border-b-0 hover:bg-surface-subtle"
        >
          <span className="text-[13px] font-medium">{s.name}</span>
          <span className="text-xs text-muted">
            {[s.orgNr, s.legalForm, s.address].filter(Boolean).join(" · ")}
          </span>
        </button>
      ))}
    </div>
  );
}
