import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { Button } from "./Button";

export function NegotiationBriefModal({ subcontractorId, company, onClose }: { subcontractorId: string; company: string; onClose: () => void }) {
  const [brief, setBrief] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.riskAssessment
      .brief(subcontractorId)
      .then((res) => setBrief(res.brief))
      .finally(() => setLoading(false));
  }, [subcontractorId]);

  function download() {
    if (!brief) return;
    const blob = new Blob([brief], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${company.replace(/[^a-z0-9]+/gi, "-")}-negotiation-brief.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-ink/25 p-6" onClick={onClose}>
      <div
        className="animate-rise flex max-h-[85vh] w-[720px] max-w-full flex-col rounded-2xl border border-border bg-white p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-1 text-lg font-semibold">Negotiation &amp; due-diligence brief</h2>
        <p className="mb-5 text-[13px] text-muted">Generated deterministically from the same indicators and guidance shown in this tab.</p>
        <div className="flex-1 overflow-y-auto rounded-md bg-surface-subtle p-4">
          {loading && <p className="text-[13px] text-muted">Generating…</p>}
          {!loading && brief && <pre className="whitespace-pre-wrap text-[12.5px] leading-relaxed">{brief}</pre>}
        </div>
        <div className="mt-5 flex justify-end gap-2.5">
          <Button onClick={onClose}>Close</Button>
          <Button variant="primary" onClick={download} disabled={!brief}>
            Download as .md
          </Button>
        </div>
      </div>
    </div>
  );
}
