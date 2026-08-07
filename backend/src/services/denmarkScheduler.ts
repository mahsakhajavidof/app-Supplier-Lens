import { and, eq, isNull, lte, or } from "drizzle-orm";
import { db } from "../db/index.js";
import { subcontractors } from "../db/schema.js";
import { checkDanishSupplier } from "./denmarkMonitoring.js";

// Weekly monitoring runs only in-process, only while this backend is
// running — there is no external scheduler or deployed service. An hourly
// sweep checks for suppliers whose `nextCheckAt` has passed; checkDanishSupplier
// itself sets the next one 7 days out on every successful check.
const SWEEP_INTERVAL_MS = 60 * 60 * 1000;
const DELAY_BETWEEN_CHECKS_MS = 2000; // sequential, not a request storm

const inProgress = new Set<string>();
let sweepRunning = false;
let timer: ReturnType<typeof setInterval> | undefined;

async function findOverdueDanishSuppliers() {
  const now = new Date();
  return db.query.subcontractors.findMany({
    where: and(
      eq(subcontractors.country, "DK"),
      eq(subcontractors.active, true),
      or(isNull(subcontractors.nextCheckAt), lte(subcontractors.nextCheckAt, now))
    ),
  });
}

/**
 * Checks every active, overdue Danish supplier once, sequentially with a
 * small delay between each. Idempotent and safe to call repeatedly (e.g. on
 * a timer and again at startup): a supplier already in progress or not yet
 * due is simply skipped, never checked twice concurrently.
 */
export async function runDueDanishChecks(): Promise<{ checked: number; failed: number }> {
  if (sweepRunning) return { checked: 0, failed: 0 };
  sweepRunning = true;
  let checked = 0;
  let failed = 0;
  try {
    const due = await findOverdueDanishSuppliers();
    for (const sub of due) {
      if (inProgress.has(sub.id)) continue;
      inProgress.add(sub.id);
      try {
        await checkDanishSupplier(sub.id);
        checked++;
      } catch {
        failed++; // already recorded to registry_check_log by checkDanishSupplier
      } finally {
        inProgress.delete(sub.id);
      }
      if (due.length > 1) await new Promise((resolve) => setTimeout(resolve, DELAY_BETWEEN_CHECKS_MS));
    }
  } finally {
    sweepRunning = false;
  }
  return { checked, failed };
}

/** Starts the monitor: runs once immediately (catching up on anything
 * overdue from while the backend was down), then on an hourly sweep. */
export function startDenmarkScheduler() {
  if (timer) return;
  void runDueDanishChecks();
  timer = setInterval(() => void runDueDanishChecks(), SWEEP_INTERVAL_MS);
}

export function stopDenmarkScheduler() {
  if (timer) clearInterval(timer);
  timer = undefined;
}
