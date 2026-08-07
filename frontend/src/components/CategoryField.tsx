import { useState } from "react";
import { Field, inputClass } from "./Modal";

// Predefined subcontractor categories from the ops chart. Order matters —
// this is the order they appear in the dropdown. "Other" is appended
// separately so it always renders last regardless of this list's length.
export const PREDEFINED_CATEGORIES = [
  "Maintenance, Repair and Overhaul",
  "Subsea Equipment",
  "Chartering",
  "Logistics",
  "Professional Services",
  "Crewing",
  "ITC",
  "Yard Services",
  "Bunkering",
  "Insurance",
  "Subsea Services",
  "Travel Management",
  "Catering & Provisions",
];

const OTHER = "Other";

// A predefined-category dropdown with an "Other" escape hatch for a custom
// value. Reports the category to actually save via onChange — never the
// literal "Other" sentinel, and never a value with leading/trailing
// whitespace (an unfilled custom value reports "" so the caller's existing
// "category is required" validation blocks submission without any change).
export function CategoryField({ onChange }: { onChange: (category: string) => void }) {
  const [selected, setSelected] = useState("");
  const [custom, setCustom] = useState("");

  function handleSelect(next: string) {
    setSelected(next);
    if (next === OTHER) {
      onChange(custom.trim());
    } else {
      setCustom("");
      onChange(next);
    }
  }

  function handleCustomChange(next: string) {
    setCustom(next);
    onChange(next.trim());
  }

  return (
    <>
      <Field label="Category">
        <select
          className={inputClass}
          value={selected}
          onChange={(e) => handleSelect(e.target.value)}
          aria-label="Category"
        >
          <option value="">Select category…</option>
          {PREDEFINED_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
          <option value={OTHER}>{OTHER}</option>
        </select>
      </Field>
      {selected === OTHER && (
        <Field label="Custom category">
          <input
            className={inputClass}
            value={custom}
            onChange={(e) => handleCustomChange(e.target.value)}
            placeholder="Enter a custom category"
            aria-label="Custom category"
            required
          />
        </Field>
      )}
    </>
  );
}
