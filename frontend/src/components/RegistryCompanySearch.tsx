import { Field, inputClass } from "./Modal";
import { Button } from "./Button";
import { RegistrySuggestionDropdown } from "./RegistrySuggestionDropdown";
import { RegistryLookupSummary } from "./RegistryLookupSummary";
import type { RegistryLookupResult, RegistryProviderStatus, RegistrySearchResult } from "../types";

// Friendly names for the country codes registry providers serve. Falls back
// to the raw code for any provider added later without an entry here.
const COUNTRY_NAMES: Record<string, string> = { NO: "Norway", GB: "United Kingdom" };

type ActiveField = "company" | "orgNr" | null;

// Country selection, name/org-number search with as-you-type suggestions,
// and the resulting company lookup — the registry-facing part of the "Add
// subcontractor" form, split out to keep that file under the size limit.
export function RegistryCompanySearch(props: {
  registries?: RegistryProviderStatus[];
  country: string;
  onCountryChange: (v: string) => void;
  orgNr: string;
  onOrgNrChange: (v: string) => void;
  company: string;
  onCompanyChange: (v: string) => void;
  activeField: ActiveField;
  onFocusField: (f: "company" | "orgNr") => void;
  onBlurField: () => void;
  suggestions: RegistrySearchResult[];
  onPickSuggestion: (s: RegistrySearchResult) => void;
  searchError: string;
  canLookUp: boolean;
  lookingUp: boolean;
  onLookup: () => void;
  lookupError: string;
  lookupResult: RegistryLookupResult | null;
}) {
  const selectedProvider = props.registries?.find((r) => r.country === props.country);
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Country">
          <select
            className={inputClass}
            value={props.country}
            onChange={(e) => props.onCountryChange(e.target.value)}
          >
            <option value="">Select country…</option>
            {props.registries?.map((r) => (
              <option key={r.country} value={r.country}>
                {COUNTRY_NAMES[r.country] ?? r.country}
                {!r.configured ? " (registry needs API key)" : ""}
              </option>
            ))}
          </select>
        </Field>
        <div className="relative flex flex-col gap-1.5">
          <Field label="Organisation / company number">
            <input
              className={inputClass}
              value={props.orgNr}
              onChange={(e) => props.onOrgNrChange(e.target.value)}
              onFocus={() => props.onFocusField("orgNr")}
              onBlur={props.onBlurField}
              placeholder="e.g. 923609016"
              autoComplete="off"
            />
          </Field>
          {props.activeField === "orgNr" && props.suggestions.length > 0 && (
            <RegistrySuggestionDropdown suggestions={props.suggestions} onPick={props.onPickSuggestion} />
          )}
        </div>
      </div>

      <div className="relative flex flex-col gap-1.5">
        <Field label="Company name">
          <input
            className={inputClass}
            value={props.company}
            onChange={(e) => props.onCompanyChange(e.target.value)}
            onFocus={() => props.onFocusField("company")}
            onBlur={props.onBlurField}
            placeholder={props.country ? "Start typing to search the registry…" : "Company name"}
            autoComplete="off"
          />
        </Field>
        {props.activeField === "company" && props.suggestions.length > 0 && (
          <RegistrySuggestionDropdown suggestions={props.suggestions} onPick={props.onPickSuggestion} />
        )}
      </div>

      {props.searchError && (
        <div className="rounded-md border border-danger-border bg-danger-bg px-3.5 py-2.5 text-[12.5px] text-danger-fg">
          {props.searchError}
        </div>
      )}

      <div className="flex items-center gap-3">
        <Button onClick={props.onLookup} disabled={!props.canLookUp}>
          {props.lookingUp ? "Looking up…" : "Look up in registry"}
        </Button>
        {!props.country && <span className="text-xs text-muted">Select a country to enable search and lookup.</span>}
        {selectedProvider && !selectedProvider.configured && (
          <span className="text-xs text-muted">{selectedProvider.registryName} needs an API key — see Settings.</span>
        )}
      </div>

      {props.lookupError && (
        <div className="rounded-md border border-danger-border bg-danger-bg px-3.5 py-2.5 text-[12.5px] text-danger-fg">
          {props.lookupError}
        </div>
      )}

      {props.lookupResult && <RegistryLookupSummary result={props.lookupResult} />}
    </>
  );
}
