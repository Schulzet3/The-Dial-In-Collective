# Issue #2386 — Admin unlimited coffee URL previews; members retry after 15 seconds

**Owner authority:** November 12 direct request. No publication command, provider mutation or private member access authorized.

DIC_PREFLIGHT_VERIFIED development_sha=b279e75c264a19eeefcb03404466a1ca6788a855 preflight_blob_sha=2fb236bbfa6bac48513eeb3bd157b260853af06d

## Exact immutable evidence before code/test changes
- Application branch development/backend-foundation `b279e75c264a19eeefcb03404466a1ca6788a855`; PREFLIGHT.md Git blob `2fb236bbfa6bac48513eeb3bd157b260853af06d` (retrieved at same SHA).
- Live **read-only** Supabase PostgreSQL definitions: private.dic_shared_preview_claim and public.dic_preview_preflight/dic_preview_complete have 12/day and 30s; public.dic_claim_universal_preview and public.dic_url_preview_claim route through shared function; production private.dic_url_preview_attempts CHECK 0–12, original quota table preserved. No production SQL executed.
- Existing service-only trusted worker and Netlify function use the common Supabase RPCs; Netlify function has separate 12 requests/60-second per-IP safety guard which stays unchanged. Existing Auth, email verification and admission remain mandatory.
- Open #2385 Huckleberry extractor PR affects parser/server and queue, NOT this migration, UI message or new role-policy test. Coordinate before queue edit. #267/#509 audit scope distinct. No SHA-wide regression claim.

## Acceptance and implementation
- Additive proposed migration `supabase/migrations/20261113043000_dic_admin_preview_unlimited_member_15s.sql`: server-side admitted verified Admin bypass in shared legacy service claim, preflight cached/fresh and completion. Admin has NO personal quota or cooldown writes; membership revocation falls back to ordinary rules and Auth gate. Ordinary members retain 12/day, shift 30→15s across all paths; existing ticket expiry and invalid-ticket refusal retained.
- UI preview cooldown error changed to 15s; existing single-click preview client comment updated, no extra request route or token handling change.
- Scoped owner Locked supersession entered in BOTH canonical Master Specification and Decision Ledger; approval coverage inventories new owner decision and targeted Node regressions.
- Targeted regression `tests/coffee-preview-role-policy.test.mjs` covers SQL role/admission/verified-email logic, per-account bypass order, member 12/15 boundaries, ticket path, Netlify cached/fresh/denial integration and preserved global per-IP safety guard.

## Tests, risk and status at authored commit
- Risk HIGH (Auth/SQL). Exact GitHub PR-head Node22/build, SQL/Auth/RLS, security, browser/cloud and governance/approval CI REQUIRED before merging; exact merged-source evidence required before READY. No local runtime/isolated DB or real-member acceptance claimed by source alone.
- State at authoring: DEVELOPMENT SOURCE CANDIDATE / NOT READY / NOT DEPLOYED. No provider/Netlify publication, credit/purchase, member/shot/coffee data writes. Global IP throttling remains protective and may affect >12 requests/min from an IP even for Admin.
- Next: run hosted PR CI, repair failures, merge nonforce [skip netlify], verify exact merge/blob/CI and only then prepare any source READY queue receipt; a separate fresh Publish plus provider readback is required for live behavior.
