# Comprehensive Pre-Release Source Audit — 2026-10-16

## Status and limits
Review branch: `work/visual-refresh-20261015`. **No Netlify deployment, live Supabase migration, production data edit, account admission, SSO removal, or backup deletion is authorized or performed in this audit.** The review is not a security certification or claim that every possible runtime path has been exercised. The canonical Master Specification and Decision Ledger control; preserve all Locked decisions.

This report distinguishes: observed code/test facts, safe branch-only corrections, and release gates requiring real cross-account/hosted tests. The audit surveys **the complete repository tree**, while automated static/lint/graph/syntax checks run against the checked-in code; complex flows receive source and regression-test inspection rather than a claim of mathematical proof from line-by-line reading.

## Inventory and staged protections
- 141 repository tree entries at audit start. App runtime under `site/`, independent SQL migrations/tests under `supabase/`, Edge source preview and verifier, scripts, GitHub Actions, docs, and Node/browser suites.
- The build uses an explicit asset allowlist (`build_cloud.mjs`). `scripts/audit/site-integrity.mjs` validates transitive JavaScript imports, linked resources and the generated release package, failing on missing modules, orphaned shipped assets, and forbidden prototype recovery import UI.
- `eslint.config.mjs` enforces undefined variables, unreachable/duplicate code, unsafe optional chains, and unused-variable warnings. `.github/workflows/visual-review.yml` runs `npm test`, ESLint, the production asset build and integrity validator, plus offline synthetic cloud workflow and Light/Dark mobile browser checks.
- Only the cloud app's `main.js` entry is shipped. `cloud/import-entry.js`, importer UI/adapters and import styles remain in source for historical recovery but are **not** shipped to ordinary browsers; server import control remains closed. Deleting these as “unused” would violate Locked recovery decisions.
- The older `dic_cloud_owner_test_v1` IndexedDB identifier is **in use** and must remain byte-for-byte unchanged until a tested, explicit, lossless local migration exists. A silent rename can orphan queued offline changes.
- Browser UI visual design uses owner-approved flat badges, warm theme, compact actions, meaningful recommendation panels, and no text shadows. Dose retains `Basket-based`; Temperature retains its calculated value but has **no redundant `Recommendation` subcaption**.

## Changes in this audit
1. **Netlify build admission:** `scripts/netlify/should-ignore-build.mjs` now skips `deploy-preview` and `branch-deploy` contexts, in addition to enforcing existing owner-marked production release and Netlify credit conditions. Guard regression tests explicitly cover both contexts. This is source-level defense in depth; an administrator-triggered manual publish or changed service setting must separately be controlled in Netlify.
2. **Offline storage resilience:** `IndexedStore.db()` no longer permanently caches transient IndexedDB open failures and surfaces blocked storage rather than leaving the caller hanging. `transaction()` now rejects callback exceptions and safely aborts the transaction. Keep its persistent database name and schema version unchanged. Tests simulate opening failure, blocked opening, callback exception and preservation of the stored database name.
3. **User-facing export name:** The pending-changes emergency download is no longer misleadingly named `Cloud_Test`. The contents, recovery safeguards, queued state and restore semantics remain untouched.
4. **Final caption decision:** Canonical specification/ledger amended to leave `Basket-based` exactly capitalized and remove Temperature's `Recommendation` caption, without weakening the recommendation engine.
5. **Conservative cleanup:** Avoid deletion of archived import logic, potentially future-used indexes, legacy persisted database identifiers, independent migration/audit records, or all historical test fixtures. Such deletion would be speculative without runtime usage proof.

