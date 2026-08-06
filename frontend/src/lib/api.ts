// Thin fetch wrapper. Every function here maps 1:1 to a backend route —
// see backend/src/routes/*.ts. Keeping this file flat (no client class,
// no codegen) makes it easy to find and change any single call.
import type {
  DashboardSummary,
  DocumentRecord,
  EventRecord,
  Note,
  RegistryLookupResult,
  RegistryProviderStatus,
  RegistrySearchResult,
  ReportType,
  Source,
  Subcontractor,
  TaskRecord,
  TeamMember,
} from "../types";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error ?? `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  dashboard: {
    summary: () => request<DashboardSummary>("/dashboard/summary"),
  },

  subcontractors: {
    list: (params: { search?: string; category?: string; owner?: string } = {}) => {
      const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => !!v) as [string, string][]);
      return request<Subcontractor[]>(`/subcontractors?${qs.toString()}`);
    },
    get: (id: string) => request<Subcontractor>(`/subcontractors/${id}`),
    filters: () => request<{ categories: string[]; owners: string[] }>("/subcontractors/meta/filters"),
    create: (body: {
      company: string;
      orgNr: string;
      country: string;
      category: string;
      ownerId?: string;
      registryData?: RegistryLookupResult;
    }) => request<Subcontractor>("/subcontractors", { method: "POST", body: JSON.stringify(body) }),
    sync: (id: string) =>
      request<{ checked: boolean; registry: string; changesDetected: number; events: EventRecord[] }>(
        `/subcontractors/${id}/sync`,
        { method: "POST" }
      ),
  },

  events: {
    list: (params: { attention?: string; followUp?: string } = {}) => {
      const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => !!v) as [string, string][]);
      return request<EventRecord[]>(`/events?${qs.toString()}`);
    },
    review: (id: string) => request<EventRecord>(`/events/${id}/review`, { method: "PATCH" }),
  },

  tasks: {
    list: (status?: string) => request<TaskRecord[]>(`/tasks${status ? `?status=${encodeURIComponent(status)}` : ""}`),
    create: (body: {
      title: string;
      subcontractorId: string;
      eventId?: string;
      ownerId?: string;
      due?: string;
      priority?: "LOW" | "NORMAL" | "HIGH";
      comment?: string;
    }) => request<TaskRecord>("/tasks", { method: "POST", body: JSON.stringify(body) }),
    update: (id: string, body: Partial<{ status: string; priority: string; due: string }>) =>
      request<TaskRecord>(`/tasks/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  },

  notes: {
    create: (body: { subcontractorId: string; authorId?: string; text: string }) =>
      request<Note>("/notes", { method: "POST", body: JSON.stringify(body) }),
  },

  documents: {
    create: (body: { subcontractorId: string; name: string; type: string; validUntil?: string; note?: string }) =>
      request<DocumentRecord>("/documents", { method: "POST", body: JSON.stringify(body) }),
  },

  settings: {
    sources: () => request<Source[]>("/settings/sources"),
    toggleSource: (id: string) => request<Source>(`/settings/sources/${id}`, { method: "PATCH" }),
    team: () => request<TeamMember[]>("/settings/team"),
    registries: () => request<RegistryProviderStatus[]>("/settings/registries"),
  },

  registry: {
    lookup: (country: string, orgNr: string) =>
      request<RegistryLookupResult>(`/registry/lookup/${encodeURIComponent(country)}/${encodeURIComponent(orgNr)}`),
    search: (country: string, q: string) =>
      request<RegistrySearchResult[]>(`/registry/search/${encodeURIComponent(country)}?q=${encodeURIComponent(q)}`),
  },

  reports: {
    types: () => request<ReportType[]>("/reports/types"),
    run: (type: string, params: { from?: string; to?: string } = {}) => {
      const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => !!v) as [string, string][]);
      return request<{ type: string; rows: unknown[] }>(`/reports/${type}?${qs.toString()}`);
    },
  },
};
