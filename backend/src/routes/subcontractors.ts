import { Router } from "express";
import { and, desc, eq, like, or } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/index.js";
import { events, registrySnapshots, subcontractors, teamMembers } from "../db/schema.js";
import { serializeEvent } from "../lib/labels.js";
import { decorateSubcontractor } from "../lib/subcontractorSerialization.js";
import { getProvider, diffSnapshots } from "../services/registryProviders/index.js";
import { RegistryProviderError } from "../services/registryProviders/types.js";
import type { NormalizedCompanyRecord } from "../services/registryProviders/types.js";
import { persistRegistryRecord, profileValues } from "../services/registryPersistence.js";

export const subcontractorsRouter = Router();

// GET /api/subcontractors?search=&category=&owner=
subcontractorsRouter.get("/", async (req, res, next) => {
  try {
    const { search, category, owner } = req.query as Record<string, string | undefined>;

    let ownerId: string | undefined;
    if (owner) {
      const match = await db.query.teamMembers.findFirst({ where: eq(teamMembers.name, owner) });
      ownerId = match?.id;
    }

    const rows = await db.query.subcontractors.findMany({
      where: and(
        category ? eq(subcontractors.category, category) : undefined,
        ownerId ? eq(subcontractors.ownerId, ownerId) : undefined,
        search
          ? or(like(subcontractors.company, `%${search}%`), like(subcontractors.orgNr, `%${search}%`))
          : undefined
      ),
      with: {
        owner: true,
        events: { orderBy: [desc(events.detectedAt)] },
      },
      orderBy: [desc(subcontractors.lastCheckedAt)],
    });

    res.json(rows.map(decorateSubcontractor));
  } catch (err) {
    next(err);
  }
});

// A subset of NormalizedCompanyRecord the frontend may attach when it already
// ran a registry lookup for this org/country before submitting the form —
// see GET /api/registry/lookup/:country/:orgNr. Storing it as the first
// registrySnapshot means the next sync diffs against real data instead of
// reporting every field as "changed" on first run.
const registryDataSchema = z.object({
  name: z.string(),
  legalForm: z.string().optional(),
  companyStatus: z.string().optional(),
  registeredOn: z.string().optional(),
  industryCode: z.string().optional(),
  employees: z.number().optional(),
  municipality: z.string().optional(),
  vatRegistered: z.boolean().optional(),
  address: z.string().optional(),
  postalAddress: z.string().optional(),
});

const createSubcontractorSchema = z.object({
  company: z.string().min(1),
  orgNr: z.string().min(1),
  country: z.string().length(2),
  category: z.string().min(1),
  ownerId: z.string().optional(),
  registryData: registryDataSchema.optional(),
});

// POST /api/subcontractors
// Creates a subcontractor. If the form already looked up the company via a
// registry (registryData present), that data seeds the record's profile
// fields and becomes its first registry snapshot.
subcontractorsRouter.post("/", async (req, res, next) => {
  try {
    const body = createSubcontractorSchema.parse(req.body);
    const country = body.country.toUpperCase();
    const provider = getProvider(country);

    const existing = await db.query.subcontractors.findFirst({
      where: and(eq(subcontractors.orgNr, body.orgNr), eq(subcontractors.country, country)),
    });
    if (existing) {
      res.status(409).json({
        error: `A subcontractor with organisation number ${body.orgNr} already exists (${existing.company}).`,
      });
      return;
    }

    const registryData = provider?.isConfigured()
      ? await provider.lookup(body.orgNr)
      : body.registryData
        ? { ...body.registryData, orgNr: body.orgNr, country, raw: body.registryData }
        : undefined;

    const [created] = await db
      .insert(subcontractors)
      .values({
        company: registryData?.name ?? body.company,
        orgNr: body.orgNr,
        country,
        category: body.category,
        ownerId: body.ownerId,
        ...(registryData ? profileValues(registryData) : {}),
      })
      .returning();

    if (registryData) {
      await persistRegistryRecord(created.id, registryData);
    }

    const sub = await db.query.subcontractors.findFirst({
      where: eq(subcontractors.id, created.id),
      with: {
        owner: true,
        events: { orderBy: [desc(events.detectedAt)] },
        financials: true,
        people: true,
        owners: true,
      },
    });
    res.status(201).json(decorateSubcontractor(sub!));
  } catch (err) {
    next(err);
  }
});

