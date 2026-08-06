import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useToast } from "../lib/toast";
import { Badge } from "../components/Badge";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { formatDateTime, formatOrgNr } from "../lib/format";
import type { EventRecord } from "../types";

const FILTERS: { label: string; test: (e: EventRecord) => boolean }[] = [
  { label: "All events", test: () => true },
  { label: "New information", test: (e) => e.attention === "New information" },
  { label: "Change detected", test: (e) => e.attention === "Change detected" },
  { label: "Review recommended", test: (e) => e.attention === "Review recommended" },
  { label: "Time-sensitive", test: (e) => e.attention === "Time-sensitive" },
  { label: "Reviewed", test: (e) => e.followUp === "Reviewed" },
  { label: "Unresolved", test: (e) => e.followUp === "Unresolved" },
];

export function ChangesAndAlerts() {
  const navigate = useNavigate();
  const { flash } = useToast();
  const queryClient = useQueryClient();
  const [active, setActive] = useState("All events");

  const { data: events } = useQuery({ queryKey: ["events"], queryFn: () => api.events.list() });

  async function review(id: string) {
    await api.events.review(id);
    queryClient.invalidateQueries({ queryKey: ["events"] });
    flash("Marked as reviewed. Logged in the change history.");
  }

  const activeFilter = FILTERS.find((f) => f.label === active) ?? FILTERS[0];
  const filtered = (events ?? []).filter(activeFilter.test);

  return (
    <div className="mx-auto max-w-[1280px] px-10 py-10 pb-16">
      <div className="mb-6 flex flex-col gap-2">
        <h1 className="text-[27px] font-semibold tracking-tight">Changes and alerts</h1>
        <p className="max-w-[640px] text-[14.5px] text-muted">
          Factual changes detected from registers, financial sources and internal documents. Assessment and decisions remain with the
          assigned employee.
        </p>
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const count = (events ?? []).filter(f.test).length;
          const isActive = f.label === active;
          return (
            <button
              key={f.label}
              onClick={() => setActive(f.label)}
              className={`rounded-full border px-3.5 py-2 text-[12.5px] ${
                isActive ? "border-accent/40 bg-surface-tint font-semibold text-link" : "border-border bg-white font-medium text-muted"
              }`}
            >
              {f.label} · {count}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {filtered.map((e) => (
          <Card key={e.id} className="flex flex-col gap-3.5 p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col gap-0.5">
                <span className="text-[14.5px] font-semibold">{e.type}</span>
                <span className="text-[12.5px] text-muted">
                  {e.subcontractor?.company} · Org. no. {e.subcontractor ? formatOrgNr(e.subcontractor.orgNr) : ""}
                </span>
              </div>
              <Badge label={e.attention} />
            </div>
            <p className="text-[13.5px] leading-relaxed">{e.description}</p>
            <div className="flex flex-wrap gap-x-5 gap-y-2 rounded-md bg-surface-subtle px-3.5 py-3 text-xs">
              <span className="text-muted">
                Detected <span className="font-medium text-ink">{formatDateTime(e.detectedAt)}</span>
              </span>
              <span className="text-muted">
                Source <span className="font-medium text-ink">{e.source}</span>
              </span>
              <span className="text-muted">
                Assigned <span className="font-medium text-ink">{e.owner?.name ?? "—"}</span>
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <Badge label={e.followUp} />
              <div className="flex gap-2">
                <Button onClick={() => review(e.id)} disabled={e.reviewed}>
                  {e.reviewed ? "Reviewed" : "Mark as reviewed"}
                </Button>
                <Button variant="primary" onClick={() => navigate(`/subcontractors/${e.subcontractorId}`)}>
                  Open subcontractor
                </Button>
              </div>
            </div>
          </Card>
        ))}
        {filtered.length === 0 && <p className="col-span-2 py-10 text-center text-[13px] text-muted">No changes match this filter.</p>}
      </div>
    </div>
  );
}
