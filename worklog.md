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

- Commit: `e00b420` + `f042052` on branch `codex/verify-local-run` (squash-merged
  as `077d6c2`).
- Pull request: #7, merged into `main`.
- Merge: done. (First merge attempt was declined by this machine's local
  safety classifier as an extra guardrail on merge actions; retried and
  completed after the user explicitly confirmed.)

## 2026-08-07 — Fix Norwegian and UK company lookup flows

### Diagnosis (performed before any code change)

Reproduced both flows live: called `/api/registry/search` and `/api/registry/lookup`
directly with curl for both countries, queried Brønnøysundregistrene's public API
directly (bypassing the app) to check ranking, and drove the real "Add subcontractor"
modal in a headless Chromium browser (Playwright, run from outside the project — not
added as a project dependency) to reproduce the UI behaviour a user would see.

**Norway — search never surfaces the company the user is looking for.**
`GET /api/registry/search/NO?q=Equinor` returned 8 real results, but never included
"EQUINOR ASA" itself. Querying Brønnøysundregistrene directly with a larger page size
confirmed why: its name search returns matches in plain alphabetical order (179 total
matches for "Equinor"), and "EQUINOR ASA" sorts 25th — past the app's 8-result page
size, buried under subsidiaries like "EQUINOR ANGOLA BLOCK 1/14 AS". This is an
**external registry response handling** defect: the provider trusted the registry's
ordering instead of ranking for relevance.
A second, independent Norwegian defect: `norwayProvider.search()` tested
`/^\d+$/.test(query)` on the *raw, untrimmed-of-internal-spaces* query, so typing an
organisation number with spaces (e.g. `923 609 016`) failed the numeric check and was
sent as a **name** search instead — an **input formatting** bug (the sibling `lookup()`
function already normalized spaces; `search()` did not).
A third gap: `lookup()` never validated the digit count before calling the registry, so
a malformed number surfaced as a generic "not found" rather than a distinguishable
validation error (required by the task's error-distinction rules).

**UK — search silently swallowed provider errors into an empty list.**
Direct testing showed Companies House search/lookup working correctly with the
currently-configured key (real `TESCO PLC` data returned end-to-end). The defect here
is latent but real and explicitly in scope per the stated requirements: both
`ukProvider.search()` and `norwayProvider.search()` did `if (!res.ok) return [];` —
any authentication failure (401), rate limit, or outage from either registry was
indistinguishable from "no matches found." The `/search/:country` and
`/lookup/:country/:orgNr` routes also hardcoded HTTP 502 for every provider error,
collapsing "invalid key" (401), "not found" (404), and "registry down" into one status
code, contrary to the requirement to return distinguishable status codes. This is a
**swallowed errors** defect, not a UK-specific integration bug — the Companies House
integration itself (auth scheme, key handling, leading-zero preservation) was already
correct.

**Shared frontend defect (affects both countries identically) — the actual root cause
of "the lookup flow doesn't work."** In `AddSubcontractorModal.tsx`, `pickSuggestion()`
filled in the company name and org number from the clicked suggestion but never called
`runLookup()`. A user searching either registry, seeing a correct suggestion, and
clicking it would land on a filled-in form with **no confirmation that anything was
found** — no error, no result, just silence — because a second, undiscoverable button
click ("Look up in registry") was required. This is a **frontend search/workflow**
defect, verified live in the browser for both "Equinor" → EQUINOR ASA and "Tesco" →
TESCO PLC before any fix was applied. A related gap: the "found" confirmation panel
only ever showed name/legal form/status/address, not the organisation number,
registration date, industry code, or VAT status the task requires.

No stale-environment-configuration or country-selection/routing defect was found —
`backend/.env` was loaded correctly, `COMPANIES_HOUSE_API_KEY` was detected, HTTP Basic
auth was correct, and `getProvider()` routing by country was correct throughout.

### Fix

- `backend/src/services/registryProviders/types.ts`: `RegistryProviderError` now
  carries a `status` (defaulting to 502) so each failure mode can report its own HTTP
  status instead of every route hardcoding one value.
- `backend/src/services/registryProviders/norway.ts`:
  - `search()` normalizes spaces before the numeric-vs-name decision.
  - `search()` throws `RegistryProviderError` (with status) instead of returning `[]`
    on a non-ok registry response.
  - Added `rankByRelevance()`: for name searches, fetches a larger page (100) and sorts
    exact match → prefix match → substring match, then by name length, before slicing
    to 8 — so "EQUINOR ASA" (and any similarly-named company) sorts to the top instead
    of off the end of the page.
  - `lookup()` validates the normalized number is exactly 9 digits before making any
    network call, throwing a clear message with status 400 if not.
  - `lookup()`'s 404/other-failure branches now carry status 404 / 502 respectively.
- `backend/src/services/registryProviders/uk.ts`:
  - `search()` now throws (status 400) when the API key is missing, instead of
    returning `[]`.
  - Both `lookup()` and `search()` now detect HTTP 401 explicitly (status 401,
    "rejected the configured API key") before the generic not-ok branch.
  - `lookup()`'s 404/other-failure branches now carry status 404 / 502 respectively.
- `backend/src/routes/registry.ts`: both routes now respond with `err.status` (from
  `RegistryProviderError`) instead of a hardcoded status; the `/search` route also now
  returns a `400` with a message when the provider isn't configured, instead of a
  silent `[]`.
- `frontend/src/components/AddSubcontractorModal.tsx`: `runLookup()` now accepts an
  explicit org number so `pickSuggestion()` can trigger it immediately with the just-
  selected value (state hasn't re-rendered yet at that point); added a `searchError`
  state, cleared on every new search/country change and surfaced instead of silently
  emptying the suggestion list. Split into three new focused files to stay under the
  250-line limit (moving code, not rewriting behaviour):
  - `frontend/src/components/RegistryCompanySearch.tsx` — the country/org-number/
    company-name search UI, suggestions, search error, lookup button and result.
  - `frontend/src/components/RegistrySuggestionDropdown.tsx` — unchanged, moved as-is.
  - `frontend/src/components/RegistryLookupSummary.tsx` — the "company found" panel,
    now showing org/company number, status, legal form, registered date, industry
    code, VAT registration, and address (previously only 3 of these 7 fields).
- No `.env`, secrets, or design/styling tokens were touched; the visual design
  (Tailwind classes, layout, colors) is unchanged — only the missing fields and error
  state were added using the existing patterns already in the file.

### Files changed

- `backend/src/services/registryProviders/types.ts`
- `backend/src/services/registryProviders/norway.ts`
- `backend/src/services/registryProviders/uk.ts`
- `backend/src/routes/registry.ts`
- `backend/src/services/registryProviders/norway.test.ts` (extended)
- `backend/src/services/registryProviders/norway.search.test.ts` (new)
- `backend/src/services/registryProviders/uk.test.ts` (new)
- `frontend/src/components/AddSubcontractorModal.tsx`
- `frontend/src/components/RegistryCompanySearch.tsx` (new)
- `frontend/src/components/RegistrySuggestionDropdown.tsx` (new)
- `frontend/src/components/RegistryLookupSummary.tsx` (new)
- `frontend/src/components/AddSubcontractorModal.test.tsx` (new)
- `frontend/vitest.config.ts` (new — frontend had no test runner before this change;
  added Vitest + `@testing-library/react` + `jsdom` as dev dependencies, since the
  task explicitly requires automated frontend workflow tests)
- `frontend/package.json` (added `test` script and the three dev dependencies above)

### Tests added

Backend (all mock `fetch`; no live network calls in the suite), 17 tests total:
- Norway: exact lookup, spaced-number normalization (lookup and search), invalid
  9-digit format is rejected before any network call, 404 vs. 500 are distinguished,
  a network failure propagates instead of being swallowed, a name search ranks the
  exact/prefix match above alphabetically-earlier results, Norwegian characters
  (æ/ø/å) pass through the outgoing query correctly, and a genuine no-match returns `[]`.
- UK: search and lookup for Tesco/00445790, leading zeroes preserved end-to-end,
  missing API key rejected (both search and lookup, status 400), a 401 is
  distinguished from a 404, and a network failure propagates instead of being
  swallowed.

Frontend (6 tests, `AddSubcontractorModal.test.tsx`, mocking `../lib/api` so no real
network/backend is involved):
- Selecting a country searches that country's registry.
- Suggestions shown are scoped to the currently selected country only.
- Picking a suggestion populates the company name and number **and** triggers the
  full lookup automatically, showing the "Company found" confirmation without any
  further click.
- Changing country clears both stale suggestions and any previous lookup result.
- A provider search error (e.g. a rejected key) is shown as a message, not silently
  treated as zero results.
- Typing, searching, and picking a suggestion never call `subcontractors.create()` —
  nothing is submitted until the form is explicitly submitted.

### Validation results

- Backend tests (`npm test`, backend): 17/17 passed.
- Backend TypeScript build (`npm run build`, backend): passed.
- Frontend tests (`npm test`, frontend, new Vitest suite): 6/6 passed.
- Frontend type check (`npm run lint`, frontend): passed, no errors.
- Frontend production build (`npm run build`, frontend): passed.
- Live read-only check, Norway: `GET /api/registry/lookup/NO/923609016` → HTTP 200,
  `EQUINOR ASA`. `GET /api/registry/search/NO?q=Equinor` → `EQUINOR ASA` now ranks
  first. `GET /api/registry/lookup/NO/12345` → HTTP 400 with a clear validation
  message (no network call made).
- Live read-only check, UK: `GET /api/registry/lookup/GB/00445790` → HTTP 200,
  `TESCO PLC`. `GET /api/registry/search/GB?q=Tesco` → `TESCO PLC` ranks first
  (Companies House's own search was already relevance-ranked).
- Full frontend workflow, driven live in a headless browser for both countries:
  selecting "Norway" and typing "Equinor", then "United Kingdom" and typing "Tesco",
  each showed the correct suggestion; clicking it populated the company/number,
  triggered the lookup with no further click, and displayed a "Company found" panel
  with organisation number, status, legal form, registered date, industry code, VAT
  registration (Norway) and address — no browser console errors, no failed network
  requests (besides the pre-existing, unrelated `favicon.ico` 404 noted in the prior
  entry).
- Confirmed via `GET /api/subcontractors` before and after all verification: `[]` —
  no subcontractor record was created, modified, or deleted at any point.
- No secrets were printed, logged, or written anywhere during this work.

### Delivery

- Commit: pending (written before commit, per rule 4).
- Pull request: pending.
- Merge: pending.
