// Shapes returned by the backend API. Kept intentionally loose (most
// fields optional) so the frontend doesn't break if a field is missing —
// the backend's Drizzle schema (backend/src/db/schema.ts) is the real
// source of truth.

export interface TeamMember {
  id: string;
  name: string;
  email: string | null;
  role: string;
  initials: string;
  active: boolean;
  assignedCount?: number;
}

export type Attention = "New information" | "Change detected" | "Review recommended" | "Time-sensitive";
export type FollowUp = "Reviewed" | "Unresolved" | "Task created" | "No action needed";
export type TaskStatus = "Not started" | "In progress" | "Waiting for information" | "Completed";
export type TaskPriority = "Low" | "Normal" | "High";

export interface EventRecord {
  id: string;
  subcontractorId: string;
  type: string;
  description: string;
  attention: Attention;
  followUp: FollowUp;
  reviewed: boolean;
  source: string;
  previousValue?: string | null;
  currentValue?: string | null;
  aiExplanation?: string | null;
  detectedAt: string;
  owner?: TeamMember | null;
  subcontractor?: Subcontractor;
}

export interface TaskRecord {
  id: string;
  title: string;
  subcontractorId: string;
  eventId?: string | null;
  due?: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  comment?: string | null;
  owner?: TeamMember | null;
  subcontractor?: Subcontractor;
  event?: EventRecord | null;
}

export interface Note {
  id: string;
  subcontractorId: string;
  text: string;
  createdAt: string;
  author?: TeamMember | null;
}

export interface DocumentRecord {
  id: string;
  subcontractorId: string;
  name: string;
  type: string;
  uploadedAt: string;
  validUntil?: string | null;
  note?: string | null;
}

export interface FinancialYear {
  id: string;
  year: number;
  currency?: string | null;
  operatingRevenue?: number | null;
  operatingResult?: number | null;
  resultBeforeTax?: number | null;
  equityRatio?: number | null;
  liquidityRatio?: number | null;
  employees?: number | null;
}

export interface Person {
  id: string;
  name: string;
  role: string;
  since?: string | null;
}

export interface Ownership {
  id: string;
  name: string;
  sharePercent: number;
}

export interface Subcontractor {
  id: string;
  company: string;
  orgNr: string;
  country: string;
  category: string;
  legalForm?: string | null;
  companyStatus: string;
  registeredOn?: string | null;
  industryCode?: string | null;
  employees?: number | null;
  municipality?: string | null;
  vatRegistered: boolean;
  auditor?: string | null;
  shareCapital?: string | null;
  address?: string | null;
  postalAddress?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  aiSummary?: string | null;
  lastCheckedAt: string;
  owner?: TeamMember | null;
  events: EventRecord[];
  tasks?: TaskRecord[];
  notes?: Note[];
  documents?: DocumentRecord[];
  financials?: FinancialYear[];
  people?: Person[];
  owners?: Ownership[];
  // Server-computed convenience fields:
  latestChange: string;
  attention: Attention;
  status: FollowUp;
  newEventsCount: number;
}

export interface DashboardSummary {
  monitoredSubcontractors: number;
  categoriesCount: number;
  newChangesLast30Days: number;
  reviewRecommended: number;
  openFollowUpTasks: number;
  tasksDueWithin14Days: number;
  recentEvents: EventRecord[];
  reviewCandidates: Subcontractor[];
}

export interface Source {
  id: string;
  name: string;
  desc: string;
  frequency: string;
  enabled: boolean;
}

export interface RegistryProviderStatus {
  country: string;
  registryName: string;
  configured: boolean;
}

// What GET /api/registry/search/:country?q= returns — lightweight as-you-type
// suggestions, distinct from the full RegistryLookupResult below.
export interface RegistrySearchResult {
  orgNr: string;
  name: string;
  legalForm?: string;
  address?: string;
}

// What GET /api/registry/lookup/:country/:orgNr returns — a live pull from
// that country's registry, normalized to one shape regardless of source.
export interface RegistryLookupResult {
  orgNr: string;
  country: string;
  name: string;
  legalForm?: string;
  companyStatus?: string;
  registeredOn?: string;
  industryCode?: string;
  employees?: number;
  municipality?: string;
  vatRegistered?: boolean;
  address?: string;
  postalAddress?: string;
}

export interface ReportType {
  id: string;
  title: string;
  desc: string;
}
