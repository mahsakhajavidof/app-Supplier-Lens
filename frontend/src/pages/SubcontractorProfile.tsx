import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useToast } from "../lib/toast";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { Icon } from "../components/Icon";
import { TaskModal } from "../components/TaskModal";
import { NoteModal } from "../components/NoteModal";
import { formatDateTime, formatOrgNr } from "../lib/format";
import { Overview } from "./subcontractor/Overview";
import { Timeline } from "./subcontractor/Timeline";
import { CompanyInfo } from "./subcontractor/CompanyInfo";
import { Financials } from "./subcontractor/Financials";
import { Documents } from "./subcontractor/Documents";
import { Notes } from "./subcontractor/Notes";
import { FollowUp } from "./subcontractor/FollowUp";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "timeline", label: "Change timeline" },
  { key: "company", label: "Company information" },
  { key: "finance", label: "Financial information" },
  { key: "docs", label: "Documents" },
  { key: "notes", label: "Internal notes" },
  { key: "follow", label: "Follow-up" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

export function SubcontractorProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { flash } = useToast();
  const [tab, setTab] = useState<TabKey>("overview");
  const [modal, setModal] = useState<"task" | "note" | null>(null);
  const [syncing, setSyncing] = useState(false);

  const { data: sub } = useQuery({
    queryKey: ["subcontractor", id],
    queryFn: () => api.subcontractors.get(id!),
    enabled: !!id,
  });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["subcontractor", id] });
  }

  async function sync() {
    if (!id || syncing) return;
    setSyncing(true);
    try {
      const result = await api.subcontractors.sync(id);
      flash(
        result.changesDetected > 0
          ? `${result.registry}: ${result.changesDetected} change(s) detected.`
          : `${result.registry}: no changes since last check.`
      );
      invalidate();
    } catch (err) {
      flash(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  }

  if (!sub) {
    return <div className="p-10 text-sm text-muted">Loading…</div>;
  }

  return (
    <div>
      <div className="border-b border-border bg-surface-subtle">
        <div className="mx-auto max-w-[1280px] px-10 pt-6">
          <button
            onClick={() => navigate("/subcontractors")}
            className="mb-4 flex items-center gap-1.5 bg-transparent text-[12.5px] text-muted"
          >
            <Icon name="back" size={14} color="#6B7C89" />
            All subcontractors
          </button>
          <div className="flex flex-wrap items-start justify-between gap-8">
            <div className="flex flex-col gap-3.5">
              <div className="flex items-center gap-3">
                <h1 className="text-[26px] font-semibold tracking-tight">{sub.company}</h1>
                <Badge label={sub.companyStatus} />
              </div>
              <div className="flex flex-wrap gap-x-7 gap-y-1 text-[12.5px]">
                <InfoItem label="Organisation number" value={formatOrgNr(sub.orgNr)} />
                <InfoItem label="Main contact" value={sub.contactEmail ?? sub.contactPhone ?? "—"} />
                <InfoItem label="Internal responsible" value={sub.owner?.name ?? "—"} />
                <InfoItem label="Last data update" value={formatDateTime(sub.lastCheckedAt)} />
              </div>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <Button onClick={() => setModal("note")}>Add note</Button>
              <Button variant="primary" onClick={() => setModal("task")}>
                Create follow-up task
              </Button>
              <Button onClick={sync} disabled={syncing}>
                {syncing ? "Checking registry…" : `Sync with ${sub.country} registry`}
              </Button>
            </div>
          </div>
          <div className="mt-5 flex gap-1 overflow-x-auto">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`whitespace-nowrap border-b-2 px-3.5 py-2.5 text-[13px] ${
                  tab === t.key ? "border-accent font-semibold text-link" : "border-transparent font-medium text-muted"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1280px] px-10 py-7 pb-16">
        {tab === "overview" && <Overview sub={sub} onGoTimeline={() => setTab("timeline")} />}
        {tab === "timeline" && <Timeline sub={sub} onReviewed={invalidate} />}
        {tab === "company" && <CompanyInfo sub={sub} />}
        {tab === "finance" && <Financials sub={sub} />}
        {tab === "docs" && <Documents sub={sub} onChanged={invalidate} />}
        {tab === "notes" && <Notes sub={sub} onChanged={invalidate} />}
        {tab === "follow" && <FollowUp sub={sub} onNewTask={() => setModal("task")} />}
      </div>

      {modal === "task" && (
        <TaskModal
          subcontractorId={sub.id}
          onClose={() => setModal(null)}
          onCreated={() => {
            setModal(null);
            invalidate();
            flash("Follow-up task created and assigned.");
          }}
        />
      )}
      {modal === "note" && (
        <NoteModal
          subcontractorId={sub.id}
          onClose={() => setModal(null)}
          onCreated={() => {
            setModal(null);
            invalidate();
            flash("Note saved to the internal record.");
          }}
        />
      )}
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 py-1">
      <span className="text-muted">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
