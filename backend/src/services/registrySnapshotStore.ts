import crypto from "node:crypto";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { registryCheckLog, registrySnapshots } from "../db/schema.js";

export function hashOf(data: unknown): string {
  return crypto.createHash("sha256").update(JSON.stringify(data)).digest("hex");
}

/**
 * The most recent snapshot for this exact (subcontractor, provider,
 * dataType) combination. NO/GB never set provider/dataType (always null),
 * so the default no-argument call matches their existing rows exactly —
 * this is a drop-in replacement for the inline query the /sync route used
 * before, not a behavior change.
 */
export async function getLatestSnapshot(subcontractorId: string, provider?: string, dataType?: string) {
  return db.query.registrySnapshots.findFirst({
    where: and(
      eq(registrySnapshots.subcontractorId, subcontractorId),
      provider ? eq(registrySnapshots.provider, provider) : isNull(registrySnapshots.provider),
      dataType ? eq(registrySnapshots.dataType, dataType) : isNull(registrySnapshots.dataType)
    ),
    // fetchedAt is second-resolution (SQLite's unixepoch()), so two snapshots
    // saved within the same second would otherwise tie; breaking ties on
    // insertion-order rowid keeps "latest" unambiguous even then.
    orderBy: [desc(registrySnapshots.fetchedAt), desc(sql`rowid`)],
  });
}

/** Parses a stored snapshot's `raw` column back into its normalized value. */
export function readSnapshotNormalized<T>(snapshot: { raw: string }): T {
  return JSON.parse(snapshot.raw) as T;
}

/**
 * Records a successful fetch as its own distinct, dated snapshot — never
 * combined with a different provider or data type. `normalized` is what
 * gets diffed against next time; `raw` (if provided) is the untouched
 * provider response, stored alongside for audit purposes.
 */
export async function saveSnapshot(params: {
  subcontractorId: string;
  country: string;
  provider?: string;
  dataType?: string;
  normalized: unknown;
}): Promise<string> {
  const hash = hashOf(params.normalized);
  await db.insert(registrySnapshots).values({
    subcontractorId: params.subcontractorId,
    country: params.country,
    provider: params.provider, // undefined -> NULL, matching getLatestSnapshot()'s no-argument lookup
    dataType: params.dataType,
    hash,
    raw: JSON.stringify(params.normalized),
  });
  return hash;
}

/**
 * Records a failed attempt as an operational result — never as a snapshot,
 * so a rejected key or an outage can never be mistaken for real company
 * data (or for a genuine "nothing changed" result).
 */
export async function logCheckResult(params: {
  subcontractorId: string;
  provider: string;
  dataType?: string;
  success: boolean;
  statusCode?: number;
  errorMessage?: string;
}) {
  await db.insert(registryCheckLog).values(params);
}
