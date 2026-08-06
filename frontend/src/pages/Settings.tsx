import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useToast } from "../lib/toast";
import { Card, CardHeader } from "../components/Card";
import { Button } from "../components/Button";

export function Settings() {
  const queryClient = useQueryClient();
  const { flash } = useToast();
  const { data: sources } = useQuery({ queryKey: ["sources"], queryFn: api.settings.sources });
  const { data: team } = useQuery({ queryKey: ["team"], queryFn: api.settings.team });
  const { data: registries } = useQuery({ queryKey: ["registries"], queryFn: api.settings.registries });

  const unconfigured = (registries ?? []).filter((r) => !r.configured);

  async function toggleSource(id: string) {
    await api.settings.toggleSource(id);
    queryClient.invalidateQueries({ queryKey: ["sources"] });
  }

  return (
    <div className="mx-auto max-w-[900px] px-10 py-10 pb-16">
      <div className="mb-6 flex flex-col gap-2">
        <h1 className="text-[27px] font-semibold tracking-tight">Settings</h1>
        <p className="text-[14.5px] text-muted">Monitoring sources, notifications and team access for Nordbygg Entreprenør AS.</p>
      </div>

      {unconfigured.length > 0 && (
        <div className="mb-5 flex items-center gap-3.5 rounded-lg border border-danger-border bg-danger-bg px-4 py-4">
          <div className="flex flex-1 flex-col gap-0.5">
            <span className="text-[13px] font-semibold text-danger-fg">
              {unconfigured.length} registry integration{unconfigured.length > 1 ? "s" : ""} not yet configured
            </span>
            <span className="text-[12.5px] text-danger-fg">
              {unconfigured.map((r) => r.registryName).join(", ")} — missing API key. See backend/.env.example.
            </span>
          </div>
        </div>
      )}

      <Card className="mb-5 overflow-hidden">
        <CardHeader title="Company registry integrations" subtitle="Live status of each country's registry provider" />
        {(registries ?? []).map((r) => (
          <div key={r.country} className="flex items-center gap-4 border-b border-border px-5 py-4 last:border-b-0">
            <div className="flex flex-1 flex-col gap-0.5">
              <span className="text-[13.5px] font-medium">
                {r.country} · {r.registryName}
              </span>
            </div>
            <span
              className={`rounded-full px-2.5 py-1 text-[11.5px] font-medium ${
                r.configured ? "bg-neutral-bg text-neutral-fg" : "bg-warn-bg text-warn-fg"
              }`}
            >
              {r.configured ? "Connected" : "Needs API key"}
            </span>
          </div>
        ))}
      </Card>

      <Card className="mb-5 overflow-hidden">
        <CardHeader title="Monitored data sources" />
        {(sources ?? []).map((s) => (
          <div key={s.id} className="flex items-center gap-4 border-b border-border px-5 py-3.5 last:border-b-0">
            <div className="flex flex-1 flex-col gap-0.5">
              <span className="text-[13.5px] font-medium">{s.name}</span>
              <span className="text-xs text-muted">{s.desc}</span>
            </div>
            <span className="text-xs text-muted">{s.frequency}</span>
            <button
              onClick={() => toggleSource(s.id)}
              className={`flex h-6 w-[42px] items-center rounded-full border border-border p-0.5 ${
                s.enabled ? "justify-end bg-accent" : "justify-start bg-neutral-bg"
              }`}
            >
              <span className="block h-[18px] w-[18px] rounded-full bg-white" />
            </button>
          </div>
        ))}
      </Card>

      <Card className="overflow-hidden">
        <CardHeader title="Team" />
        {(team ?? []).map((m) => (
          <div key={m.id} className="flex items-center gap-3.5 border-b border-border px-5 py-3.5 last:border-b-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-chip text-[11.5px] font-semibold text-link">
              {m.initials}
            </div>
            <div className="flex flex-1 flex-col gap-0.5">
              <span className="text-[13.5px] font-medium">{m.name}</span>
              <span className="text-xs text-muted">{m.email}</span>
            </div>
            <span className="text-[12.5px] text-muted">{m.role}</span>
            <span className="text-xs text-muted">{m.assignedCount ?? 0} assigned</span>
          </div>
        ))}
      </Card>
    </div>
  );
}
