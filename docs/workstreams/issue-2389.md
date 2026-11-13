# Issue #2389 — Retire approved-roaster directory; universal source preview
DIC_PREFLIGHT_VERIFIED development_sha=b279e75c264a19eeefcb03404466a1ca6788a855 preflight_blob_sha=2fb236bbfa6bac48513eeb3bd157b260853af06d

## Explicit owner scope
November 12, 2026: any public HTTPS coffee product URL worldwide, no approved-roaster gate; best-effort all published supported fields, flag contradictions and uncertainty, user completes blanks. Only global Verified requires separate trusted exact-source/release proof. This issue is intentionally separate from concurrent Huckleberry #2385; no Huckleberry source/test/branch edits or duplicated live acceptance.

## Independent preflight, readback and provenance
Live development b279e75c264a19eeefcb03404466a1ca6788a855, PREFLIGHT Git blob 2fb236bbfa6bac48513eeb3bd157b260853af06d. Relevant AGENTS, current Master Spec, Ledger, release queue, #33 active route, and concurrent #2385 checked. Supabase read-only: existing protected directory has 4 trusted brands/4 aliases; 8 Verified coffees and 3 verified roaster_page source records. Its five active SQL consumers are canonical alias key, match finder, pending promotion, source check target and obsolete preview target. Live legacy Supabase dic-preview-coffee Edge v6 still active, but current Add Coffee calls universal Netlify /api/coffee-preview; no current app domain-registration gate.

## Changes and safety
- Explicit any-roaster URL form helper; preserve existing extractor's source-backed suggestions/conflict/missing fields and user review; remove obsolete unrecognized-host error messages.
- Retire legacy Edge preview to a 410 no-fetch/no-JWT-forward compatibility tombstone; it no longer calls the protected registry. Do not touch modern Netlify implementation or Huckleberry changes.
- Forward-only staged SQL migration archives the four old trust entries and four aliases **without deleting them**, copies spelling aliases into a protected RLS table, replaces four current database function dependencies and drops only obsolete preview-target RPC. Source-verification host proof now uses previously independently Verified COFFEE sources, never membership in a roaster directory. A new unproven brand still gets a private Pending coffee, not an unsafe automatic global Verified.
- Existing universal/unknown-source suite + three new regression tests; all original603, private member/shot data, Auth/admission, offline/outbox, Community and checked SSL/DNS SSRF controls untouched.

## Evidence and next action
IN_PROGRESS development, NOT deployed. Local runtime has no Supabase CLI or GitHub network clone; source migration generated from exact read-only hosted function definitions and must pass hosted isolated SQL. Next: exact PR-head Node22/lint/build/browser/offline/SQL/security/approval, fix failures, then safe nonforce merge with reviewed blobs and queue/status/issue reconciliation. No production SQL, Edge, user, Netlify, backup, main or release branch writes until separate owner Publish with independently verified encrypted recovery. SKIPPED/pending is NOT PASS.
