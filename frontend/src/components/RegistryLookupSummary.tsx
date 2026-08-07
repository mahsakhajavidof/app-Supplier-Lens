import type { RegistryLookupResult } from "../types";

function row(label: string, value?: string | number | boolean) {
  if (value === undefined || value === null || value === "") return null;
  return (
    <span key={label}>
      {label}: {typeof value === "boolean" ? (value ? "Yes" : "No") : value}
    </span>
  );
}

// The confirmation shown after a registry lookup succeeds — every field the
// app has for this company, so the user can verify it's the right one before
// submitting the form (the record itself isn't saved until they do).
export function RegistryLookupSummary({ result }: { result: RegistryLookupResult }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-md bg-surface-subtle p-3.5 text-[12.5px]">
      <span className="font-medium">Company found: {result.name}</span>
      <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-muted">
        {row("Org./company number", result.orgNr)}
        {row("Status", result.companyStatus)}
        {row("Legal form", result.legalForm)}
        {row("Registered on", result.registeredOn)}
        {row("Industry code", result.industryCode)}
        {row("Employees", result.employees)}
        {row("VAT registered", result.vatRegistered)}
        {row("Contact phone", result.contactPhone)}
        {result.address && <span className="col-span-2">Registered address: {result.address}</span>}
      </div>
      <span className="text-muted">This will be saved as the subcontractor's starting profile.</span>
    </div>
  );
}
