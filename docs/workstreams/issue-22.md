# Issue #22 — Offline synchronization, concurrent edits and account isolation

**Owner authorization, 2026-10-28:** Test scenarios 1–6 fully, repair defects, and close only with substantive automated evidence. No publication or member-data mutation.

**Existing reused evidence:** Owner iPhone offline cold-open, one shot queued, reconnection and independent one-record database readback (original #21). Node queue tests already cover owner-bound operations, idempotency, conflict retention, local sign-out and session races. The built PWA Chromium offline suite covers cold reload, new shot, owner change and expired SDK session. Disposable signed-JWT PostgREST checks cover server ownership, stale revisions and rejection.

**New risk identified:** Following a fresh server-access denial, `denyAccess` removed private UI and attempted IndexedDB cache deletion, but if that deletion failed, only an **in-memory** denied-owner set blocked offline reopening. Full browser restart lost that set and could expose a stale private cache if locally held credentials had not expired. Repair with a non-secret per-owner localStorage denial marker set synchronously and cleared only after fresh server admission, without discarding queued events or receipts. Test cross-reload failure and recovery. This protection relies on at least one browser storage mechanism working; total storage failure cannot guarantee retention or deletion.

**Scenario matrix for exact-source tests:** (1) two tabs stale revision/one winner; (2) offline stale edit holds while independent new shot proceeds; (3) signout and cross-owner delayed operations; (4) expired/refreshing credential rejection and recovery; (5) IndexedDB failure/eviction and pending outbox through a PWA update; (6) lost acknowledgement, idempotent replay, and denial/cache-deletion failure after browser reload. All tests are isolated/synthetic except the previously accepted #21 real-owner evidence; no new actual device or production member writes asserted.

**Status:** TESTING; execute CI and isolated SQL/PostgREST, reconcile evidence, and close conditionally. No deployment, paid service or migration.