## Database and deployment advisory observations (live read-only)
- Supabase security linter: **one warning** that leaked-password protection is disabled. This is an Auth configuration item, **not** evidence that application passwords were exposed; recommend turning it on before public beta after checking service plan support. Official guidance: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection
- Supabase security linter: **four informational** private tables with RLS enabled but no select/insert/update/delete policies. They are intentionally deny-by-default and have explicit role revocations; not a reason to grant broader access merely to silence a linter. Guidance: https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy
- Supabase performance linter: **six informational unindexed foreign keys**. Review query plans and realistic growth before creating indexes; not an urgent beta regression on tiny tables. Guidance: https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys
- Supabase performance linter: **14 unused indexes**. This does not establish orphan code: usage counters can be low/zero at small data sizes and indexes protect future operations. Do not drop automatically. Guidance: https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index
- Live Supabase migration catalog currently records the 20 backend migrations up to `20261014222802` (plus one admin version naming difference). The `20261016053000` URL-first matching migration is **staged only**.
- Live Edge Functions list `dic-verify-coffee` with JWT verification enabled. The new `dic-preview-coffee` function is **staged only**. Therefore the beautiful URL preview is a synthetic screenshot/test result, not yet proof of compatibility with real roaster pages or all official domains.

## Critical end-to-end sequences reviewed
1. **Auth and admission:** authenticated identity, email verification/invitation, Supabase RLS and server-side account check. Do not equate the Netlify login removal with permission to read personal data.
2. **Coffee identity:** recognized official URL evidence, release/lot compatibility and duplicate candidate review; canonical Coffee UUID must not be a mutable URL or name. Distinct harvests cannot silently share the same ID. Staged metadata preview cannot publish/verify on its own.
3. **Personal logging:** measured dose/yield/time/grind, optional temperature, the five sensory ratings, immutable equipment snapshots, offline queued writes, owner-bound mutation IDs and cloud replay.
4. **Recommendations:** exact successful personal evidence outranks similar coffees or generic priors. Unproven grind guidance may show a narrow starting band; proven or post-taste correction remains precise. A preview/test is not proof that the unfinished community aggregation tiers exist.
5. **Offline/cache:** cache hydration/acknowledgements, owner scoped outbox, conflict/rejection fail-safe, sign-out safeguards. Acknowledgement does not bypass server validation.
6. **Admin/RLS:** admin dashboard uses server-side admitted/admin role checks. Browser-only nonadmin mock tests are helpful, but genuine second-account email/auth/RLS tests are still required before removing Netlify SSO.
7. **Backup and recovery:** encrypted operator backups and the closed import guard remain. The app's emergency pending-change export is not a full Supabase restore. Real managed Auth/SMTP/JWT/Netlify configuration recovery must be independently verified.

## Remaining release blockers / further audit work
- Perform genuine external non-admin registration, email confirmation, invitation admission, negative admin authorization, user A/user B data isolation, and log/rate/sync on separate devices **before** allowing beta testers past Netlify SSO.
- Test the URL preview Edge function and staged SQL matcher in an isolated Supabase environment with real, diverse roaster websites and reused product URLs. Verify DNS/redirect/SSRF controls and confirm exact-release behavior before production migration. Staged SQL must be validated against a migrated throwaway DB; Node source tests do not execute it.
- Enable Auth leaked-password protection if available and approved; review RLS/definer permissions with actual nonadmin authenticated calls.
- Validate full recovery for hosted managed settings (Auth, SMTP, JWT, DNS, secrets, Netlify and GitHub/Drive), beyond database-row-only restoration.
- Examine index usage under realistic community scale, measure latency and query plans, then index/remove only with evidence.
- Revisit community recommendation evidence tiers and rate-limiting as real participation grows. Do not fabricate community confidence numbers.
- Recheck Netlify production/preview protection in platform settings; source gate cannot prevent all manually initiated publishes.

## Pass criteria and next action
Latest private-branch GitHub Actions `visual-review` should show: Node tests pass, ESLint pass, allowlisted build and site-integrity pass, synthetic cloud browser QA pass, and multi-theme browser screenshots pass. A successful CI run is evidence for local correctness only; production access, external SMTP, live roaster parsing and complete disaster recovery are separate release gates.

**Release status:** keep changes on the private review branch for product-owner inspection; no production deployment or live DB schema change.
