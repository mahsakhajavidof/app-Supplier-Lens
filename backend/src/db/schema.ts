import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { relations, sql } from "drizzle-orm";

// --- Data model -------------------------------------------------------
// Drizzle + better-sqlite3 for zero-setup local development (pure JS/native
// npm packages, no external binary downloads). To move to Postgres later,
// swap `drizzle-orm/sqlite-core` for `drizzle-orm/pg-core` and the
// better-sqlite3 driver in db/index.ts for `drizzle-orm/node-postgres` —
// the table/column shapes below stay the same.

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
export const registrySnapshots = sqliteTable("registry_snapshots", {
  id: id(),
  subcontractorId: text("subcontractor_id")
    .notNull()
    .references(() => subcontractors.id, { onDelete: "cascade" }),
  country: text("country").notNull(),
  raw: text("raw").notNull(), // JSON-encoded normalized registry payload
  fetchedAt: integer("fetched_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
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
