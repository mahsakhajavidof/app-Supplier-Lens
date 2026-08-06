import { useState } from "react";
import { api } from "../lib/api";
import { Modal, Field, inputClass } from "./Modal";
import { Button } from "./Button";

export function NoteModal({
  subcontractorId,
  onClose,
  onCreated,
}: {
  subcontractorId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!text.trim()) return;
    setSaving(true);
    try {
      await api.notes.create({ subcontractorId, text });
      onCreated();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title="Add internal note"
      subtitle="Notes are stored with the subcontractor record and visible to your organisation."
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={submit} disabled={saving || !text.trim()}>
            Save note
          </Button>
        </>
      }
    >
      <Field label="Note">
        <textarea
          className={`${inputClass} min-h-[100px] resize-y`}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Write an internal note. Notes are visible to your organisation only."
          autoFocus
        />
      </Field>
    </Modal>
  );
}
