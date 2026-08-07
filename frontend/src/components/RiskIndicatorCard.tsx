import { useState } from "react";
import { api } from "../lib/api";
import { useToast } from "../lib/toast";
import { useActingManagerId } from "../lib/currentUser";
import { Card } from "./Card";
import { Badge } from "./Badge";
import { Button } from "./Button";
import { inputClass } from "./Modal";
import type { IndicatorDecision, RiskIndicator } from "../types";

type DecisionValue = "NOT_REVIEWED" | "ACCEPTED" | "NOT_RELEVANT" | "RESOLVED";
const DECISION_OPTIONS: { value: DecisionValue; label: string }[] = [
  { value: "NOT_REVIEWED", label: "Not reviewed" },
  { value: "ACCEPTED", label: "Accepted" },
  { value: "NOT_RELEVANT", label: "Not relevant" },
  { value: "RESOLVED", label: "Resolved" },
];

// One risk indicator's full evidence (title/status/observed value/period/
// why it matters/source/retrieval date/rule used) plus the decision and
// convert-to-task workflow. Never an official rating — every field here
// exists so a reviewer can judge the indicator on its own evidence.
export function RiskIndicatorCard({
  subcontractorId,
  indicator,
  decision,
  onChanged,
}: {
  subcontractorId: string;
  indicator: RiskIndicator;
  decision?: IndicatorDecision;
  onChanged: () => void;
}) {
  const { flash } = useToast();
  const actingUserId = useActingManagerId();
  const [status, setStatus] = useState<DecisionValue>("NOT_REVIEWED");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const isImportant = indicator.status === "Attention" || indicator.status === "High attention";
  const noteRequired = status === "NOT_RELEVANT" && isImportant;

  async function saveDecision() {
    if (noteRequired && !note.trim()) {
      flash("A note is required when dismissing an Attention/High attention indicator as not relevant.");
      return;
    }
    setSaving(true);
    try {
      await api.riskAssessment.decide(subcontractorId, indicator.key, {
        status,
        note: note.trim() || undefined,
        decidedById: actingUserId || undefined,
      });
      setNote("");
      onChanged();
      flash("Decision saved.");
    } catch (err) {
      flash(err instanceof Error ? err.message : "Could not save decision");
    } finally {
      setSaving(false);
    }
  }

  async function convertToTask() {
    try {
      await api.riskAssessment.convertToTask(subcontractorId, indicator.key, {});
      onChanged();
      flash("Follow-up task created and linked to this indicator.");
    } catch (err) {
      flash(err instanceof Error ? err.message : "Could not create task");
    }
  }

  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-[13.5px] font-medium">{indicator.title}</span>
          <Badge label={indicator.status} />
          {indicator.isInformationGap && <Badge label="Information gap" />}
        </div>
        {decision && <Badge label={decision.status} />}
      </div>
      <p className="text-[12.5px] text-muted">{indicator.whyItMatters}</p>
      <div className="grid grid-cols-2 gap-2 text-[12.5px]">
        <div>
          <span className="text-muted">Observed value: </span>
          {indicator.observedValue}
        </div>
        <div>
          <span className="text-muted">Comparison period: </span>
          {indicator.comparisonPeriod}
        </div>
        <div>
          <span className="text-muted">Source: </span>
          {indicator.source}
        </div>
        <div>
          <span className="text-muted">Retrieved: </span>
          {new Date(indicator.retrievedAt).toLocaleDateString()}
        </div>
      </div>
      <div className="text-[11.5px] text-muted">Rule used: {indicator.ruleUsed}</div>
      {decision?.note && <div className="rounded-md bg-surface-subtle p-2.5 text-[12.5px]">Note: {decision.note}</div>}
      <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
        <select className={inputClass} value={status} onChange={(e) => setStatus(e.target.value as DecisionValue)}>
          {DECISION_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        {noteRequired && (
          <input
            className={`${inputClass} min-w-[220px] flex-1`}
            placeholder="Required note for dismissing this indicator"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        )}
        <Button onClick={saveDecision} disabled={saving}>
          Save decision
        </Button>
        <Button onClick={convertToTask}>Convert to task</Button>
      </div>
    </Card>
  );
}
