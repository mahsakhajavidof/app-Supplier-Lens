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

- Commit: `3a90896` on branch `codex/fix-no-gb-lookup-flows` (squash-merged as
  `e7c2d35`).
- Pull request: #8, merged into `main`.
- Merge: done.

## 2026-08-07 — Replace the free-text Category field with a predefined dropdown

### Summary

- Replaced the Add-subcontractor form's Category text input + `<datalist>` (which
  didn't behave like a real dropdown — Chrome's datalist UI still lets/encourages
  free typing) with a real `<select>` of the 13 predefined categories from the
  supplied chart, in the specified order, plus "Other" as the final option.
- Selecting "Other" reveals a separate, required "Custom category" text input.
  The literal value "Other" is never saved — the reported/saved category is either
  the chosen predefined value or the trimmed custom text; an empty or
  whitespace-only custom value reports `""`, which the form's existing
  `!category.trim()` validation already blocks from being submitted (no new
  validation logic needed there).
- Switching from "Other" back to a predefined category hides and clears the
  custom input; switching back to "Other" again shows it empty, not the old value.
- This is a frontend-only change. The backend already accepts and stores any
  category string (`z.string().min(1)`, plain `text` column) and the existing
  `/subcontractors/meta/filters` endpoint already dedupes whatever's actually
  stored — both predefined and custom categories, and every pre-existing legacy
  category value (e.g. the seed data's "Electrical", "HVAC", "Groundworks", none
  of which are in the new predefined list), continue to work unchanged in the
  subcontractor list, its category filter, and (checked) reports and subcontractor
  detail pages, neither of which reference `category` at all today.
- The frontend previously fetched `/subcontractors/meta/filters` inside the
  Add-subcontractor modal purely to populate the old datalist; that query is now
  unused and was removed along with it.

### Files changed

