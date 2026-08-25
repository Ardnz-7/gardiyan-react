# Screens

This documents the current frontend screens as actually built (`src/pages/*.tsx`), not a pre-implementation design. It serves as the project's screen/wireframe reference in place of upfront mockups — if a screen changes, update this file to match the code rather than the other way around.

## Dashboard

**Route:** `/` (index route inside the `Layout` shell)

**Purpose:** Gives an at-a-glance overview of collection volume, source/crawl health, and the most recently collected advisories.

**Data displayed:**
- Four summary stat cards: Total Advisories, Active Sources, Completed Crawls, and Critical count (all from `GET /api/stats`).
- A severity breakdown panel (Critical/High/Medium/Low) rendered as horizontal bars scaled relative to the largest count, color-coded via `--fill-danger`/`--fill-warning`/`--fill-muted`/`--fill-success`.
- A "Recent Advisories" panel listing the 5 most recently collected advisories (client-side sorted by `collection_date` descending from `GET /api/advisories`), each showing title, CVE (or "—"), organization/source domain, and a severity badge.

**Actions:** None — this screen is read-only, no forms, filters, or buttons.

**States handled:**
- Loading: "Loading dashboard..." message in place of all panels.
- Error: error message shown (from a failed `getStats`/`getAdvisories` call) in place of all panels.
- Empty: "No advisories yet." shown inside the Recent Advisories panel specifically if the advisory list is empty (stat cards and severity breakdown still render with zero values).

## Sources

**Route:** `/sources`

**Purpose:** Lets the user view and register the crawl sources the system pulls advisories from.

**Data displayed:** A table of sources from `GET /api/sources` — Name, Base URL (or "—"), Status (enabled/disabled dot + text), Last crawl (formatted via `toLocaleString()`, or "—" if never crawled).

**Actions:**
- A form to add a new source: Name (text), Base URL (text), Request delay in ms (number, min 0, step 100), Enabled (checkbox, defaults checked). Submitting calls `POST /api/sources`, then reloads the list and resets the form.
- Submit button reads "+ Add source", disabled and shows "Saving..." while the request is in flight.

**States handled:**
- Loading: "Loading sources..." shown in place of the table.
- Error: an error banner above the table (e.g. missing name/base URL client-side validation, or a failed create/list request).
- Empty: "No sources configured yet." shown in place of the table when the list is empty.

## Crawl Jobs

**Route:** `/crawl-jobs`

**Purpose:** Lets the user trigger new crawl jobs against a source and monitor the status of past and in-progress jobs.

**Data displayed:** A list of job cards from `GET /api/crawls`, each showing source ID, job ID, a localized status label/color (queued/running/completed/failed/stopped), and either a live progress bar + pages/records/percent (while running) or a final summary line (pages visited, records extracted, error count, start/end timestamps) once finished. Also fetches `GET /api/sources` to populate the "start a crawl" source picker.

**Actions:**
- "+ Yeni tarama" button toggles a form to start a new crawl: a Source dropdown (populated from sources list) and a "Tarama başlat" submit button, which calls `POST /api/crawls` and reloads the job list.
- The job list auto-refreshes every 3 seconds via `setInterval` (calls `GET /api/crawls` on a poll, independent of the initial load).

**States handled:**
- Loading: "Yükleniyor..." shown in place of the job list on initial load.
- Error: an error banner shown if the initial jobs/sources fetch or job-creation request fails.
- Empty: "Henüz tarama yok." shown in place of the job list when there are no jobs.

## Advisories

**Route:** `/advisories`

**Purpose:** Lets the user browse and inspect individual collected advisories in a master/detail layout.

**Data displayed:**
- Left column: a searchable list of advisory cards (title + CVE/source domain) fetched via `GET /api/advisories` (no query params sent — the full default page is loaded, then filtered/searched client-side).
- Right column: full detail of the selected advisory — title, severity badge (color-coded critical/high/medium/low/unknown), CVE, source domain, publication date, collection date, organization, product, summary, and an external link to the original source URL (if present).

**Actions:**
- A search input that filters the left-column list client-side by matching the query against title, CVE, and product (case-insensitive substring).
- Clicking a card in the list selects it and updates the right-column detail view.

**States handled:**
- Loading: "Yükleniyor..." shown in the left column in place of the list.
- Error: an error message shown in the left column in place of the list (from a failed `getAdvisories` call).
- Empty: "Henüz güvenlik uyarısı bulunmuyor." shown in the left column if there are no (filtered) advisories; "Seçili bir güvenlik uyarısı yok." shown in the right column if nothing is selected.

## Logs

**Route:** `/logs`

**Purpose:** Lets the user view a stream of crawl log entries and filter them by severity level.

**Data displayed:** A stream of log rows from `GET /api/logs` (fetched once, no query params — filtering is client-side), each showing timestamp (via `toLocaleString()`), log level, source module, and message. Row background/text color varies by level (info/warn/error).

**Actions:** A level filter dropdown ("Tüm seviyeler" / Error / Warning / Info) that filters the already-loaded log list client-side by `log_level`.

**States handled:**
- Loading: "Yükleniyor..." shown in place of the log stream.
- Error: an error banner shown above the stream if the `getLogs` call fails.
- Empty: "Henüz log kaydı yok." shown in place of the stream when there are no (filtered) logs.
