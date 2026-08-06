import type { Subcontractor } from "../../types";
import { Card, CardHeader } from "../../components/Card";
import { Button } from "../../components/Button";
import { Badge } from "../../components/Badge";
import { formatDate } from "../../lib/format";

export function FollowUp({ sub, onNewTask }: { sub: Subcontractor; onNewTask: () => void }) {
  const tasks = sub.tasks ?? [];
  return (
    <Card className="max-w-[900px] overflow-hidden">
      <CardHeader
        title="Follow-up for this subcontractor"
        action={
          <Button variant="primary" onClick={onNewTask}>
            New task
          </Button>
        }
      />
      {tasks.length === 0 && <p className="px-5 py-8 text-[13px] text-muted">No follow-up tasks for this subcontractor yet.</p>}
      {tasks.map((t) => (
        <div key={t.id} className="flex items-center gap-4 border-b border-border px-5 py-4 last:border-b-0">
          <div className="flex flex-1 flex-col gap-1">
            <span className="text-[13.5px] font-medium">{t.title}</span>
            <span className="text-xs text-muted">{t.event?.type ?? "General follow-up"}</span>
          </div>
          <span className="text-xs text-muted">Due {formatDate(t.due)}</span>
          <Badge label={t.status} />
        </div>
      ))}
    </Card>
  );
}
