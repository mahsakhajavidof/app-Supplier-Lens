import { useState } from "react";
import type { Subcontractor } from "../../types";
import { api } from "../../lib/api";
import { useToast } from "../../lib/toast";
import { Card } from "../../components/Card";
import { Button } from "../../components/Button";
import { inputClass } from "../../components/Modal";
import { formatDate } from "../../lib/format";

export function Notes({ sub, onChanged }: { sub: Subcontractor; onChanged: () => void }) {
  const { flash } = useToast();
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!draft.trim()) return;
    setSaving(true);
    try {
      await api.notes.create({ subcontractorId: sub.id, text: draft });
      setDraft("");
      onChanged();
      flash("Note saved to the internal record.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex max-w-[760px] flex-col gap-4">
      <Card className="p-5">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Write an internal note. Notes are visible to your organisation only."
          className={`${inputClass} min-h-[84px] w-full resize-y`}
        />
        <div className="mt-3 flex justify-end">
          <Button variant="primary" onClick={save} disabled={saving || !draft.trim()}>
            Save note
          </Button>
        </div>
      </Card>

      {(sub.notes ?? []).map((n) => (
        <Card key={n.id} className="p-5">
          <div className="mb-2.5 flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-chip text-[11px] font-semibold text-link">
              {n.author?.initials ?? "—"}
            </div>
            <span className="text-[13px] font-semibold">{n.author?.name ?? "Unknown"}</span>
            <span className="text-xs text-muted">{formatDate(n.createdAt)}</span>
          </div>
          <p className="text-[13.5px] leading-relaxed">{n.text}</p>
        </Card>
      ))}
      {(sub.notes ?? []).length === 0 && <p className="text-[13px] text-muted">No internal notes yet.</p>}
    </div>
  );
}