subcontractorsRouter.get("/meta/filters", async (_req, res, next) => {
  try {
    const rows = await db.query.subcontractors.findMany({ with: { owner: true } });
    const uniq = (arr: (string | undefined | null)[]) => Array.from(new Set(arr.filter(Boolean))) as string[];
    res.json({
      categories: uniq(rows.map((s) => s.category)),
      owners: uniq(rows.map((s) => s.owner?.name)),
    });
  } catch (err) {
    next(err);
  }
});

subcontractorsRouter.get("/:id", async (req, res, next) => {
  try {
    const sub = await db.query.subcontractors.findFirst({
      where: eq(subcontractors.id, req.params.id),
      with: {
        owner: true,
        events: { orderBy: [desc(events.detectedAt)], with: { owner: true } },
        tasks: { with: { owner: true, event: true } },
        notes: { with: { author: true } },
        documents: true,
        financials: true,
        people: true,
        owners: true,
      },
    });
    if (!sub) {
      res.status(404).json({ error: "Subcontractor not found" });
      return;
    }
    res.json(decorateSubcontractor(sub));
  } catch (err) {
    next(err);
  }
});

// POST /api/subcontractors/:id/sync
// Re-fetches this subcontractor's record from its country's company
// registry, compares it against the last stored snapshot, and creates an
// Event for every field that changed. This is the real (non-mocked)
// integration point for "different suppliers' country's company" data.
subcontractorsRouter.post("/:id/sync", async (req, res, next) => {
  try {
    const sub = await db.query.subcontractors.findFirst({ where: eq(subcontractors.id, req.params.id) });
    if (!sub) {
      res.status(404).json({ error: "Subcontractor not found" });
      return;
    }

    const provider = getProvider(sub.country);
    if (!provider) {
      res.status(400).json({ error: `No registry provider configured for country "${sub.country}"` });
      return;
    }
    if (!provider.isConfigured()) {
      res.status(400).json({
        error: `${provider.registryName} is not configured yet (missing API key). See backend/.env.example.`,
      });
      return;
    }

    const current = await provider.lookup(sub.orgNr);

    const lastSnapshot = await db.query.registrySnapshots.findFirst({
      where: eq(registrySnapshots.subcontractorId, sub.id),
      orderBy: [desc(registrySnapshots.fetchedAt)],
    });
    const previous = lastSnapshot ? (JSON.parse(lastSnapshot.raw) as NormalizedCompanyRecord) : null;

    const changes = diffSnapshots(previous, current);

    await persistRegistryRecord(sub.id, current);

    const createdEvents = [];
    for (const c of changes) {
      const [created] = await db
        .insert(events)
        .values({
          subcontractorId: sub.id,
          type: `${c.label} changed`,
          description: `${c.label} changed from "${c.previousValue}" to "${c.currentValue}", detected via ${provider.registryName}.`,
          attention: "CHANGE_DETECTED",
          followUp: "UNRESOLVED",
          source: provider.registryName,
          previousValue: c.previousValue,
          currentValue: c.currentValue,
        })
        .returning();
      createdEvents.push(created);
    }

    await db.update(subcontractors).set({ lastCheckedAt: new Date() }).where(eq(subcontractors.id, sub.id));

    res.json({
      checked: true,
      registry: provider.registryName,
      changesDetected: createdEvents.length,
      events: createdEvents.map(serializeEvent),
    });
  } catch (err) {
    if (err instanceof RegistryProviderError) {
      res.status(502).json({ error: err.message });
      return;
    }
    next(err);
  }
});
