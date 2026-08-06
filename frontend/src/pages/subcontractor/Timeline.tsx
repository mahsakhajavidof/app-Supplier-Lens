import { useState } from "react";
import type { Subcontractor } from "../../types";
import { api } from "../../lib/api";
import { useToast } from "../../lib/toast";
import { Badge } from "../../components/Badge";
import { Button } from "../../components/Button";
import { formatDateTime } from "../../lib/format";

export function Timeline({ sub, onReviewed }: { sub: Subcontractor; onReviewed: () => void }) {
  const { flash } = useToast();
  const [pending, setPending] = useState<string | null>(null);

  async function markReviewed(eventId: string) {
    setPending(eventId);
    try {
      await api.events.review(eventId);
      onReviewed();
      flash("Change marked as reviewed.");
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="max-w-[860px]">
      <div className="mb-5 flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h2 className="text-[17px] font-semibold">Change timeline</h2>
          <span className="text-[12.5px] text-muted">All detected changes with source and previous value, newest first.</span>
        </div>
        <span className="text-[12.5px] text-muted">{sub.events.length} changes</span>
      </div>

      <div className="flex flex-col">
        {sub.events.length === 0 && <p className="text-[13px] text-muted">No changes detected yet.</p>}
        {sub.events.map((e, i) => (
          <div key={e.id} className="flex gap-4">
            <div className="flex w-3 flex-none flex-col items-center pt-6">
              <div className="h-[11px] w-[11px] rounded-full border-2 border-accent bg-white" />
              {i < sub.events.length - 1 && <div className="w-px flex-1 bg-border" />}
            </div>
            <div className="min-w-0 flex-1 pb-4">
              <div className="rounded-lg border border-border p-5">
                <div className="mb-3.5 flex items-start justify-between gap-3.5">
                  <div className="flex flex-col gap-1">
                    <span className="text-[15px] font-semibold">{e.type}</span>
                    <span className="text-xs text-muted">
                      Detected {formatDateTime(e.detectedAt)} · Source: {e.source}
                    </span>
                  </div>
                  <Badge label={e.attention} />
                </div>
                <div className="mb-3.5 grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1 rounded-md bg-surface-subtle p-3.5">
                    <span className="text-[11.5px] text-muted">Previous</span>
                    <span className="text-[13px]">{e.previousValue ?? "—"}</span>
                  </div>
                  <div className="flex flex-col gap-1 rounded-md bg-surface-tint p-3.5">
                    <span className="text-[11.5px] text-muted">Current</span>
                    <span className="text-[13px] font-medium">{e.currentValue ?? "—"}</span>
                  </div>
                </div>
                {e.aiExplanation && (
                  <div className="mb-3.5 rounded-md border border-border p-3.5">
                    <span className="mb-1 block text-[11.5px] font-semibold text-link">AI explanation</span>
                    <span className="text-[12.5px] leading-relaxed">{e.aiExplanation}</span>
                  </div>
                )}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={() => markReviewed(e.id)} disabled={e.reviewed || pending === e.id}>
                      {e.reviewed ? "Reviewed" : "Mark as reviewed"}
                    </Button>
                  </div>
                  <span className="text-xs text-muted">Follow-up: {e.followUp}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
