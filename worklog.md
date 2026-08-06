# Worklog

## 2026-08-05 — Norwegian company enrichment

### Summary

- Made subcontractor creation perform a server-side registry lookup automatically.
- Combined Enhetsregisteret company data, public roles and open annual-account data.
- Persisted company profile fields, management/board roles, auditor, share capital,
  contact phone and available financial figures during both creation and sync.
- Preserved the annual account's reported currency in storage and presentation.
- Added the additive `financial_years.currency` database migration.

### Files changed

- Norwegian registry provider, normalized types and mapper.
- Subcontractor creation/sync persistence and serialization.
- Financial and company-information presentation.
- Drizzle schema and migration.
- Backend test script, automated enrichment test and README.

### Tests and validation

- Backend TypeScript build: passed.
- Norwegian enrichment automated test: passed (1/1).
- Frontend TypeScript build and Vite production build: passed.
- Existing database migration: passed.
- Live read-only Brønnøysund lookup: passed for org. no. `923609016`, returning
  14 people, auditor, share capital, phone and the latest financial year.

### Delivery

- Commit: `533249a` (squash-merged as `a484131`).
- Pull request: #1, merged into `main`.
- Merge: done.

## 2026-08-06 — Mandatory implementation rules policy

### Summary

- Added `CLAUDE.md` at the repository root recording the standing implementation
  rules the user requested for all future code changes: 250-line file-size cap,
  scope discipline (implement only what's requested), a worklog entry per change,
  automated-test coverage for every functional change, and a validate-then-commit
  -push-PR-merge workflow with no bypassing of failing checks or branch protection.
- Documentation-only change; no source code was modified.

### Files changed

- `CLAUDE.md` (new).
- `worklog.md` (this entry).

### Tests and validation

- No automated test required — documentation-only change (per rule 5).
- No build/type-check impact — no source files touched.

### Delivery

- Commit: `53401c8` (squash-merged as `ace9a07`).
- Pull request: #2, merged into `main`.
- Merge: done.

## 2026-08-06 — Sync local workspace files with merged main

### Summary

- Found the local workspace's copies of `worklog.md` and `README.md` had drifted
  from what was already merged on GitHub `main` — those two files had been edited
  directly in an isolated publish clone (kept separate from this workspace to
  avoid disrupting concurrent edits from another agent) and never synced back.
- Brought the local `README.md` up to date with the merged "Project layout"
  section (documents `API/` and `reference-prototype/`, which exist in the
  published repo but were not reflected here).
- The local `API/` folder itself was intentionally left as-is, per the user's
  instruction, and is not part of this sync.
- No corresponding change was pushed to GitHub for this entry — `README.md` on
  `main` already had this content from PR #1; only the local copy needed updating.

### Files changed

- `README.md` (local workspace only).
- `worklog.md` (this entry).

### Tests and validation

- No automated test required — documentation-only change (per rule 5).
- No build/type-check impact — no source files touched.

### Delivery

- Commit: none required — GitHub `main` already had the correct `README.md`
  content from PR #1; this was a local-workspace-only file sync.
- Pull request: none.
- Merge: n/a.

## 2026-08-06 — Remove API/ folder

### Summary

- Removed `API/openapi.json` from the repository at the user's request, to match
  its already-deleted state in the local development workspace.
- Updated the README's "Project layout" section to drop the `API/` row.

### Files changed

- `API/openapi.json` (deleted).
- `README.md`.
- `worklog.md` (this entry).

### Tests and validation

- No automated test required — deletion of a reference-only static file plus a
  documentation update (per rule 5).
- Backend TypeScript build: passed.
- Frontend TypeScript build and Vite production build: passed.

### Delivery

- Commit: `6b18305` + `8d33f30` (squash-merged as `a4968e2`).
- Pull request: #5, merged into `main`.
- Merge: done.

## 2026-08-06 — Local run and full-stack verification

### Summary

- Ran the app locally per `README.md`'s documented startup commands and verified
  the backend and frontend end-to-end. Both were already running from an earlier
  session on their standard ports; verified them in place rather than restarting,
  since they were healthy and reflected the current on-disk code.
- Confirmed `backend/.env` has exactly `DATABASE_URL`, `PORT`, and
  `COMPANIES_HOUSE_API_KEY` (names/lengths only checked — no values printed).
- `npm install` in `backend/` and `frontend/`: no missing packages installed;
  `backend/package-lock.json` was normalized to drop stale `@prisma/*`/`prisma`
  lockfile entries left over from the pre-Drizzle era (not referenced by
  `package.json` any more) — a direct side effect of the requested dependency
  install step, not a separate design change.
- Database migrations: already applied automatically by `runMigrations()` at
  backend startup (`backend/src/db/index.ts`); no new migration was needed or
  created.
- Verified the frontend with a real headless-browser render (Playwright driving
  a locally cached Chromium, run outside the project — not added as a project
  dependency): dashboard rendered fully, page title correct, no `pageerror`s, no
  failed API requests. One benign `favicon.ico` 404 in the console — cosmetic,
  pre-existing, unrelated to app functionality.
- Confirmed `GET /api/settings/registries` reports both providers configured
  (`NO`, `GB`).
- Confirmed a live, read-only Companies House lookup through the full stack
  (frontend proxy → backend → Companies House API):
  `GET /api/registry/lookup/GB/00445790` → HTTP 200, returned the real TESCO PLC
  record. No subcontractor record was created, modified, or deleted.
- Dashboard currently shows 0 subcontractors — the local `dev.db` has migrations
  applied but no seed data loaded. This is a pre-existing data-state fact, not an
  application defect; `npm run seed` was intentionally not run, to avoid writing
  subcontractor records outside the scope of this verification.

### Files changed

- `backend/package-lock.json` (lockfile normalization only, see above).
- `worklog.md` (this entry).

### Tests and validation

- Backend automated test suite (`npm test`): passed (1/1).
- Backend TypeScript build (`npm run build`): passed.
- Frontend type check (`npm run lint` → `tsc --noEmit`): passed, no errors.
- Frontend production build (`npm run build`): passed.
- Backend health check `GET /api/health`: `{"ok":true}`.
- Frontend dev server: HTTP 200 at `http://localhost:5173/`.
- Registry config endpoint `GET /api/settings/registries`: both `NO` and `GB`
  report `configured: true`.
- Live Companies House lookup via frontend proxy: HTTP 200, real company data
  returned.
- Headless-browser check: page rendered, no `pageerror`s, no failed (4xx/5xx)
  API requests.
- No functional source code was changed, so no new automated test was required
  (per rule 5) beyond the existing suites above, which all passed.

### Delivery

- Commit: pending (this entry is written before commit, per rule 4).
- Pull request: pending.
- Merge: pending.
