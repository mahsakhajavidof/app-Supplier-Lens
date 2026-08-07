import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { Modal, Field, inputClass } from "./Modal";
import { Button } from "./Button";
import { RegistryCompanySearch } from "./RegistryCompanySearch";
import { CategoryField } from "./CategoryField";
import type { RegistryLookupResult, RegistrySearchResult, Subcontractor } from "../types";

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
  const [searchError, setSearchError] = useState("");
  const [activeField, setActiveField] = useState<"company" | "orgNr" | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const requestSeq = useRef(0);

  const canLookUp = !!country && !!orgNr.trim() && !lookingUp;

  useEffect(() => () => clearTimeout(debounceRef.current), []);

  function scheduleSuggestionSearch(field: "company" | "orgNr", query: string) {
    setActiveField(field);
    clearTimeout(debounceRef.current);
    setSearchError("");
    if (!country || query.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    const seq = ++requestSeq.current;
    debounceRef.current = setTimeout(async () => {
      try {
        const results = await api.registry.search(country, query.trim());
        if (seq === requestSeq.current) {
          setSuggestions(results);
          setSearchError("");
        }
      } catch (err) {
        if (seq === requestSeq.current) {
          setSuggestions([]);
          setSearchError(err instanceof Error ? err.message : "Registry search failed");
        }
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
    setSearchError("");
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

  // Picking a suggestion is the whole point of searching — it must land the
  // user on a completed, confirmed lookup, not a filled-in form waiting for
  // another button press.
  function pickSuggestion(s: RegistrySearchResult) {
    setCompany(s.name);
    setOrgNr(s.orgNr);
    setLookupResult(null);
    setLookupError("");
    setSuggestions([]);
    setActiveField(null);
    void runLookup(s.orgNr);
  }

  // Suggestion buttons use onMouseDown+preventDefault to pick before this
  // fires, so a real blur here means the user clicked away — dismiss the list.
  function dismissSuggestions() {
    setSuggestions([]);
    setActiveField(null);
  }

  // Accepts an explicit org number so pickSuggestion() can trigger the
  // lookup immediately with the value just selected, rather than reading
  // `orgNr` state that React hasn't re-rendered with yet.
  async function runLookup(overrideOrgNr?: string) {
    const nr = (overrideOrgNr ?? orgNr).trim();
    if (!country || !nr || lookingUp) return;
    setSuggestions([]);
    setLookingUp(true);
    setLookupError("");
    try {
      const result = await api.registry.lookup(country, nr);
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
      <RegistryCompanySearch
        registries={registries}
        country={country}
        onCountryChange={updateCountry}
        orgNr={orgNr}
        onOrgNrChange={updateOrgNr}
        company={company}
        onCompanyChange={updateCompany}
        activeField={activeField}
        onFocusField={setActiveField}
        onBlurField={dismissSuggestions}
        suggestions={suggestions}
        onPickSuggestion={pickSuggestion}
        searchError={searchError}
        canLookUp={canLookUp}
        lookingUp={lookingUp}
        onLookup={() => runLookup()}
        lookupError={lookupError}
        lookupResult={lookupResult}
      />

      <div className="grid grid-cols-2 gap-3">
        <CategoryField onChange={setCategory} />
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
