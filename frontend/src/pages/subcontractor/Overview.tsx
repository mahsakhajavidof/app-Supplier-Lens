import type { Subcontractor } from "../../types";
import { Badge } from "../../components/Badge";
import { Card, CardHeader } from "../../components/Card";
import { Button } from "../../components/Button";
import { formatDate, daysUntil, formatDateTime } from "../../lib/format";

export function Overview({ sub, onGoTimeline }: { sub: Subcontractor; onGoTimeline: () => void }) {
  const latestEvents = sub.events.slice(0, 4);
  const openTasks = (sub.tasks ?? []).filter((t) => t.status !== "Completed").slice(0, 3);
  const expirations = (sub.documents ?? [])
    .filter((d) => d.validUntil)
    .sort((a, b) => new Date(a.validUntil!).getTime() - new Date(b.validUntil!).getTime())
    .slice(0, 3);

  return (
    <div className="grid grid-cols-[1.6fr_1fr] gap-5">
      <div className="flex flex-col gap-5">
        {sub.aiSummary && (
          <Card tint className="p-5">
            <div className="mb-2.5 flex items-center gap-2">
              <div className="flex h-[22px] w-[22px] items-center justify-center rounded-md bg-surface-chip">
                <div className="h-[7px] w-[7px] rotate-45 bg-accent" />
              </div>
              <span className="text-[13px] font-semibold text-link">Summary of detected changes</span>
            </div>
            <p className="mb-3 text-sm leading-relaxed">{sub.aiSummary}</p>
            <span className="text-[11.5px] text-muted">AI-generated summary based on the events and sources shown below.</span>
          </Card>
        )}

        <Card className="overflow-hidden">
          <CardHeader
            title="Latest changes"
            action={
              <Button variant="ghost" onClick={onGoTimeline}>
                Open change timeline
              </Button>
            }
          />
          {latestEvents.length === 0 && <p className="px-5 py-5 text-[13px] text-muted">No changes detected yet.</p>}
          {latestEvents.map((e) => (
            <div key={e.id} className="flex items-center gap-3.5 border-b border-border px-5 py-3.5 last:border-b-0">
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-[13.5px] font-medium">{e.type}</span>
                <span className="text-xs text-muted">
                  Detected {formatDate(e.detectedAt)} · {e.source}
                </span>
              </div>
              <Badge label={e.attention} />
            </div>
          ))}
        </Card>

        <Card className="overflow-hidden">
          <CardHeader title="Open follow-up activities" />
          {openTasks.length === 0 && <p className="px-5 py-5 text-[13px] text-muted">No open follow-up activities.</p>}
          {openTasks.map((t) => (
            <div key={t.id} className="flex items-center gap-3.5 border-b border-border px-5 py-3.5 last:border-b-0">
              <div className="flex flex-1 flex-col gap-0.5">
                <span className="text-[13.5px] font-medium">{t.title}</span>
                <span className="text-xs text-muted">{t.event?.type ?? "General"}</span>
              </div>
              <Badge label={t.status} />
            </div>
          ))}
        </Card>
      </div>

      <div className="flex flex-col gap-5">
        <Card className="p-5">
          <h2 className="mb-3.5 text-[15px] font-semibold">Upcoming document expirations</h2>
          <div className="flex flex-col gap-3">
            {expirations.length === 0 && <p className="text-[13px] text-muted">No documents with an expiry date.</p>}
            {expirations.map((d) => {
              const days = daysUntil(d.validUntil);
              const soon = days !== null && days <= 30;
              return (
                <div key={d.id} className="flex flex-col gap-1.5 rounded-md bg-surface-subtle p-3">
                  <span className="text-[13px] font-medium">{d.name}</span>
                  <div className="flex items-center justify-between gap-2.5">
                    <span className="text-xs text-muted">Valid until {formatDate(d.validUntil)}</span>
                    <Badge label={soon ? `Expires in ${days} days` : d.note ?? "Valid"} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="mb-3.5 text-[15px] font-semibold">Key company information</h2>
          <div className="flex flex-col">
            {[
              ["Legal form", sub.legalForm],
              ["Registered", sub.registeredOn],
              ["Industry code", sub.industryCode],
              ["Employees", sub.employees],
              ["Municipality", sub.municipality],
              ["VAT registered", sub.vatRegistered ? "Yes" : "No"],
            ].map(([label, value]) => (
              <div key={label as string} className="flex justify-between gap-4 border-b border-border py-2.5 text-[12.5px] last:border-b-0">
                <span className="text-muted">{label}</span>
                <span className="text-right font-medium">{value ?? "—"}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="mb-3.5 text-[15px] font-semibold">Monitoring &amp; procurement</h2>
          <div className="flex flex-col">
            {[
              ["Category", sub.category],
              ["Internal responsible", sub.owner?.name ?? "Unassigned"],
              ["Monitoring status", sub.active ? "Active" : "Inactive"],
              ["Last checked", formatDateTime(sub.lastCheckedAt)],
              ["Next scheduled check", sub.nextCheckAt ? formatDateTime(sub.nextCheckAt) : "—"],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4 border-b border-border py-2.5 text-[12.5px] last:border-b-0">
                <span className="text-muted">{label}</span>
                <span className="text-right font-medium">{value}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
