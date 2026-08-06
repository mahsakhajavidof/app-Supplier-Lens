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

- Commit: pending.
- Pull request: pending.
- Merge: pending.
