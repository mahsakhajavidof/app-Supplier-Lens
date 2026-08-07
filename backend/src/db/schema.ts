import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { relations, sql } from "drizzle-orm";

// --- Data model -------------------------------------------------------
// Drizzle + better-sqlite3 for zero-setup local development (pure JS/native
// npm packages, no external binary downloads). To move to Postgres later,
// swap `drizzle-orm/sqlite-core` for `drizzle-orm/pg-core` and the
// better-sqlite3 driver in db/index.ts for `drizzle-orm/node-postgres` —
// the table/column shapes below stay the same.
//
// NOTE ON FILE SIZE: this file is intentionally kept as one file despite
// exceeding the project's normal 250-line guideline. Splitting table
// definitions and their cross-references (e.g. registrySnapshots'/
// registryCheckLog's FK to subcontractors) into separate files breaks
// drizzle-kit 0.24.2's schema loader, which does not resolve this project's
// NodeNext-style `.js`-suffixed relative imports to their sibling `.ts`
// files (confirmed: `drizzle-kit generate` fails with MODULE_NOT_FOUND on
// any such split). Fixing that would require a multi-minor-version
// drizzle-kit upgrade — a larger, unrelated, riskier change than a modest
// line-count overage on a flat list of table declarations.

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());

// `role` is a free-text label (e.g. "Manager", "Team member", or a
// department like "Procurement") — the exact string "Manager" is what the
// backend's permission check (see lib/permissions.ts) treats as manager
// access. `email` is optional: real addresses aren't always known up front,
// and nothing in the app requires one to function.
export const teamMembers = sqliteTable("team_members", {
  id: id(),
  name: text("name").notNull(),
  email: text("email").unique(),
  role: text("role").notNull(),
  initials: text("initials").notNull(),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

export const subcontractors = sqliteTable("subcontractors", {
  id: id(),
  company: text("company").notNull(),
  orgNr: text("org_nr").notNull(),
  country: text("country").notNull().default("NO"), // ISO 3166-1 alpha-2
  category: text("category").notNull(),
  legalForm: text("legal_form"),
  companyStatus: text("company_status").notNull().default("Registered and active"),
  registeredOn: text("registered_on"),
  industryCode: text("industry_code"),
  employees: integer("employees"),
  municipality: text("municipality"),
  vatRegistered: integer("vat_registered", { mode: "boolean" }).notNull().default(false),
  auditor: text("auditor"),
  shareCapital: text("share_capital"),
  address: text("address"),
  postalAddress: text("postal_address"),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  aiSummary: text("ai_summary"),
  ownerId: text("owner_id").references(() => teamMembers.id),
  // `lastCheckedAt` is the last *successful* registry check (unchanged
  // meaning — set after a sync completes). The two columns below are
  // additive, used only by Denmark's weekly monitoring job for now: which
  // suppliers are due, and when a check was last attempted regardless of
  // outcome. Every other country leaves them null.
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  lastCheckAttemptedAt: integer("last_check_attempted_at", { mode: "timestamp" }),
  nextCheckAt: integer("next_check_at", { mode: "timestamp" }),
  lastCheckedAt: integer("last_checked_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

export const events = sqliteTable("events", {
  id: id(),
  subcontractorId: text("subcontractor_id")
    .notNull()
    .references(() => subcontractors.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  description: text("description").notNull(),
  attention: text("attention", {
    enum: ["NEW_INFORMATION", "CHANGE_DETECTED", "REVIEW_RECOMMENDED", "TIME_SENSITIVE"],
  }).notNull(),
  followUp: text("follow_up", {
    enum: ["REVIEWED", "UNRESOLVED", "TASK_CREATED", "NO_ACTION_NEEDED"],
  })
    .notNull()
    .default("UNRESOLVED"),
  reviewed: integer("reviewed", { mode: "boolean" }).notNull().default(false),
  source: text("source").notNull(),
  previousValue: text("previous_value"),
  currentValue: text("current_value"),
  aiExplanation: text("ai_explanation"),
  ownerId: text("owner_id").references(() => teamMembers.id),
  detectedAt: integer("detected_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

export const tasks = sqliteTable("tasks", {
  id: id(),
  title: text("title").notNull(),
  subcontractorId: text("subcontractor_id")
    .notNull()
    .references(() => subcontractors.id, { onDelete: "cascade" }),
  eventId: text("event_id").references(() => events.id),
  // Set when this task was created from a risk indicator suggestion rather
  // than a registry-change event — see riskAssessment/indicators.ts for the
  // set of possible keys. Free-text, not a FK: indicators are computed live,
  // not stored rows, so there is nothing in the database to reference.
  sourceIndicatorKey: text("source_indicator_key"),
  ownerId: text("owner_id").references(() => teamMembers.id),
  due: integer("due", { mode: "timestamp" }),
  priority: text("priority", { enum: ["LOW", "NORMAL", "HIGH"] }).notNull().default("NORMAL"),
  status: text("status", {
    enum: ["NOT_STARTED", "IN_PROGRESS", "WAITING_FOR_INFORMATION", "COMPLETED"],
  })
    .notNull()
    .default("NOT_STARTED"),
  comment: text("comment"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

export const notes = sqliteTable("notes", {
  id: id(),
  subcontractorId: text("subcontractor_id")
    .notNull()
    .references(() => subcontractors.id, { onDelete: "cascade" }),
  authorId: text("author_id").references(() => teamMembers.id),
  text: text("text").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

export const documents = sqliteTable("documents", {
  id: id(),
  subcontractorId: text("subcontractor_id")
    .notNull()
    .references(() => subcontractors.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: text("type").notNull(),
  uploadedAt: integer("uploaded_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  validUntil: integer("valid_until", { mode: "timestamp" }),
  note: text("note"),
});

export const financialYears = sqliteTable("financial_years", {
  id: id(),
  subcontractorId: text("subcontractor_id")
    .notNull()
    .references(() => subcontractors.id, { onDelete: "cascade" }),
  year: integer("year").notNull(),
  currency: text("currency"),
  operatingRevenue: real("operating_revenue"),
  operatingResult: real("operating_result"),
  resultBeforeTax: real("result_before_tax"),
  equityRatio: real("equity_ratio"),
  liquidityRatio: real("liquidity_ratio"),
  employees: integer("employees"),
});

export const people = sqliteTable("people", {
  id: id(),
  subcontractorId: text("subcontractor_id")
    .notNull()
    .references(() => subcontractors.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  role: text("role").notNull(),
  since: text("since"),
});

export const ownerships = sqliteTable("ownerships", {
  id: id(),
  subcontractorId: text("subcontractor_id")
    .notNull()
    .references(() => subcontractors.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  sharePercent: real("share_percent").notNull(),
});

export const sources = sqliteTable("sources", {
  id: id(),
  name: text("name").notNull(),
  desc: text("desc").notNull(),
  frequency: text("frequency").notNull(),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
});

// Raw snapshot of what a country registry provider returned for a
// subcontractor at a point in time. Each sync compares the new snapshot
// against the most recent one and creates Event rows for any differences.
// `provider`/`dataType`/`hash` are additive — used by Denmark to keep
// APICVR's basic profile and CompanyData's financials/ownership as distinct,
// separately-comparable snapshots (see services/registryProviders/denmark.ts
// and services/companyData.ts). NO/GB continue to write one combined
// basic-profile snapshot per sync and leave these columns null, exactly as
// before.
export const registrySnapshots = sqliteTable("registry_snapshots", {
  id: id(),
  subcontractorId: text("subcontractor_id")
    .notNull()
    .references(() => subcontractors.id, { onDelete: "cascade" }),
  country: text("country").notNull(),
  provider: text("provider"),
  dataType: text("data_type"),
  hash: text("hash"),
  raw: text("raw").notNull(), // JSON-encoded normalized registry payload
  fetchedAt: integer("fetched_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

// A failed provider request, recorded separately from registrySnapshots so
// an outage or rejected key never masquerades as valid company data. Also
// doubles as the "last attempted check" / "provider result" audit trail the
// weekly monitor and manual sync both write to.
export const registryCheckLog = sqliteTable("registry_check_log", {
  id: id(),
  subcontractorId: text("subcontractor_id")
    .notNull()
    .references(() => subcontractors.id, { onDelete: "cascade" }),
  provider: text("provider").notNull(),
  dataType: text("data_type"),
  success: integer("success", { mode: "boolean" }).notNull(),
  statusCode: integer("status_code"),
  errorMessage: text("error_message"),
  checkedAt: integer("checked_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

// One row per calendar month, incremented on every CompanyData.dk call, so
// the app can warn locally before the Basic plan's 500-call monthly quota is
// likely to be exceeded. Never stores the API key.
export const companyDataUsage = sqliteTable("companydata_usage", {
  id: id(),
  month: text("month").notNull().unique(), // "YYYY-MM"
  callCount: integer("call_count").notNull().default(0),
});

// A team member's decision on one risk indicator suggestion for one
// supplier. Risk indicators themselves are computed live from current data
// (see riskAssessment/indicators.ts), not stored — `indicatorKey` is the
// stable slug identifying which rule this decision is about. Append-only:
// changing a decision inserts a new row rather than overwriting, so history
// is preserved; the "current" decision is the most recent row for a given
// (subcontractorId, indicatorKey) pair.
export const riskIndicatorDecisions = sqliteTable("risk_indicator_decisions", {
  id: id(),
  subcontractorId: text("subcontractor_id")
    .notNull()
    .references(() => subcontractors.id, { onDelete: "cascade" }),
  indicatorKey: text("indicator_key").notNull(),
  status: text("status", {
    enum: ["NOT_REVIEWED", "ACCEPTED", "NOT_RELEVANT", "RESOLVED"],
  })
    .notNull()
    .default("NOT_REVIEWED"),
  note: text("note"),
  decidedById: text("decided_by_id").references(() => teamMembers.id),
  decidedAt: integer("decided_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

// --- Relations (enables db.query.subcontractors.findMany({ with: {...} })) --

export const teamMembersRelations = relations(teamMembers, ({ many }) => ({
  subcontractors: many(subcontractors),
  events: many(events),
  tasks: many(tasks),
  notes: many(notes),
}));

export const subcontractorsRelations = relations(subcontractors, ({ one, many }) => ({
  owner: one(teamMembers, { fields: [subcontractors.ownerId], references: [teamMembers.id] }),
  events: many(events),
  tasks: many(tasks),
  notes: many(notes),
  documents: many(documents),
  financials: many(financialYears),
  people: many(people),
  owners: many(ownerships),
  snapshots: many(registrySnapshots),
  checkLogs: many(registryCheckLog),
  riskIndicatorDecisions: many(riskIndicatorDecisions),
}));

export const eventsRelations = relations(events, ({ one, many }) => ({
  subcontractor: one(subcontractors, { fields: [events.subcontractorId], references: [subcontractors.id] }),
  owner: one(teamMembers, { fields: [events.ownerId], references: [teamMembers.id] }),
  tasks: many(tasks),
}));

export const tasksRelations = relations(tasks, ({ one }) => ({
  subcontractor: one(subcontractors, { fields: [tasks.subcontractorId], references: [subcontractors.id] }),
  event: one(events, { fields: [tasks.eventId], references: [events.id] }),
  owner: one(teamMembers, { fields: [tasks.ownerId], references: [teamMembers.id] }),
}));

export const notesRelations = relations(notes, ({ one }) => ({
  subcontractor: one(subcontractors, { fields: [notes.subcontractorId], references: [subcontractors.id] }),
  author: one(teamMembers, { fields: [notes.authorId], references: [teamMembers.id] }),
}));

export const documentsRelations = relations(documents, ({ one }) => ({
  subcontractor: one(subcontractors, { fields: [documents.subcontractorId], references: [subcontractors.id] }),
}));

export const financialYearsRelations = relations(financialYears, ({ one }) => ({
  subcontractor: one(subcontractors, { fields: [financialYears.subcontractorId], references: [subcontractors.id] }),
}));

export const peopleRelations = relations(people, ({ one }) => ({
  subcontractor: one(subcontractors, { fields: [people.subcontractorId], references: [subcontractors.id] }),
}));

export const ownershipsRelations = relations(ownerships, ({ one }) => ({
  subcontractor: one(subcontractors, { fields: [ownerships.subcontractorId], references: [subcontractors.id] }),
}));

export const registrySnapshotsRelations = relations(registrySnapshots, ({ one }) => ({
  subcontractor: one(subcontractors, { fields: [registrySnapshots.subcontractorId], references: [subcontractors.id] }),
}));

export const registryCheckLogRelations = relations(registryCheckLog, ({ one }) => ({
  subcontractor: one(subcontractors, { fields: [registryCheckLog.subcontractorId], references: [subcontractors.id] }),
}));

export const riskIndicatorDecisionsRelations = relations(riskIndicatorDecisions, ({ one }) => ({
  subcontractor: one(subcontractors, { fields: [riskIndicatorDecisions.subcontractorId], references: [subcontractors.id] }),
  decidedBy: one(teamMembers, { fields: [riskIndicatorDecisions.decidedById], references: [teamMembers.id] }),
}));