- `frontend/src/components/CategoryField.tsx` (new) — the dropdown + conditional
  custom input, and the exported `PREDEFINED_CATEGORIES` list (the one place this
  list is defined, per the task's "define it once" guidance).
- `frontend/src/components/AddSubcontractorModal.tsx` — swapped the old
  input+datalist block for `<CategoryField onChange={setCategory} />`; removed the
  now-unused `subcontractor-filters` query. No other behavior, layout, or styling
  changed.
- `frontend/src/components/CategoryField.test.tsx` (new).
- `frontend/src/components/AddSubcontractorModal.test.tsx` (extended) — two new
  tests for submit-gating and never-saving "Other"; removed the now-unneeded
  `subcontractors.filters` mock.
- `frontend/src/pages/SubcontractorsList.test.tsx` (new) — the category-filter
  integration tests.

### Tests added (13 total)

`CategoryField.test.tsx` (7): predefined categories render in the exact required
order with "Other" last and the "Select category…" placeholder first; selecting a
predefined category reports that exact value; selecting "Other" reveals the
custom input; selecting "Other" with no text reports `""` and never `"Other"`;
typing a custom value trims whitespace before reporting it; a whitespace-only
custom value reports `""`; switching away from "Other" hides and clears the
custom input, and selecting "Other" again shows it empty.

`AddSubcontractorModal.test.tsx` (+2): choosing a predefined category enables
submit and saves that exact value; choosing "Other" keeps submit disabled until a
non-empty custom value is entered, then saves the trimmed custom value and never
the literal "Other".

`SubcontractorsList.test.tsx` (2, new file): a legacy category already in the
data (not in the predefined list) still appears in the category filter, proving
existing stored categories are unaffected; a custom category created through
"Other" appears in the category filter after creation (full mocked round trip:
create → query invalidation → filters refetch).

### Validation results

- Frontend tests (`npm test`, frontend): 17/17 passed (7 new + 2 new + 2 new + 6
  pre-existing from the prior fix, all still green).
- Frontend type check (`npm run lint`) and production build (`npm run build`):
  both passed.
- Backend tests (`npm test`, backend) and build (`npm run build`): 17/17 passed,
  build clean — unaffected, as expected for a frontend-only change.
- Live verification, driven in a headless browser against the running app:
  created one subcontractor with a predefined category (`EQUINOR ASA` /
  `923609016`, category "Bunkering") and one via "Other" with a custom value
  (`TESCO PLC` / `00445790`, typed "  Diving Support  ") — both saved with the
  exact expected category (leading/trailing whitespace trimmed, "Other" never
  saved), both appear correctly in the subcontractor list, and the category
  filter dropdown correctly now offers "Bunkering" and "Diving Support" alongside
  "All categories". No relevant console errors (one pre-existing, unrelated
  `favicon.ico` 404, and one correct `409 Conflict` from the verification script
  itself re-submitting an org number it had already created in an earlier run).
- These two records are real, intentionally-created verification data (per this
  task's own instruction to verify creation live) — no existing data was deleted
  or modified, and no delete endpoint exists to remove them again.

### Delivery

- Commit: `9f95e55` on branch `codex/category-dropdown` (squash-merged as
  `8af9ecb`).
- Pull request: #9, merged into `main`.
- Merge: done.

## 2026-08-07 — Team-member system: remove demo data, add manager-gated team management

### Summary

- Replaced the five fictional seeded team members (Marte Solberg, Jonas Vik, Ida
  Bremnes, Henrik Aune, Camilla Fossum) with exactly two real members:
  **Mohammad Khajavi** (role `Manager`) and **Linda Roed** (role `Team member`).
  No email addresses were invented — `email` was made optional in the schema
  (backend rule 3 explicitly permitted this) and both are stored with no email.
- Added a schema `active` flag on `team_members` (default `true`) so members can
  be deactivated instead of deleted, preserving historical attribution.
- Added a **manager permission model**: `backend/src/lib/permissions.ts` exports
  `requireManager`, an Express middleware that reads an acting team member id
  from the `x-team-member-id` request header, loads that member, and requires
  `active && role === "Manager"` — enforced on the server for every
  team-management and supplier-reassignment route, not just hidden in the UI.
  There is no sign-in system in this app (out of scope per the task), so this is
  explicitly a placeholder identity mechanism, not authentication; the frontend
  (`frontend/src/lib/currentUser.ts`) sends the current active manager's id for
  now, with the header read being the one place to swap in a real session's user
  id once auth exists. This was a deliberate, documented design decision — not a
  gap I missed.
- Added team-management routes (manager-only): `POST /api/settings/team` (add),
  `PATCH /api/settings/team/:id` (edit name/role, or activate/deactivate).
  Deactivating a member who still owns suppliers or has open (non-`COMPLETED`)
  tasks requires a `reassignToId` (an other, active member) — the route
  reassigns those suppliers and tasks in the same operation, then deactivates.
  Without one, it responds `409` with the exact counts, never leaving orphaned
  ownership.
- Added `PATCH /api/subcontractors/:id` (manager-only) to assign/reassign a
  supplier's internal owner — the only place in the app that could previously
  set an owner was subcontractor creation.
- Frontend: `Settings.tsx`'s Team card (`TeamSection.tsx`) now supports add,
  inline edit, and activate/deactivate-with-reassignment, reusing the existing
  toggle/badge visual patterns already used elsewhere on the page. The
  subcontractor profile's "Internal responsible" field is now an editable
  dropdown (previously read-only, and there was no other way to change an
  existing supplier's owner at all). All three owner-assignment dropdowns
  (`AddSubcontractorModal`, `TaskModal`, the profile page) now filter to
  `active` members only.
- **Data cleanup**: `backend/src/db/teamCleanup.ts` exports `REQUIRED_MEMBERS`
  (the single source of truth for "Mohammad + Linda", also imported by
  `seed.ts` so the fresh-seed and cleanup paths can never drift apart) and
  `runTeamCleanup(db)`, which upserts the two required members, then for every
  *other* team member: reassigns their subcontractors, tasks (open and
  completed — nothing is left dangling), events, and notes to Mohammad, then
  deletes them. Nothing is ever deleted except the demo member row itself — no
  supplier, task, event, note, financial-year, document, or registry snapshot
  is touched beyond re-pointing its owner/author. `backend/src/db/cleanupTeam.ts`
  is the thin runnable script (`npm run cleanup:team`); the logic is
  dependency-injected on `db` so it's independently testable without the app's
  singleton connection.
- `backend/src/index.ts` was split into `app.ts` (builds the Express app, no
  side effects) and a thin `index.ts` (migrates, then listens) so tests can
  import the real app and drive it over HTTP without starting a second server
  on the same port.

### Bugs found and fixed along the way

- **Migration 0002 (adding `active`, making `email` nullable) crashed the
  server on every startup.** SQLite can't drop a `NOT NULL` constraint
  directly, so drizzle-kit generates a warning comment instead of SQL and
  requires the standard recreate-table migration to be hand-written — which I
  did, but left drizzle-kit's original leading `/* comment */` as its own
  chunk before the first `--> statement-breakpoint`. Drizzle's migrator
  executes every breakpoint-delimited chunk as a literal statement with no
  filtering, and better-sqlite3 throws `RangeError: The supplied SQL string
  contains no statements` on a comment-only chunk. Fixed by merging the
  comment into the same chunk as the first real `ALTER TABLE` statement (as
  `--` line comments preceding it, not a standalone `/* */` block). Migration
  ran successfully afterward on both a disposable copy and the real `dev.db`.
  This bug was latent from the moment the migration was generated; because
  `runMigrations()` only re-runs when the backend process restarts, and the
  local backend hadn't been restarted since, it went unnoticed until this
  task's verification step deliberately restarted it.
- **`better-sqlite3`'s native binary was destroyed by an errant `npm rebuild`.**
  While investigating an ABI mismatch (this machine's `node` on PATH is v24,
  but the project's `node_modules` were built against the v22 the long-running
  dev servers actually run under, and there is no C++ toolchain installed to
  rebuild for v24), an `npm rebuild better-sqlite3` under v24 deleted the
  working v22 binary before failing (no Visual Studio found) — taking the live
  backend down. Recovered by finding the original prebuilt binary already
  cached at `%LOCALAPPDATA%\npm-cache\_prebuilds\` and extracting it back into
  `node_modules/better-sqlite3/{build/Release,lib/binding/node-v127-win32-x64}`
  directly, with no rebuild needed. No source file was affected by this
  incident; noted here only because rule 4 asks for every command and decision
  to be on record, and because it's the reason backend test/build commands in
  this session run via a copy of Node v22 rather than the v24 on PATH.

### Files changed

- `backend/src/db/schema.ts` — `teamMembers.active`, nullable `email`.
- `backend/drizzle/0002_harsh_natasha_romanoff.sql`, `backend/drizzle/meta/0002_snapshot.json`,
  `backend/drizzle/meta/_journal.json` — the migration (see bug note above).
- `backend/src/lib/permissions.ts` (new) — `requireManager`, `isManagerRole`.
- `backend/src/routes/settings.ts` — `active` in `GET /team`; new `POST /team`,
  `PATCH /team/:id`.
- `backend/src/routes/subcontractors.ts` — new `PATCH /:id` (owner reassignment).
- `backend/src/routes/subcontractorSchemas.ts` (new) — zod schemas extracted
  from `subcontractors.ts` to keep it under the 250-line limit after the new route.
- `backend/src/db/teamCleanup.ts` (new) — `REQUIRED_MEMBERS`, `upsertRequiredMembers`,
  `runTeamCleanup` (dependency-injected on `db`).
- `backend/src/db/cleanupTeam.ts` (rewritten) — thin script wrapper, now
  `npm run cleanup:team`.
- `backend/src/db/seed.ts` — seeds only `REQUIRED_MEMBERS`; every demo
  subcontractor/event/task/note owner reference remapped from the five old
  fictional names to Mohammad/Linda (same relative distribution, e.g. Marte
  Solberg → Mohammad Khajavi, Jonas Vik → Linda Roed).
- `backend/src/app.ts` (new) / `backend/src/index.ts` (thinned) — app/server split.
- `backend/package.json` — added `cleanup:team` script.
- `frontend/src/components/TeamSection.tsx` (new) — the Team card's management UI.
- `frontend/src/lib/currentUser.ts` (new) — `useActingManagerId` placeholder.
- `frontend/src/lib/api.ts` — fixed a header-merging bug in `request()` (a
  custom `headers` object previously replaced the default `Content-Type`
  entirely instead of merging with it — latent until this change's manager-only
  calls became the first callers to pass custom headers); added
  `addTeamMember`, `updateTeamMember`, `subcontractors.updateOwner`.
- `frontend/src/types.ts` — `TeamMember.active`, `email` now nullable.
- `frontend/src/pages/Settings.tsx` — renders `TeamSection` instead of a
  read-only list.
- `frontend/src/pages/SubcontractorProfile.tsx` — "Internal responsible" is now
  an editable dropdown.
- `frontend/src/components/AddSubcontractorModal.tsx`, `frontend/src/components/TaskModal.tsx`
  — "Assigned employee" dropdowns filter to active members only.
- Tests (see below): `backend/src/db/teamCleanup.test.ts`,
  `backend/src/routes/teamManagement.test.ts`,
  `frontend/src/components/TeamSection.test.tsx`, plus additions to
  `frontend/src/components/AddSubcontractorModal.test.tsx`.
- `backend/package.json` test script glob extended to `src/db/*.test.ts` and
  `src/routes/*.test.ts` (previously only `src/services/registryProviders/*.test.ts`).

### Tests added (12 new, all passing)

Backend — `teamCleanup.test.ts` (4, isolated throwaway SQLite files, no
singleton): `REQUIRED_MEMBERS` is exactly Mohammad (Manager)/Linda (Team
member); a fresh database ends up with exactly those two and nothing removed;
a demo member's supplier/tasks(open+completed)/events/notes are all reassigned
to Mohammad with zero orphaned references and the supplier itself preserved;
running cleanup twice is a no-op the second time with no duplicates.

Backend — `teamManagement.test.ts` (4, real Express app over real HTTP on an
ephemeral loopback port, throwaway database): a non-manager is rejected (403)
adding a member, a manager succeeds; same for editing a member; deactivating a
member with assignments is blocked (409) without `reassignToId`, then succeeds
and moves ownership when one is given; a non-manager is rejected reassigning a
supplier's owner, a manager succeeds.

Frontend — `TeamSection.test.tsx` (4): adding a member calls the API with
trimmed values and the acting manager's id; editing saves the new name/role;
activating an inactive member calls the API directly with no picker;
deactivating shows only *other active* members as reassignment targets and
requires picking one before confirming.

Frontend — `AddSubcontractorModal.test.tsx` (+1): the "Assigned employee"
dropdown lists only active team members.

### Validation results

- Backend tests: 25/25 passed (17 pre-existing registry tests unaffected + 8 new).
- Backend TypeScript build: passed.
- Frontend tests: 22/22 passed (17 pre-existing + 5 new: 4 `TeamSection` + 1 active-filter).
- Frontend type check and production build: passed.
- Cleanup script tested against a disposable copy of `dev.db` first (per the
  task's explicit instruction): removed the same 5 demo members, reassigned
  correctly, zero orphaned references, 0 subcontractors lost. Then run against
  the real `dev.db`: same result — team is now exactly Mohammad Khajavi
  (Manager) and Linda Roed (Team member), confirmed via `GET
  /api/settings/team`; re-run a second time immediately after removed 0
  members (idempotent). The two subcontractor records already in `dev.db` from
  earlier verification work (`TESCO PLC`, `EQUINOR ASA`) were untouched by
  cleanup — neither had an owner, so there was nothing to reassign — and both
  are still present with their data intact.
- Fresh-seed path verified separately against a disposable database (never the
  real `dev.db`, since seeding deletes existing data): `npm run seed` produced
  exactly the 2 required members and correctly attributed all 10 demo
  subcontractors' ownership between them.
- No `.env`, secrets, or unrelated files were committed; `*.db`/`*.db-wal`/`*.db-shm`
  remain gitignored, and the temporary verification scripts and disposable
  database files used above were deleted after use, not committed.

### Delivery

- Commit: `9c74bbc` on branch `codex/team-member-cleanup` (squash-merged as
  `00bba47`).
- Pull request: #10, merged into `main`.
- Merge: done.

## 2026-08-07 — Follow-up: remove a hardcoded demo name missed in the sidebar

### Summary

- The final combined live verification (driven in a headless browser, after
  PR #10 was already merged) caught a hardcoded `"Marte Solberg"` / `"MS"` in
  `Sidebar.tsx`'s bottom-left "current user" widget — a static placeholder from
  the original design mockup, entirely disconnected from the `team_members`
  table, that the earlier grep-based sweep for demo names missed because it
  only checked backend and non-component frontend files closely; this one
  slipped through. Grepped the full frontend and backend source for all five
  removed names afterward and confirmed this was the only remaining
  occurrence.
- Fixed by wiring the widget to the real active manager (via the existing
  `["team"]` query, same data already used elsewhere), consistent with this
  feature's "acting manager" placeholder model
  (`frontend/src/lib/currentUser.ts`) — it now shows whoever is actually the
  active `Manager`, with a plain "Unassigned" fallback if there isn't one,
  instead of a fixed name. The unrelated fictional tenant/company name
  ("Nordbygg Entreprenør AS") shown next to it was left untouched — that's the
  app's client-organization branding, not a team member, and out of this
  task's scope.
- Also removed `"Verify Person"`, a team member I created and then deactivated
  during this same live-verification pass to confirm the add/deactivate flow
  end-to-end. It had zero assigned suppliers or tasks, so deleting it directly
  was safe and left no orphaned references — done so the real team list
  matches the acceptance criteria exactly (only Mohammad Khajavi and Linda
  Roed), rather than leaving my own test artifact sitting there deactivated.

### Files changed

- `frontend/src/components/Sidebar.tsx` — current-user widget now reads the
  active manager from the team list instead of a hardcoded name.
- `frontend/src/components/Sidebar.test.tsx` (new).

### Tests added (2)

Shows the active manager's real name/initials and never the old hardcoded
name; falls back to a plain "Unassigned" state (not a demo name) when no
active manager exists in the data.

### Validation results

- Frontend tests: 24/24 passed (22 previous + 2 new).
- Frontend type check and production build: passed.
- Backend unaffected (no backend files touched) — not re-run for this change.
- Live re-verification: headless-browser check of the Settings page's full
  text confirmed zero occurrences of any of the five removed demo names
  anywhere in the rendered app after this fix (there was exactly one, in the
  sidebar, before it).
- `GET /api/settings/team` against the real `dev.db` after removing the
  `Verify Person` test artifact: exactly `Mohammad Khajavi` (Manager, active)
  and `Linda Roed` (Team member, active) — nothing else.

### Delivery

- Commit: `cfffffe` on branch `codex/fix-sidebar-demo-name` (squash-merged as
  `cd3e87a`).
- Pull request: #11, merged into `main`.
- Merge: done.

## 2026-08-07 — Add Denmark as a supported country (APICVR + CompanyData.dk)

### Summary

- Added Denmark alongside Norway/UK using two providers: **APICVR**
  (apicvr.dk) — free, keyless, no signup — for company search, basic profile
  lookup, and exact CVR (8-digit organisation number) lookup; and
  **CompanyData.dk** — Bearer-token, key optional, added later by the user —
  for financial/ownership/management enrichment, isolated to
  `companyData.ts`/`companyDataMapper.ts` and clearly labeled as a best-effort
  implementation of a documented-but-unverifiable (no key available to build
  against) REST convention, correctable in those two files alone once a real
  key is available.
- CVR validation is exact 8 digits, normalized from spaces/formatting;
  APICVR's numeric `vat` field silently drops leading zeros, so the CVR is
  reconstructed via zero-padding on every read. A well-formed-but-nonexistent
  CVR returns HTTP 200 with `{"error":"NOT_FOUND"}`, not a 404 — handled by
  inspecting the body, not just the status, at every call site.
- Every APICVR/CompanyData failure mode is distinguished and never silently
  turned into an empty result: invalid CVR format (400, no network call),
  no match (404), provider outage (502), missing CompanyData key (400),
  401/403 (key rejected, key value never logged/returned), 404 (no
  CompanyData record), 429 (surfaces `Retry-After`, no automatic retry loop),
  and network failure (500, message surfaced).
- Snapshots are tagged per `(subcontractor, provider, dataType)` — APICVR's
  basic profile and CompanyData's financials/ownership/management are stored
  as separate, independently-comparable, UTC-timestamped rows with a
  normalized payload, the raw provider response, and a SHA-256 hash. Failed
  attempts are recorded in a new `registry_check_log` table, never as a
  snapshot. The first snapshot of any kind never generates a change event
  (baseline only); an unchanged repeat never creates a duplicate event.
- Weekly monitoring runs as a plain in-process `setInterval` (hourly sweep,
  immediate catch-up run on startup) over active (`subcontractors.active`),
  due (`nextCheckAt`) Danish suppliers only, with overlap guards so a sweep
  already in progress is a no-op and one supplier's failure never blocks
  another's check. Manual "Sync with Danish registry" reuses the exact same
  `checkDanishSupplier()` routine.
- Added `GET /api/settings/companydata-status` — a safe status endpoint
  returning exactly `{ country, basicLookupConfigured, financialEnrichmentConfigured }`,
  never inspecting or exposing the key's value.
- Frontend: added Denmark to the country dropdown and to `RegistryLookupSummary`'s
  displayed fields (added `Employees` and `Contact phone` rows, both already
  returned by every provider's normalized record but not previously
  displayed for any country).
- **Bug found and fixed during live verification**: APICVR's name-search
  endpoint doesn't rank by relevance — searching "Novo Nordisk" buried the
  actual pharmaceutical company (CVR 24256790, 27,975 employees) at position
  27 of 30 results under unrelated clubs/foundations sharing the name (e.g.
  "Novo Nordisk Kunstforening"), so it never appeared in the app's
  8-result suggestion list. Fixed the same way Norway's identical ranking bug
  was fixed earlier in this project: fetch a larger page (`limit=50`) and
  rank exact/prefix matches first before truncating to 8.
- **Bug found and fixed while testing**: `companyDataUsage.recordCompanyDataCall()`
  did a separate read-then-write, which raced when financials/ownership/management
  enrichment call it concurrently (`Promise.all` in `denmarkEnrichment.ts`) —
  the first CompanyData call of a new calendar month could hit a UNIQUE
  constraint violation on `month`, silently absorbed by the enrichment
  pipeline's per-data-type error handling as if CompanyData itself had
  failed. Fixed with a single atomic `insert().onConflictDoUpdate()` upsert.
- **Bug found and fixed while testing**: `registrySnapshotStore.getLatestSnapshot()`
  ordered only by `fetchedAt`, which is second-resolution (SQLite's
  `unixepoch()`) — two snapshots saved within the same second tied, and the
  "latest" one returned was non-deterministic. Fixed by breaking ties on the
  table's insertion-order `rowid`.
- Attempted to split `db/schema.ts` (now 280 lines) into smaller modules per
  the file-size rule, but reverted: this project's `.js`-suffixed
  NodeNext-style relative imports aren't resolved by drizzle-kit 0.24.2's
  schema loader across separate files (confirmed — `drizzle-kit generate`
  fails with `MODULE_NOT_FOUND` on any such split), and the only real fix is
  a multi-minor-version drizzle-kit upgrade, which is a larger, unrelated,
  riskier change than a modest line-count overage on a flat, untangled list
  of table declarations. Documented the reasoning directly in `schema.ts`.

### Files changed

- New: `backend/src/services/registryProviders/denmark.ts`,
  `denmarkMapper.ts` — APICVR provider (lookup/search/CVR validation) and its
  response mapper.
- New: `backend/src/services/companyData.ts`, `companyDataMapper.ts`,
  `companyDataUsage.ts` — CompanyData.dk client, response mappers, and local
  monthly call-count tracking (500/month Basic-plan quota).
- New: `backend/src/services/registrySnapshotStore.ts` — shared
  snapshot/check-log read/write helpers (`hashOf`, `getLatestSnapshot`,
  `saveSnapshot`, `logCheckResult`).
- New: `backend/src/services/denmarkEnrichment.ts` — CompanyData
  fetch→snapshot→apply→diff→event pipeline, one data type at a time,
  fully error-isolated per data type.
- New: `backend/src/services/denmarkMonitoring.ts` — `checkDanishSupplier()`,
  the one shared Danish-check routine for manual sync and weekly monitoring.
- New: `backend/src/services/denmarkScheduler.ts` — hourly in-process sweep
  with startup catch-up and overlap guards.
- Modified: `backend/src/db/schema.ts` — added `active`,
  `lastCheckAttemptedAt`, `nextCheckAt` to `subcontractors`; added
  `provider`/`dataType`/`hash` to `registrySnapshots` (all nullable —
  NO/GB unaffected); new `registry_check_log` and `companydata_usage` tables.
- New migration: `backend/drizzle/0003_past_spencer_smythe.sql` (additive
  only — new columns/tables, no data loss, applied to the real `dev.db`).
- Modified: `backend/src/services/registryProviders/index.ts` — registered
  `denmarkProvider`; `diffSnapshots()` gained an optional `extraFields`
  parameter (default `[]`, so NO/GB/UK are unaffected) so Denmark can also
  watch legal form and registration date.
- Modified: `backend/src/services/registryPersistence.ts` — added
  `persistInitialRegistryData()` (Denmark-specific create-time snapshot
  tagging + enrichment + next-check scheduling) and `syncGenericRegistry()`
  (the pre-existing NO/GB sync body, moved verbatim to keep
  `subcontractors.ts` under the line limit).
- Modified: `backend/src/routes/subcontractors.ts` — create/sync routes
  branch to the Danish path; NO/GB paths unchanged.
- Modified: `backend/src/routes/settings.ts` — added
  `GET /api/settings/companydata-status`.
- Modified: `backend/src/index.ts` — starts the Denmark scheduler after
  `app.listen()`.
- Modified: `backend/.env.example` — added `COMPANYDATA_DK_API_KEY=`
  placeholder (real key goes only in the untracked `backend/.env`, never
  committed).
- Modified: `backend/package.json` — test script now also picks up
  `src/services/*.test.ts` (previously only its `registryProviders`
  subdirectory).
- Modified: `frontend/src/types.ts` — added `contactPhone?: string` to
  `RegistryLookupResult` (already returned by every provider, not previously
  typed).
- Modified: `frontend/src/components/RegistryCompanySearch.tsx` — added
  Denmark to `COUNTRY_NAMES`.
- Modified: `frontend/src/components/RegistryLookupSummary.tsx` — added
  "Employees" and "Contact phone" rows.

### Tests added

Backend — `registryProviders/denmark.test.ts` (14): CVR validation; leading
zero preserved through the numeric `vat` round-trip; phone withheld when
`protected: true` and shown otherwise; CVR-format rejected before any network
call; APICVR's HTTP-200-with-error-body treated as not-found; outage (5xx)
distinguished from not-found; network failure propagated; partial numeric
query never sent to name search; exact 8-digit query resolved via lookup, not
name search; empty result for a nonexistent exact CVR; Danish characters
passed through untouched; **relevance ranking regression test** (the company
the query names ranks above unrelated same-name clubs/foundations); outage
distinguished from no-match on search; network failure propagated on search.

Backend — `companyDataUsage.test.ts` (3): fresh month has zero calls;
`recordCompanyDataCall` increments; `nearingQuota` flips at 90% of quota.

Backend — `companyData.test.ts` (8): safe status shape with/without a key,
key value never present in the JSON; missing key throws 400 with zero network
calls; 401/403 never leak the key; 404 distinguished from a rejected key; 429
surfaces `Retry-After` with no retry loop; network failure reported
distinctly; a successful call is counted against the quota; a successful call
returns both normalized data and untouched raw response.

Backend — `registrySnapshotStore.test.ts` (5): `hashOf` determinism;
untagged (NO/GB-style) snapshot round-trip; tagged snapshots for the same
supplier never collide with each other or an untagged one; `saveSnapshot`'s
returned hash matches; `logCheckResult` never creates a snapshot row.

Backend — `denmarkEnrichment.test.ts` (5): unconfigured key is a no-op with
zero network calls; first-ever enrichment applies data with no events
(baseline); a real change produces exactly one event per changed data type;
an unchanged repeat produces no duplicate events; one data type failing never
blocks the other two.

Backend — `denmarkMonitoring.test.ts` (5): a successful check stamps
attempted/checked/next-check timestamps (~7 days out); Denmark's extra
watched fields (legal form, registration date) detect a change; an unchanged
repeat produces no duplicate events; an APICVR failure is logged and thrown,
never swallowed; checking a nonexistent subcontractor throws 404.

Backend — `denmarkScheduler.test.ts` (3): only active, due, Danish suppliers
are checked (inactive/not-due/wrong-country all skipped); an overlapping
call is a no-op, never a duplicate check; one supplier's failure doesn't
block another's check in the same sweep.

Frontend — `AddSubcontractorModal.denmark.test.tsx` (5): Denmark listed by
name in the country dropdown; selecting Denmark searches the Danish registry;
picking a suggestion fills in the CVR and auto-triggers the lookup; the
confirmation panel shows employee count and contact phone; a genuine registry
outage is shown as an error, never as an empty result.

### Validation results

- Backend tests: 68/68 passed (26 pre-existing NO/UK/team tests unaffected +
  42 new).
- Backend TypeScript build (`tsc`) and production build: passed.
- Frontend tests: 29/29 passed (24 pre-existing + 5 new).
- Frontend TypeScript build and production build (`vite build`): passed.
- `drizzle-kit generate` against the current schema: "No schema changes,
  nothing to migrate" (confirms the schema.ts revert introduced no drift).
- Migration `0003_past_spencer_smythe.sql` applied cleanly to the real local
  `dev.db` (additive only).
- Live APICVR verification (both direct API calls and driven through the
  actual running frontend in a headless browser): searched "Novo Nordisk" via
  `GET /api/registry/search/DK`, selected the correct top-ranked result
  (NOVO NORDISK A/S, CVR 24256790), which auto-triggered
  `GET /api/registry/lookup/DK/24256790` and correctly displayed "Company
  found: NOVO NORDISK A/S" with Employees: 27975 and Contact phone: 44448888.
- `GET /api/settings/companydata-status` confirmed live:
  `{"country":"DK","basicLookupConfigured":true,"financialEnrichmentConfigured":false}`
  — Denmark's basic search/lookup work fully without a CompanyData key;
  financial/ownership/management enrichment correctly reports as awaiting
  configuration, not as Denmark being unavailable.
- Estimated CompanyData.dk call usage once a key is added: 3 calls per
  Danish supplier per check (financials + ownership + management) — 1 call
  at creation, then 1 more per weekly monitoring cycle per active Danish
  supplier. At the 500/month Basic-plan quota, that comfortably supports
  roughly 35–40 actively-monitored Danish suppliers checked weekly, tracked
  locally via `companydata_usage` with a warning at 90% (450 calls/month).
- Test subcontractor (`NOVO NORDISK A/S`, CVR 24256790, id
  `bb08cfa1-f29a-4e76-9aba-d29aa8467afe`) created during manual verification
  was removed from the real `dev.db` via a one-off script, deleted
  immediately after use (never committed); the pre-existing `TESCO PLC` and
  `EQUINOR ASA` records were untouched.
- No `.env`, secrets, `dev.db`, or temporary test databases were committed;
  `backend/package.json`'s test glob was the only non-source change needed
  to make the new backend tests run under `npm test`.

### Next steps for the user

- To activate CompanyData.dk financial/ownership/management enrichment, add
  your key to `backend/.env` (not `.env.example`) as
  `COMPANYDATA_DK_API_KEY=<your key>`, then restart the backend — no code
  changes needed. Denmark's company search/lookup already work fully without
  it. Please don't paste the key into chat.

### Delivery

- Commit: `7caee10` on branch `codex/denmark-registry-integration` (squash-merged as
  `79afbdc`).
- Pull request: #12, merged into `main`.
- Merge: done.

## 2026-08-07 — Explainable financial-risk assessment and negotiation guidance

### Summary

- Confirmed the "complete baseline company profile" requirement was already
  met: `GET /api/subcontractors/:id` already returns identity, financials,
  people, ownership, events, tasks, notes and documents immediately after
  creation for every country (populated from the registry lookup at create
  time), never waiting for a change event. Added the two genuinely missing
  display pieces — monitoring status (active/inactive, last checked, next
  scheduled check) and a procurement overview (category, internal
  responsible) — to the existing Overview tab, reusing fields already on the
  `subcontractors` row.
- Added a deterministic financial-metrics engine
  (`riskAssessment/financialMetrics.ts`): revenue growth, operating margin,
  result-before-tax margin, headcount change, and an implied-leverage ratio
  derived from the already-reported equity ratio. Every metric returns
  `calculable: false` with a plain-language reason instead of guessing —
  never divides by zero, never compares two periods reported in different
  currencies, and is explicitly typed `calculatedBySupplierLens: true` so it
  can never be confused with a raw reported figure in the API response
  itself.
- Added a risk-indicator engine (`riskAssessment/indicators.ts` +
  `indicatorsQualitative.ts`) evaluating 10 indicators — liquidity, equity
  position, revenue trend, leverage, headcount trend, repeated losses,
  accounts recency, ownership/management/auditor changes (read from existing
  monitoring events), customer/revenue dependency, and strong financial
  performance — each returning status (Positive/Neutral/Attention/High
  attention), observed value, comparison period, why it matters, source,
  retrieval date, and the exact rule applied. All thresholds live in one file
  (`riskAssessment/thresholds.ts`). Missing data always produces an explicit
  "information gap" (`isInformationGap: true`), never treated as evidence of
  weakness — `dependency_risk` is always an information gap, since no
  connected data source reports customer concentration. Never uses
  CompanyData's proprietary score or any invented credit score — every
  status comes from Supplier Lens's own documented thresholds applied to
  reported or calculated figures.
- Added a deterministic negotiation/due-diligence guidance generator
  (`riskAssessment/negotiationGuidance.ts`): template-based (no external AI
  call, no API key), one suggestion per Attention/High-attention/Positive
  indicator plus surfaced information gaps, every suggestion phrased as
  something to ask/discuss/request and always carrying an `evidenceSummary`
  tying it back to the specific indicator. States "No meaningful issue was
  identified" explicitly when nothing warrants a suggestion.
- Added a deterministic negotiation-brief generator
  (`riskAssessment/negotiationBrief.ts`) assembling the same indicators and
  guidance into a markdown document, plus
  `GET /api/subcontractors/:id/risk-assessment/brief`.
- Added append-only decision tracking (`riskIndicatorDecisions.ts` +
  `risk_indicator_decisions` table): Not reviewed/Accepted/Not
  relevant/Resolved, with an optional note that becomes **required** when
  dismissing ("Not relevant") an indicator that is currently Attention or
  High attention — enforced server-side in the route, not just the UI.
  Changing a decision inserts a new row rather than overwriting, so history
  is never lost; the most recent row per (supplier, indicator) is the
  "current" decision.
- Added a "Convert to task" workflow: creates a real follow-up task (the
  same `tasks` table and follow-up workflow used everywhere else) with a new
  nullable `source_indicator_key` column linking it back to the indicator
  that generated it, pre-filled with that indicator's own evidence text.
- New frontend "Risk assessment" tab on the subcontractor profile page:
  calculated metrics (explicitly labeled, separate from reported figures),
  one card per indicator with every required field plus inline decision
  controls and a "Convert to task" button, a negotiation-guidance list, and
  a "Generate negotiation brief" viewer with a download-as-.md option.
  Explicitly labeled "Not an official rating. Not an automatic accept/reject
  decision." in the UI itself.
- Attempted to split `db/schema.ts` further (now 325 lines, needed to add the
  new table); per the same drizzle-kit 0.24.2 loader limitation documented
  during the Denmark work (confirmed again, and the user explicitly chose to
  keep the file as one file rather than upgrade the dependency), it stays a
  single file.

### Files changed

- New: `backend/src/services/riskAssessment/financialMetrics.ts`,
  `thresholds.ts`, `indicatorTypes.ts`, `indicators.ts`,
  `indicatorsQualitative.ts`, `negotiationGuidance.ts`,
  `negotiationBrief.ts`, `assemble.ts` — the full deterministic engine.
- New: `backend/src/services/riskIndicatorDecisions.ts` — append-only
  decision persistence.
- New: `backend/src/routes/riskAssessment.ts` — `GET .../risk-assessment`,
  `GET .../risk-assessment/brief`,
  `POST .../risk-assessment/indicators/:key/decision`,
  `POST .../risk-assessment/indicators/:key/convert-to-task`.
- Modified: `backend/src/db/schema.ts` — new `risk_indicator_decisions`
  table; new nullable `tasks.source_indicator_key` column.
- New migration: `backend/drizzle/0004_light_talisman.sql` (additive only).
- Modified: `backend/src/app.ts` — mounted the new router.
- Modified: `backend/src/lib/labels.ts` — added `RISK_DECISION_LABELS` and
  `serializeDecision`, following the existing label-mapping pattern.
- Modified: `backend/package.json` — test script now also picks up
  `src/services/riskAssessment/*.test.ts`.
- New: `frontend/src/components/RiskIndicatorCard.tsx`,
  `NegotiationBriefModal.tsx`.
- New: `frontend/src/pages/subcontractor/RiskAssessment.tsx` — the new tab.
- Modified: `frontend/src/pages/SubcontractorProfile.tsx` — registered the
  new tab.
- Modified: `frontend/src/pages/subcontractor/Overview.tsx` — added the
  monitoring-status/procurement-overview card.
- Modified: `frontend/src/lib/api.ts` — added `riskAssessment.{get, brief,
  decide, convertToTask}`.
- Modified: `frontend/src/lib/badges.ts` — added `RISK_STATUS_CLASSES` for
  the new indicator/decision status labels, reusing the existing palette.
- Modified: `frontend/src/types.ts` — added `CalculatedMetric`,
  `RiskIndicator`, `NegotiationSuggestion`, `IndicatorDecision`,
  `RiskAssessment` types; added `lastCheckAttemptedAt`/`nextCheckAt`/`active`
  to `Subcontractor` (already returned by the API, not previously typed).

### Tests added

Backend — `financialMetrics.test.ts` (13): correct revenue-growth
calculation; not calculable with fewer than two periods; not calculable when
prior revenue is zero; not calculable on a currency change between periods;
not calculable when revenue is missing; operating margin calculation and
its zero-revenue guard; result-before-tax margin calculation; headcount
change calculation and its zero-prior-headcount guard; implied leverage
calculation and its missing-equity-ratio guard; `computeFinancialMetrics`
never throws on an empty financial history.

Backend — `indicators.test.ts` (15): liquidity High attention/Attention/
Neutral/information-gap boundaries; negative equity forces High attention;
revenue trend High attention on a sharp decline and Positive on strong
growth; leverage Attention boundary; headcount-decline Attention; repeated
losses only High attention when both of the two latest years are negative;
accounts recency Neutral vs High attention by age; governance-change
detection inside vs outside the lookback window; dependency risk is always
an information gap; strong-financials Positive only when both growth and
margin clear their thresholds.

Backend — `negotiationGuidance.test.ts` (6): guidance references its
evidence; Positive indicators are framed as opportunities; surfaced
information gaps are framed as questions; "no meaningful issue" is stated
explicitly when nothing warrants a suggestion; **guardrail sweep** — no
generated text for any indicator/status combination ever contains
accusatory, legal-conclusion, or discriminatory language; every real
suggestion carries a `basedOnIndicatorKey`.

Backend — `riskIndicatorDecisions.test.ts` (4): a decision is recorded with
its status and note; `getCurrentDecisions` returns the most recent row per
indicator, not the first; changing a decision preserves history rather than
overwriting it; decisions for different indicators never collide.

Backend — `riskAssessment.test.ts` route tests (8, real HTTP against a
throwaway database): 404 for an unknown subcontractor; a low liquidity
ratio is correctly reflected as Attention; dismissing an Attention indicator
as not relevant without a note is rejected (400); the same dismissal with a
note succeeds and is reflected on the next read, with the human-readable
label (not the raw enum); a non-dismissal decision never requires a note;
converting an indicator to a task creates a task linked via
`source_indicator_key`, pre-filled with its evidence; the negotiation brief
names the supplier and its indicators; acting on an unknown indicator key
returns 404, not a silent success.

Frontend — `RiskAssessment.test.tsx` (8): calculated metrics are labeled as
calculated by Supplier Lens; a non-calculable metric shows its reason
instead of a number; an indicator card shows its evidence and rule used,
explicitly not an official rating; negotiation guidance shows its evidence;
dismissing an Attention indicator as not relevant without a note is blocked
client-side; accepting an indicator saves without requiring a note;
converting to a task calls the API with the indicator key; generating the
negotiation brief fetches and displays the document.

### Validation results

- Backend tests: 114/114 passed (68 pre-existing + 46 new).
- Backend TypeScript build and production build: passed.
- Frontend tests: 37/37 passed (29 pre-existing + 8 new).
- Frontend TypeScript build and production build: passed.
- `drizzle-kit generate`: "No schema changes, nothing to migrate" (confirms
  no drift after the schema additions).
- Migration `0004_light_talisman.sql` applied cleanly to the real local
  `dev.db` (additive only — new table, new nullable column).
- Live verification through the actual running frontend (headless browser):
  opened EQUINOR ASA's real profile, navigated to the new Risk assessment
  tab, confirmed the calculated-metrics section, all 10 indicator cards, and
  the negotiation-guidance list rendered correctly against real
  Brønnøysundregisteret financial data (liquidity ratio 1.07 correctly
  flagged Attention; a 2-year-old filing correctly flagged accounts
  recency). No console/network errors beyond the same pre-existing, unrelated
  missing-favicon 404 already noted in the Denmark work.
- Live-verified the decision workflow via direct API calls before the UI
  test: dismissing the liquidity indicator as "Not relevant" without a note
  was correctly rejected (400), succeeded with a note, and converting the
  accounts-recency indicator to a task correctly created a task with
  `source_indicator_key` set and evidence-based comment text. Both test
  artifacts were then removed from the real `dev.db` via a one-off script
  (deleted immediately after use, never committed) — the database now holds
  only the same two pre-existing suppliers (`TESCO PLC`, `EQUINOR ASA`) as
  before this task, with no leftover decisions or tasks.
- No `.env`, secrets, `dev.db`, or temporary test databases were committed.

### Delivery

- Commit: `ee36a4a` on branch `codex/risk-assessment-negotiation-guidance`
  (squash-merged as `c3babf4`).
- Pull request: #13, merged into `main`.
- Merge: done.
