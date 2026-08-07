import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { Modal, Field, inputClass } from "./Modal";
import { Button } from "./Button";

export function TaskModal({
  subcontractorId,
  eventId,
  relatedEventLabel,
  onClose,
  onCreated,
}: {
  subcontractorId: string;
  eventId?: string;
  relatedEventLabel?: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const { data: team } = useQuery({ queryKey: ["team"], queryFn: api.settings.team });
  const [title, setTitle] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [due, setDue] = useState("");
  const [priority, setPriority] = useState<"LOW" | "NORMAL" | "HIGH">("NORMAL");
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!title.trim()) return;
    setSaving(true);
    try {
      await api.tasks.create({ title, subcontractorId, eventId, ownerId: ownerId || undefined, due: due || undefined, priority, comment: comment || undefined });
      onCreated();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title="Create follow-up task"
      subtitle="The task is linked to the selected subcontractor and monitoring event."
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={submit} disabled={saving || !title.trim()}>
            Create task
          </Button>
        </>
      }
    >
      <Field label="Title">
        <input
          className={inputClass}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Request updated insurance certificate"
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Assigned employee">
          <select className={inputClass} value={ownerId} onChange={(e) => setOwnerId(e.target.value)}>
            <option value="">Unassigned</option>
            {team?.filter((m) => m.active).map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Due date">
          <input type="date" className={inputClass} value={due} onChange={(e) => setDue(e.target.value)} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Related event">
          <input className={`${inputClass} bg-neutral-bg text-muted`} value={relatedEventLabel ?? "None"} disabled />
        </Field>
        <Field label="Priority">
          <select className={inputClass} value={priority} onChange={(e) => setPriority(e.target.value as typeof priority)}>
            <option value="LOW">Low</option>
            <option value="NORMAL">Normal</option>
            <option value="HIGH">High</option>
          </select>
        </Field>
      </div>
      <Field label="Comment">
        <textarea
          className={`${inputClass} min-h-[72px] resize-y`}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Optional context for the assigned employee"
        />
      </Field>
    </Modal>
  );
}
