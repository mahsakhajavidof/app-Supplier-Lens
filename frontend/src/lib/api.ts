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
  RiskAssessment,
  Source,
  Subcontractor,
  TaskRecord,
  TeamMember,
} from "../types";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers as Record<string, string> | undefined) },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error ?? `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

// Manager-only routes require identifying the acting team member — see
// frontend/src/lib/currentUser.ts and backend/src/lib/permissions.ts.
function actingHeaders(actingUserId: string): Record<string, string> {
  return { "x-team-member-id": actingUserId };
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
    updateOwner: (id: string, ownerId: string, actingUserId: string) =>
      request<Subcontractor>(`/subcontractors/${id}`, {
        method: "PATCH",
        headers: actingHeaders(actingUserId),
        body: JSON.stringify({ ownerId }),
      }),
  },

  riskAssessment: {
    get: (subcontractorId: string) => request<RiskAssessment>(`/subcontractors/${subcontractorId}/risk-assessment`),
    brief: (subcontractorId: string) => request<{ brief: string }>(`/subcontractors/${subcontractorId}/risk-assessment/brief`),
    decide: (
      subcontractorId: string,
      indicatorKey: string,
      body: { status: "NOT_REVIEWED" | "ACCEPTED" | "NOT_RELEVANT" | "RESOLVED"; note?: string; decidedById?: string }
    ) =>
      request(`/subcontractors/${subcontractorId}/risk-assessment/indicators/${encodeURIComponent(indicatorKey)}/decision`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    convertToTask: (
      subcontractorId: string,
      indicatorKey: string,
      body: { ownerId?: string; due?: string; priority?: "LOW" | "NORMAL" | "HIGH" }
    ) =>
      request<TaskRecord>(`/subcontractors/${subcontractorId}/risk-assessment/indicators/${encodeURIComponent(indicatorKey)}/convert-to-task`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
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
    addTeamMember: (body: { name: string; role: string; email?: string }, actingUserId: string) =>
      request<TeamMember>("/settings/team", {
        method: "POST",
        headers: actingHeaders(actingUserId),
        body: JSON.stringify(body),
      }),
    updateTeamMember: (
      id: string,
      body: Partial<{ name: string; role: string; email: string | null; active: boolean; reassignToId: string }>,
      actingUserId: string
    ) =>
      request<TeamMember>(`/settings/team/${id}`, {
        method: "PATCH",
        headers: actingHeaders(actingUserId),
        body: JSON.stringify(body),
      }),
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
