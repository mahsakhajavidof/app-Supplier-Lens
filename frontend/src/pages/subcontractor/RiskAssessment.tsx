import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { Card, CardHeader } from "../../components/Card";
import { Button } from "../../components/Button";
import { RiskIndicatorCard } from "../../components/RiskIndicatorCard";
import { NegotiationBriefModal } from "../../components/NegotiationBriefModal";
import type { Subcontractor } from "../../types";

const STATUS_ORDER = { "High attention": 0, Attention: 1, Neutral: 2, Positive: 3 };

export function RiskAssessment({ sub }: { sub: Subcontractor }) {
  const queryClient = useQueryClient();
  const [showBrief, setShowBrief] = useState(false);
  const { data } = useQuery({
    queryKey: ["risk-assessment", sub.id],
    queryFn: () => api.riskAssessment.get(sub.id),
  });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["risk-assessment", sub.id] });
    queryClient.invalidateQueries({ queryKey: ["subcontractor", sub.id] });
  }

  if (!data) return <div className="p-10 text-sm text-muted">Loading…</div>;

  const decisionByKey = new Map(data.decisions.map((d) => [d.indicatorKey, d]));
  const sortedIndicators = [...data.indicators].sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);

  return (
    <div className="flex flex-col gap-5">
      <Card className="p-5">
        <div className="mb-1.5 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold">Calculated financial metrics</h2>
          <span className="text-xs text-muted">Calculated by Supplier Lens from reported figures</span>
        </div>
        <p className="mb-4 text-[12.5px] text-muted">
          These figures are derived from the reported financials shown in the Financial information tab — they are never themselves
          figures a registry reported directly.
        </p>
        <div className="grid grid-cols-3 gap-3">
          {data.metrics.map((m) => (
            <div key={m.key} className="rounded-md bg-surface-subtle p-3">
              <div className="text-xs text-muted">{m.label}</div>
              <div className="text-[15px] font-semibold">
                {m.calculable ? `${m.value!.toFixed(1)}${m.unit === "percent" ? "%" : ""}` : "Not calculable"}
              </div>
              <div className="text-[11.5px] text-muted">{m.calculable ? m.periodLabel : m.reason}</div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader
          title="Risk indicators"
          subtitle="Not an official rating. Not an automatic accept/reject decision — for your own review."
          action={<Button variant="primary" onClick={() => setShowBrief(true)}>Generate negotiation brief</Button>}
        />
        <div className="flex flex-col gap-3 p-4">
          {sortedIndicators.map((ind) => (
            <RiskIndicatorCard key={ind.key} subcontractorId={sub.id} indicator={ind} decision={decisionByKey.get(ind.key)} onChanged={invalidate} />
          ))}
        </div>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader title="Negotiation & due-diligence guidance" subtitle="Deterministic suggestions — always tied to an indicator's evidence." />
        <div className="flex flex-col">
          {data.guidance.map((g) => (
            <div key={g.key} className="border-b border-border px-5 py-3.5 last:border-b-0">
              <div className="text-[13px] font-medium">{g.category}</div>
              <p className="mt-1 text-[12.5px] text-muted">{g.guidance}</p>
              <p className="mt-1 text-[11.5px] text-muted">Evidence: {g.evidenceSummary}</p>
            </div>
          ))}
        </div>
      </Card>

      {showBrief && <NegotiationBriefModal subcontractorId={sub.id} company={sub.company} onClose={() => setShowBrief(false)} />}
    </div>
  );
}
