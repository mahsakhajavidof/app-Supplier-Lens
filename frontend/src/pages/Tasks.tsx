import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useToast } from "../lib/toast";
import { Badge } from "../components/Badge";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { TaskModal } from "../components/TaskModal";
import { formatDate } from "../lib/format";
import type { TaskRecord, TaskStatus } from "../types";

const STATUSES: TaskStatus[] = ["Not started", "In progress", "Waiting for information", "Completed"];
const STATUS_TO_ENUM: Record<TaskStatus, string> = {
  "Not started": "NOT_STARTED",
  "In progress": "IN_PROGRESS",
  "Waiting for information": "WAITING_FOR_INFORMATION",
  Completed: "COMPLETED",
};

export function Tasks() {
  const { flash } = useToast();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState("All tasks");
  const [showNewTask, setShowNewTask] = useState(false);
  const [pickingSubcontractor, setPickingSubcontractor] = useState(false);

  const { data: tasks } = useQuery({ queryKey: ["tasks"], queryFn: () => api.tasks.list() });
  const { data: subcontractors } = useQuery({
    queryKey: ["subcontractors", "", "", ""],
    queryFn: () => api.subcontractors.list(),
    enabled: pickingSubcontractor,
  });
  const [newTaskSubId, setNewTaskSubId] = useState<string | null>(null);

  const filters = ["All tasks", ...STATUSES];
  const filtered = (tasks ?? []).filter((t) => filter === "All tasks" || t.status === filter);

  async function updateStatus(task: TaskRecord, status: TaskStatus) {
    await api.tasks.update(task.id, { status: STATUS_TO_ENUM[status] });
    queryClient.invalidateQueries({ queryKey: ["tasks"] });
  }

  return (
    <div className="mx-auto max-w-[1280px] px-10 py-10 pb-16">
      <div className="mb-6 flex items-end justify-between gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-[27px] font-semibold tracking-tight">Follow-up tasks</h1>
          <p className="text-[14.5px] text-muted">Actions created from monitoring events, with owner, due date and status.</p>
        </div>
        <Button variant="primary" onClick={() => setPickingSubcontractor(true)}>
          New task
        </Button>
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        {filters.map((f) => {
          const count = (tasks ?? []).filter((t) => f === "All tasks" || t.status === f).length;
          const isActive = f === filter;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full border px-3.5 py-2 text-[12.5px] ${
                isActive ? "border-accent/40 bg-surface-tint font-semibold text-link" : "border-border bg-white font-medium text-muted"
              }`}
            >
              {f} · {count}
            </button>
          );
        })}
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr className="bg-surface-subtle">
                {["Task", "Subcontractor", "Related event", "Assigned", "Due", "Priority", "Status", "Comments"].map((h) => (
                  <th key={h} className="whitespace-nowrap px-5 py-2.5 text-left text-[11.5px] font-semibold uppercase tracking-wide text-muted first:px-5">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t.id} className="border-t border-border">
                  <td className="px-5 py-3 font-medium">{t.title}</td>
                  <td className="whitespace-nowrap px-3.5 py-3">{t.subcontractor?.company}</td>
                  <td className="px-3.5 py-3 text-muted">{t.event?.type ?? "—"}</td>
                  <td className="whitespace-nowrap px-3.5 py-3 text-muted">{t.owner?.name ?? "—"}</td>
                  <td className="whitespace-nowrap px-3.5 py-3">{formatDate(t.due)}</td>
                  <td className="px-3.5 py-3 text-muted">{t.priority}</td>
                  <td className="px-3.5 py-3">
                    <select
                      value={t.status}
                      onChange={(e) => updateStatus(t, e.target.value as TaskStatus)}
                      className="rounded-full border border-border bg-white px-2 py-1 text-[11.5px] font-medium"
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-5 py-3 text-muted">{t.comment ?? "No comments"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
            <span className="text-[15px] font-semibold">No tasks with this status</span>
            <span className="max-w-[320px] text-[13px] text-muted">Tasks created from monitoring events will appear here.</span>
          </div>
        )}
      </Card>

      {pickingSubcontractor && !newTaskSubId && (
        <PickSubcontractorModal
          options={subcontractors ?? []}
          onPick={(id) => setNewTaskSubId(id)}
          onClose={() => setPickingSubcontractor(false)}
        />
      )}
      {newTaskSubId && (
        <TaskModal
          subcontractorId={newTaskSubId}
          onClose={() => {
            setNewTaskSubId(null);
            setPickingSubcontractor(false);
          }}
          onCreated={() => {
            setNewTaskSubId(null);
            setPickingSubcontractor(false);
            queryClient.invalidateQueries({ queryKey: ["tasks"] });
            flash("Follow-up task created and assigned.");
          }}
        />
      )}
    </div>
  );
}

function PickSubcontractorModal({
  options,
  onPick,
  onClose,
}: {
  options: { id: string; company: string }[];
  onPick: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-ink/25 p-6" onClick={onClose}>
      <div className="w-[420px] max-w-full rounded-2xl border border-border bg-white p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-1 text-lg font-semibold">Which subcontractor?</h2>
        <p className="mb-4 text-[13px] text-muted">Choose which subcontractor this follow-up task relates to.</p>
        <div className="flex max-h-[320px] flex-col gap-1 overflow-y-auto">
          {options.map((o) => (
            <button
              key={o.id}
              onClick={() => onPick(o.id)}
              className="rounded-sm px-3 py-2.5 text-left text-[13px] hover:bg-surface-subtle"
            >
              {o.company}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
