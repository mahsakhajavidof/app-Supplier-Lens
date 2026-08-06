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
