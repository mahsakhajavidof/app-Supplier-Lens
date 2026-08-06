import type { Subcontractor } from "../../types";
import { Card } from "../../components/Card";
import { formatOrgNr } from "../../lib/format";

export function CompanyInfo({ sub }: { sub: Subcontractor }) {
  const registered: [string, string][] = [
    ["Registered name", sub.company],
    ["Organisation number", formatOrgNr(sub.orgNr)],
    ["Legal form", sub.legalForm ?? "—"],
    ["Registered address", sub.address ?? "—"],
    ["Postal address", sub.postalAddress ?? "—"],
    ["Industry code", sub.industryCode ?? "—"],
    ["Registered in VAT register", sub.vatRegistered ? "Yes" : "No"],
    ["Contact phone", sub.contactPhone ?? "—"],
    ["Auditor", sub.auditor ?? "—"],
    ["Share capital", sub.shareCapital ?? "—"],
    ["Employees reported", String(sub.employees ?? "—")],
  ];

  return (
    <div className="grid grid-cols-2 gap-5">
      <Card className="p-5">
        <h2 className="mb-3.5 text-[15px] font-semibold">Registered information</h2>
        {registered.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4 border-b border-border py-2.5 text-[12.5px] last:border-b-0">
            <span className="text-muted">{label}</span>
            <span className="text-right font-medium">{value}</span>
          </div>
        ))}
      </Card>

      <div className="flex flex-col gap-5">
        <Card className="p-5">
          <h2 className="mb-3.5 text-[15px] font-semibold">Management and board</h2>
          <div className="flex flex-col gap-2.5">
            {(sub.people ?? []).map((p) => (
              <div key={p.id} className="flex items-center gap-3 rounded-md bg-surface-subtle px-3 py-2.5">
                <div className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-surface-chip text-[11.5px] font-semibold text-link">
                  {p.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)}
                </div>
                <div className="flex flex-1 flex-col gap-0.5">
                  <span className="text-[13px] font-medium">{p.name}</span>
                  <span className="text-[11.5px] text-muted">{p.role}</span>
                </div>
                <span className="text-[11.5px] text-muted">{p.since}</span>
              </div>
            ))}
            {(sub.people ?? []).length === 0 && <p className="text-[13px] text-muted">No people on file.</p>}
          </div>
        </Card>

        <Card tint className="p-5">
          <h2 className="mb-3 text-[15px] font-semibold text-link">Ownership</h2>
          <div className="flex flex-col gap-2.5">
            {(sub.owners ?? []).map((o) => (
              <div key={o.id} className="flex items-center justify-between gap-3 text-[12.5px]">
                <span>{o.name}</span>
                <span className="font-semibold tabular-nums text-link">{o.sharePercent} %</span>
              </div>
            ))}
            {(sub.owners ?? []).length === 0 && <p className="text-[13px] text-muted">No ownership data on file.</p>}
          </div>
        </Card>
      </div>
    </div>
  );
}
