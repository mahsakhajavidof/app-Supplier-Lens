import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { Modal, Field, inputClass } from "./Modal";
import { Button } from "./Button";
import type { RegistryLookupResult, RegistrySearchResult, Subcontractor } from "../types";

// Friendly names for the country codes registry providers serve. Falls back
// to the raw code for any provider added later without an entry here.
const COUNTRY_NAMES: Record<string, string> = { NO: "Norway", GB: "United Kingdom" };

const SEARCH_DEBOUNCE_MS = 300;

export function AddSubcontractorModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (sub: Subcontractor) => void;
}) {
  const { data: team } = useQuery({ queryKey: ["team"], queryFn: api.settings.team });
  const { data: registries } = useQuery({ queryKey: ["registries"], queryFn: api.settings.registries });
  const { data: filters } = useQuery({ queryKey: ["subcontractor-filters"], queryFn: api.subcontractors.filters });

  const [company, setCompany] = useState("");
  const [country, setCountry] = useState("");
  const [orgNr, setOrgNr] = useState("");
  const [category, setCategory] = useState("");
  const [ownerId, setOwnerId] = useState("");

  const [lookupResult, setLookupResult] = useState<RegistryLookupResult | null>(null);
  const [lookingUp, setLookingUp] = useState(false);
  const [lookupError, setLookupError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  // As-you-type company suggestions, shown under whichever of company
  // name / org number the user is currently typing into.
  const [suggestions, setSuggestions] = useState<RegistrySearchResult[]>([]);
  const [activeField, setActiveField] = useState<"company" | "orgNr" | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const requestSeq = useRef(0);

  const selectedProvider = registries?.find((r) => r.country === country);
  const canLookUp = !!country && !!orgNr.trim() && !lookingUp;

  useEffect(() => () => clearTimeout(debounceRef.current), []);

  function scheduleSuggestionSearch(field: "company" | "orgNr", query: string) {
    setActiveField(field);
    clearTimeout(debounceRef.current);
    if (!country || query.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    const seq = ++requestSeq.current;
    debounceRef.current = setTimeout(async () => {
      try {
        const results = await api.registry.search(country, query.trim());
        if (seq === requestSeq.current) setSuggestions(results);
      } catch {
        if (seq === requestSeq.current) setSuggestions([]);
      }
    }, SEARCH_DEBOUNCE_MS);
  }

  // Selecting a different country or org number invalidates any previous
  // lookup — it no longer describes what's about to be submitted.
  function updateCountry(value: string) {
    setCountry(value);
    setLookupResult(null);
    setLookupError("");
    setSuggestions([]);
  }
  function updateOrgNr(value: string) {
    setOrgNr(value);
    setLookupResult(null);
    setLookupError("");
    scheduleSuggestionSearch("orgNr", value);
  }
  function updateCompany(value: string) {
    setCompany(value);
    scheduleSuggestionSearch("company", value);
  }

  function pickSuggestion(s: RegistrySearchResult) {
    setCompany(s.name);
    setOrgNr(s.orgNr);
    setLookupResult(null);
    setLookupError("");
    setSuggestions([]);
    setActiveField(null);
  }

  // Suggestion buttons use onMouseDown+preventDefault to pick before this
  // fires, so a real blur here means the user clicked away — dismiss the list.
  function dismissSuggestions() {
    setSuggestions([]);
    setActiveField(null);
  }

  async function runLookup() {
    if (!canLookUp) return;
    setSuggestions([]);
    setLookingUp(true);
    setLookupError("");
    try {
      const result = await api.registry.lookup(country, orgNr.trim());
      setLookupResult(result);
      if (!company.trim()) setCompany(result.name);
    } catch (err) {
      setLookupResult(null);
      setLookupError(err instanceof Error ? err.message : "Registry lookup failed");
    } finally {
      setLookingUp(false);
    }
  }

  async function submit() {
    if (!company.trim() || !country || !orgNr.trim() || !category.trim()) return;
    setSaving(true);
    setSaveError("");
    try {
      const sub = await api.subcontractors.create({
        company: company.trim(),
        orgNr: orgNr.trim(),
        country,
        category: category.trim(),
        ownerId: ownerId || undefined,
        registryData: lookupResult ?? undefined,
      });
      onCreated(sub);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Could not create subcontractor");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title="Add subcontractor"
      subtitle="Pick the subcontractor's country to connect it to the right company registry."
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            onClick={submit}
            disabled={saving || !company.trim() || !country || !orgNr.trim() || !category.trim()}
          >
            {saving ? "Adding…" : "Add subcontractor"}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label="Country">
          <select className={inputClass} value={country} onChange={(e) => updateCountry(e.target.value)}>
            <option value="">Select country…</option>
            {registries?.map((r) => (
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
              value={orgNr}
              onChange={(e) => updateOrgNr(e.target.value)}
              onFocus={() => setActiveField("orgNr")}
              onBlur={dismissSuggestions}
              placeholder="e.g. 923609016"
              autoComplete="off"
            />
          </Field>
          {activeField === "orgNr" && suggestions.length > 0 && (
            <SuggestionDropdown suggestions={suggestions} onPick={pickSuggestion} />
          )}
        </div>
      </div>

      <div className="relative flex flex-col gap-1.5">
        <Field label="Company name">
          <input
            className={inputClass}
            value={company}
            onChange={(e) => updateCompany(e.target.value)}
            onFocus={() => setActiveField("company")}
            onBlur={dismissSuggestions}
            placeholder={country ? "Start typing to search the registry…" : "Company name"}
            autoComplete="off"
          />
        </Field>
        {activeField === "company" && suggestions.length > 0 && (
          <SuggestionDropdown suggestions={suggestions} onPick={pickSuggestion} />
        )}
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={runLookup} disabled={!canLookUp}>
          {lookingUp ? "Looking up…" : "Look up in registry"}
        </Button>
        {!country && <span className="text-xs text-muted">Select a country to enable search and lookup.</span>}
        {selectedProvider && !selectedProvider.configured && (
          <span className="text-xs text-muted">{selectedProvider.registryName} needs an API key — see Settings.</span>
        )}
      </div>

      {lookupError && (
        <div className="rounded-md border border-danger-border bg-danger-bg px-3.5 py-2.5 text-[12.5px] text-danger-fg">
          {lookupError}
        </div>
      )}

      {lookupResult && (
        <div className="flex flex-col gap-1.5 rounded-md bg-surface-subtle p-3.5 text-[12.5px]">
          <span className="font-medium">Found: {lookupResult.name}</span>
          <span className="text-muted">
            {[lookupResult.legalForm, lookupResult.companyStatus, lookupResult.address].filter(Boolean).join(" · ") ||
              "No further details returned."}
          </span>
          <span className="text-muted">This will be saved as the subcontractor's starting profile.</span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Field label="Category">
          <input
            className={inputClass}
            list="subcontractor-category-options"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="e.g. Electrical, Plumbing"
          />
          <datalist id="subcontractor-category-options">
            {filters?.categories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </Field>
        <Field label="Assigned employee">
          <select className={inputClass} value={ownerId} onChange={(e) => setOwnerId(e.target.value)}>
            <option value="">Unassigned</option>
            {team?.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {saveError && (
        <div className="rounded-md border border-danger-border bg-danger-bg px-3.5 py-2.5 text-[12.5px] text-danger-fg">
          {saveError}
        </div>
      )}
    </Modal>
  );
}

function SuggestionDropdown({
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
