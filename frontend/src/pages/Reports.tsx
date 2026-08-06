import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useToast } from "../lib/toast";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { Icon } from "../components/Icon";
import { downloadCsv } from "../lib/format";

export function Reports() {
  const { flash } = useToast();
  const { data: types } = useQuery({ queryKey: ["report-types"], queryFn: api.reports.types });
  const [from, setFrom] = useState("2026-07-01");
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const [exporting, setExporting] = useState<string | null>(null);

  async function exportCsv(reportId: string, title: string) {
    setExporting(reportId);
    try {
      const { rows } = await api.reports.run(reportId, { from, to });
      downloadCsv(`${reportId}.csv`, rows as Record<string, unknown>[]);
      flash(`${title} exported as CSV.`);
    } finally {
      setExporting(null);
    }
  }

  return (
    <div className="mx-auto max-w-[1280px] px-10 py-10 pb-16">
      <div className="mb-6 flex flex-col gap-2">
        <h1 className="text-[27px] font-semibold tracking-tight">Reports</h1>
        <p className="text-[14.5px] text-muted">Generate documentation of monitored changes and follow-up activity for a selected period.</p>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-3 rounded-lg border border-border bg-surface-subtle p-4">
        <span className="text-[12.5px] text-muted">Period</span>
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-sm border border-border bg-white px-3 py-2 text-[13px]" />
        <span className="text-[12.5px] text-muted">to</span>
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-sm border border-border bg-white px-3 py-2 text-[13px]" />
      </div>

      <div className="grid grid-cols-3 gap-4">
        {(types ?? []).map((r) => (
          <Card key={r.id} className="flex flex-col gap-3 p-5">
            <div className="flex h-[34px] w-[34px] items-center justify-center rounded-md border border-border bg-surface-tint">
              <Icon name="doc" color="#4A9FD1" />
            </div>
            <div className="flex flex-1 flex-col gap-1.5">
              <span className="text-[14.5px] font-semibold">{r.title}</span>
              <span className="text-[12.5px] leading-relaxed text-muted">{r.desc}</span>
            </div>
            <div className="border-t border-border pt-3">
              <Button className="w-full" onClick={() => exportCsv(r.id, r.title)} disabled={exporting === r.id}>
                {exporting === r.id ? "Exporting…" : "Export CSV"}
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
