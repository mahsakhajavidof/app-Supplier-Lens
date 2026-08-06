# Supplier Lens

A subcontractor monitoring app: track organisational, financial and operational changes
across your subcontractors, with follow-up tasks, notes, documents and reports — built
from the "Leverandørsyn" design.

## Stack, and why

- **Frontend:** React + TypeScript + Vite + Tailwind CSS, React Router, TanStack Query.
  Fast dev server, small bundle, no build magic — a plain Vite app with plain fetch calls.
- **Backend:** Node.js + TypeScript + Express, Drizzle ORM + SQLite (via `better-sqlite3`).
- **Why not Prisma:** Prisma's engine binaries are downloaded from `binaries.prisma.sh` on
  every install, which is blocked on some corporate/locked-down networks. Drizzle +
  better-sqlite3 are pure npm packages (no extra binary fetch), so `npm install` just
  works everywhere, including behind restrictive firewalls.
- **Why SQLite:** zero setup — no database server to install or configure. The schema
  lives in `backend/src/db/schema.ts`; moving to Postgres later is a driver swap
  (`drizzle-orm/node-postgres` instead of `drizzle-orm/better-sqlite3`) with the same
  table definitions and the same query code.

## Project layout

```
backend/               Express API + SQLite database (Drizzle ORM)
frontend/               React app (Vite)
reference-prototype/     Original static HTML/JS mockup this app was built from
```

`backend/` and `frontend/` each have their own `package.json` — they're two
independent apps that talk over HTTP, not a monorepo with shared build tooling.
That keeps each side simple to reason about and edit on its own.

`reference-prototype/` is the original design mockup ("Leverandørsyn"), kept
for reference only — it's a standalone static export, not part of the running
app, and isn't built or served by anything in `backend/` or `frontend/`.

## Running it locally

You'll need Node.js 18+ (Node 22 is what this was built and tested against).

```bash
# 1. Backend
cd backend
cp .env.example .env
npm install
npm run db:generate   # generates the SQL migration from schema.ts (already committed, but harmless to re-run)
npm run seed          # creates dev.db and fills it with demo data
npm run dev            # starts the API on http://localhost:4000

# 2. Frontend (in a second terminal)
cd frontend
npm install
npm run dev            # starts the app on http://localhost:5173
```

Open http://localhost:5173. The Vite dev server proxies `/api/*` to the backend
(see `frontend/vite.config.ts`), so you don't need CORS config or a hardcoded API URL.

## What's real vs. a stub

- **Norway (Brønnøysundregistrene):** live, free, public APIs — no key needed. A
  lookup now combines the company record, public management/board roles and the
  latest open annual-account figures. The open accounts API exposes the latest
  filing; deeper multi-year figures require Brønnøysund's authenticated service.
- **UK (Companies House):** real integration, but needs a free API key you generate at
  https://developer.company-information.service.gov.uk/. Put it in `backend/.env` as
  `COMPANIES_HOUSE_API_KEY`. Until it's set, the Settings page shows it as "Needs API
  key" and any sync against a UK subcontractor returns a clear error instead of failing
  silently.
- **Document upload:** records file *metadata* only (name, type, expiry). Wiring up
  actual file storage (S3 or similar) is a follow-up — see `backend/src/routes/documents.ts`.
- **Report export:** exports CSV client-side (`frontend/src/lib/format.ts#downloadCsv`)
  rather than generating PDF/Excel server-side, to avoid pulling in a heavy PDF/Excel
  library for an MVP. The data underneath is real, just the file format is simplified.

## Adding another country's company registry

This is the part built to grow. Look at `backend/src/services/registryProviders/`:

1. `types.ts` defines the `CompanyRegistryProvider` interface every country implements —
   a `lookup(orgNr)` that returns a normalized `NormalizedCompanyRecord`.
2. `norway.ts` and `uk.ts` are two example implementations — copy whichever is closer to
   your new country's API shape (public/keyless like Norway, or authenticated like UK).
3. Register the new provider in `index.ts`'s `PROVIDERS` array. That's it — the sync
   endpoint (`POST /api/subcontractors/:id/sync`), the diffing logic, and the Settings
   page's "Company registry integrations" list all pick it up automatically.

The sync endpoint is the core mechanic: it calls the provider, compares the result
against the last stored snapshot (`RegistrySnapshot` table), and creates an `Event` row
for every field that changed — which is what turns up in the dashboard, the change
timeline and the "Changes and alerts" page. Add a field to watch by editing
`WATCHED_FIELDS` in `registryProviders/index.ts`.

## Where to look for anything else

- **Data model:** `backend/src/db/schema.ts` — every table, one file.
- **API routes:** `backend/src/routes/*.ts` — one file per resource (subcontractors,
  events, tasks, notes, documents, settings, reports, registry, dashboard).
- **Frontend pages:** `frontend/src/pages/*.tsx`, with the subcontractor profile's tabs
  split out under `frontend/src/pages/subcontractor/`.
- **Design tokens:** `frontend/tailwind.config.js` — colors and radii lifted directly
  from the original mockup so the built app matches it.
- **Demo data:** `backend/src/db/seed.ts` — 10 Norwegian subcontractors (using real,
  public organisation numbers so the live Norway lookup has something valid to try
  against), with events, tasks, notes, documents and financial history.

## A note on the "sync" button

Clicking **Sync with NO registry** on a subcontractor's page makes a real HTTP call out
to Brønnøysundregistrene's public API, compares what comes back to what was last stored,
and logs any difference as a new change. It was tested end-to-end from a normal network
connection; if you try it from a network that blocks outbound calls to
`data.brreg.no` (some corporate firewalls block unfamiliar domains by default), you'll
see a clear error toast rather than a crash — that's a network policy issue, not a bug
in the app.
