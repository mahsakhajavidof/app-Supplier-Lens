import { useState } from "react";
import type { Subcontractor } from "../../types";
import { api } from "../../lib/api";
import { useToast } from "../../lib/toast";
import { Card, CardHeader } from "../../components/Card";
import { Button } from "../../components/Button";
import { Badge } from "../../components/Badge";
import { Modal, Field, inputClass } from "../../components/Modal";
import { formatDate, daysUntil } from "../../lib/format";

export function Documents({ sub, onChanged }: { sub: Subcontractor; onChanged: () => void }) {
  const { flash } = useToast();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Card className="overflow-hidden">
        <CardHeader title="Documents" action={<Button onClick={() => setOpen(true)}>Upload document</Button>} />
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="bg-surface-subtle">
              {["Document", "Type", "Uploaded", "Valid until", "Status"].map((h) => (
                <th key={h} className="whitespace-nowrap px-5 py-2.5 text-left text-[11.5px] font-semibold uppercase tracking-wide text-muted first:px-5">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(sub.documents ?? []).map((d) => {
              const days = daysUntil(d.validUntil);
              const label = days !== null && days <= 30 ? `Expires in ${days} days` : d.note ?? "Valid";
              return (
                <tr key={d.id} className="border-t border-border">
                  <td className="px-5 py-3 font-medium">{d.name}</td>
                  <td className="px-3.5 py-3 text-muted">{d.type}</td>
                  <td className="px-3.5 py-3 text-muted">{formatDate(d.uploadedAt)}</td>
                  <td className="px-3.5 py-3">{formatDate(d.validUntil)}</td>
                  <td className="px-5 py-3">
                    <Badge label={label} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {(sub.documents ?? []).length === 0 && <p className="px-5 py-8 text-center text-[13px] text-muted">No documents on file yet.</p>}
      </Card>

      {open && (
        <UploadModal
          subcontractorId={sub.id}
          onClose={() => setOpen(false)}
          onCreated={() => {
            setOpen(false);
            onChanged();
            flash("Document uploaded.");
          }}
        />
      )}
    </>
  );
}

function UploadModal({
  subcontractorId,
  onClose,
  onCreated,
}: {
  subcontractorId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [type, setType] = useState("Insurance");
  const [validUntil, setValidUntil] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await api.documents.create({ subcontractorId, name, type, validUntil: validUntil || undefined });
      onCreated();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title="Upload document"
      subtitle="This records the document's details. File storage isn't wired up in this build yet."
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={submit} disabled={saving || !name.trim()}>
            Save
          </Button>
        </>
      }
    >
      <Field label="Document name">
        <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="Liability insurance certificate" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Type">
          <select className={inputClass} value={type} onChange={(e) => setType(e.target.value)}>
            {["Insurance", "Public certificate", "Declaration", "Contract", "Financial"].map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </Field>
        <Field label="Valid until">
          <input type="date" className={inputClass} value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}
