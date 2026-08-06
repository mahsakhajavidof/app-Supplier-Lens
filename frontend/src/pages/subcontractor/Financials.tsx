import type { Subcontractor } from "../../types";
import { Card } from "../../components/Card";

export function Financials({ sub }: { sub: Subcontractor }) {
  const years = [...(sub.financials ?? [])].sort((a, b) => a.year - b.year);
  const currencies = Array.from(new Set(years.map((year) => year.currency).filter(Boolean)));
  const unit = currencies.length === 1 ? `M${currencies[0]}` : "millions, reported currency";
  const rows: [string, (y: (typeof years)[number]) => string | number][] = [
    [`Operating revenue (${unit})`, (y) => y.operatingRevenue ?? "—"],
    [`Operating result (${unit})`, (y) => y.operatingResult ?? "—"],
    [`Result before tax (${unit})`, (y) => y.resultBeforeTax ?? "—"],
    ["Equity ratio", (y) => (y.equityRatio != null ? `${Math.round(y.equityRatio * 100)} %` : "—")],
    ["Liquidity ratio", (y) => y.liquidityRatio ?? "—"],
    ["Employees", (y) => y.employees ?? "—"],
  ];

  const revenues = years.map((y) => y.operatingRevenue ?? 0);
  const maxRevenue = Math.max(1, ...revenues);

  return (
    <div className="flex flex-col gap-5">
      <Card className="p-5">
        <div className="mb-1.5 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold">Reported figures</h2>
          <span className="text-xs text-muted">Source: Annual accounts register</span>
        </div>
        <p className="mb-4 text-[12.5px] text-muted">Figures are shown as reported. No score or rating is calculated by the platform.</p>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr className="bg-surface-subtle">
                <th className="px-3.5 py-2.5 text-left text-[11.5px] font-semibold uppercase tracking-wide text-muted">Indicator</th>
                {years.map((y) => (
                  <th key={y.id} className="px-3.5 py-2.5 text-right text-[11.5px] font-semibold uppercase tracking-wide text-muted">
                    {y.year}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(([label, get]) => (
                <tr key={label} className="border-t border-border">
                  <td className="px-3.5 py-3 font-medium">{label}</td>
                  {years.map((y) => (
                    <td key={y.id} className="px-3.5 py-3 text-right tabular-nums text-muted">
                      {get(y)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="text-[15px] font-semibold">Operating revenue</h2>
        <span className="text-xs text-muted">{unit}, as reported</span>
        <div className="mt-6 flex h-[168px] items-end gap-4">
          {years.map((y, i) => (
            <div key={y.id} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
              <span className="text-xs font-semibold tabular-nums">{y.operatingRevenue?.toFixed(1) ?? "—"}</span>
              <div
                className={`w-full rounded-t-md ${i === years.length - 1 ? "bg-accent" : "bg-surface-chip"}`}
                style={{ height: `${Math.round(((y.operatingRevenue ?? 0) / maxRevenue) * 100)}%` }}
              />
              <span className="text-[11.5px] text-muted">{y.year}</span>
            </div>
          ))}
          {years.length === 0 && <p className="text-[13px] text-muted">No financial history on file.</p>}
        </div>
      </Card>
    </div>
  );
}
