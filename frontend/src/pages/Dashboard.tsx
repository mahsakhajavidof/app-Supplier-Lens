import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { api } from "../lib/api";
import { useToast } from "../lib/toast";
import { Badge } from "../components/Badge";
import { StatCard } from "../components/StatCard";
import { Card, CardHeader } from "../components/Card";
import { Button } from "../components/Button";
import { Icon } from "../components/Icon";
import { formatDate } from "../lib/format";

export function Dashboard() {
  const navigate = useNavigate();
  const { flash } = useToast();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const { data } = useQuery({ queryKey: ["dashboard-summary"], queryFn: api.dashboard.summary });

  async function refresh() {
    if (refreshing) return;
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
    setTimeout(() => {
      setRefreshing(false);
      flash("All sources checked. No new changes since last update.");
    }, 900);
  }

  return (
    <div className="mx-auto max-w-[1280px] px-10 py-10 pb-16">
      <div className="mb-7 flex items-end justify-between gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-[27px] font-semibold tracking-tight">Subcontractor Monitoring</h1>
          <p className="max-w-[620px] text-[14.5px] text-muted">
            Monitor relevant organisational, financial and operational changes across your subcontractors.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="text-[12.5px] text-muted">
            Last data update {data ? formatDate(new Date().toISOString()) : "—"}
          </span>
          <Button onClick={refresh} disabled={refreshing}>
            {refreshing ? "Checking sources…" : "Refresh data"}
          </Button>
        </div>
      </div>

      <div className="mb-8 grid grid-cols-4 gap-4">
        <StatCard
          label="Monitored subcontractors"
          value={data?.monitoredSubcontractors ?? "—"}
          note={data ? `Across ${data.categoriesCount} service categories` : ""}
          icon={<Icon name="companies" color="#4A9FD1" />}
        />
        <StatCard
          label="New changes"
          value={data?.newChangesLast30Days ?? "—"}
          note="Detected in the last 30 days"
          icon={<Icon name="changes" color="#4A9FD1" />}
        />
        <StatCard
          label="Review recommended"
          value={data?.reviewRecommended ?? "—"}
          note="Awaiting employee assessment"
          icon={<Icon name="eye" color="#4A9FD1" />}
        />
        <StatCard
          label="Open follow-up tasks"
          value={data?.openFollowUpTasks ?? "—"}
          note={data ? `${data.tasksDueWithin14Days} due within 14 days` : ""}
          icon={<Icon name="tasks" color="#4A9FD1" />}
        />
      </div>

      <Card className="mb-7 overflow-hidden">
        <CardHeader
          title="Recent changes"
          subtitle="Detected in the last 30 days across all monitored subcontractors"
          action={<Button onClick={() => navigate("/changes")}>View all changes</Button>}
        />
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr className="bg-surface-subtle">
                {["Subcontractor", "Type of change", "Detected", "Attention level", "Follow-up", "Assigned"].map((h) => (
                  <th key={h} className="whitespace-nowrap px-5 py-2.5 text-left text-[11.5px] font-semibold uppercase tracking-wide text-muted first:px-5">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(data?.recentEvents ?? []).map((e) => (
                <tr
                  key={e.id}
                  className="cursor-pointer border-t border-border hover:bg-surface-subtle"
                  onClick={() => navigate(`/subcontractors/${e.subcontractorId}`)}
                >
                  <td className="whitespace-nowrap px-5 py-3.5 font-medium">{e.subcontractor?.company}</td>
                  <td className="px-3.5 py-3.5">{e.type}</td>
                  <td className="whitespace-nowrap px-3.5 py-3.5 text-muted">{formatDate(e.detectedAt)}</td>
                  <td className="px-3.5 py-3.5">
                    <Badge label={e.attention} />
                  </td>
                  <td className="whitespace-nowrap px-3.5 py-3.5 text-muted">{e.followUp}</td>
                  <td className="whitespace-nowrap px-5 py-3.5 text-muted">{e.owner?.name ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <section>
        <div className="mb-3.5 flex flex-col gap-0.5">
          <h2 className="text-base font-semibold">Subcontractors requiring review</h2>
          <span className="text-[12.5px] text-muted">
            Recent or unresolved changes. Review and decision remain with the assigned employee.
          </span>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {(data?.reviewCandidates ?? []).map((c) => (
            <Card key={c.id} className="flex flex-col gap-3.5 p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[15px] font-semibold">{c.company}</span>
                  <span className="text-xs tabular-nums text-muted">Org. no. {c.orgNr}</span>
                </div>
                <Badge label={c.attention} />
              </div>
              <div className="flex flex-col gap-2 rounded-md bg-surface-subtle p-3.5 text-[12.5px]">
                <div className="flex justify-between gap-2.5">
                  <span className="text-muted">New events</span>
                  <span className="font-medium">{c.newEventsCount}</span>
                </div>
                <div className="flex justify-between gap-2.5">
                  <span className="text-muted">Latest change</span>
                  <span className="text-right font-medium">{c.latestChange}</span>
                </div>
                <div className="flex justify-between gap-2.5">
                  <span className="text-muted">Assigned</span>
                  <span className="font-medium">{c.owner?.name ?? "—"}</span>
                </div>
              </div>
              <Button variant="primary" className="w-full" onClick={() => navigate(`/subcontractors/${c.id}`)}>
                Review changes
              </Button>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
