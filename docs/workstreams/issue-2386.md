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

## First PR CI intake failure and same-source repair (November 13 UTC)
- Initial PR-head `8821adf867ae3898b99b37a8d82f8595beb0c800` approval job 43362497697 **FAILED**, exact logged cause: `release-queue.mjs --enforce-intake` saw untracked app scopes `site/cloud/client.js`, `site/cloud/coffee-url-autofill.js` and `supabase/migrations/20261113043000_dic_admin_preview_unlimited_member_15s.sql`. The high-risk work remains NOT READY.
- Repair adds dedicated IN_PROGRESS queue record with the three exact app paths in this docs-only commit (no runtime/test edits). Preserve unchanged code/test/SQL blobs from original journaled source; rerun exact PR-head mandatory checks before merge. New live preflight rechecked `b279e75c264a19eeefcb03404466a1ca6788a855`, blob `2fb236bbfa6bac48513eeb3bd157b260853af06d`. No provider changes.

## Initial isolated SQL regression failure and repair
- Exact initial PR head `8821adf867ae3898b99b37a8d82f8595beb0c800` approval 43362497697 FAILED missing queue registration; fixed in docs commit `4df8d9ed4269a75b1d391bd06b9331079818151d`.
- Exact initial SQL job 43362497703 FAILED after correctly applying the proposed migration to ephemeral PostgreSQL: `url_preview_release.sql` still asserted a **throttle for the Admin fixture**. This stale legacy assertion contradicts the new owner-approved exemption; it is not an actual runtime SQL parse failure. No live data changed.
- Repair all three isolated SQL fixtures: `url_preview_release.sql`, `universal_url_preview.sql`, `preview_two_phase_cache.sql` now explicitly distinguish an admitted verified administrator from synthetic admitted ordinary members. Member 12/day and 15-second shared cooldown plus ticket replay, cached cap, JSON JWT and nonmember/anon denial remain. Admin cached/fresh/trusted/repeat/no-account-quota checks added. Each SQL test ROLLBACKs its synthetic rows.
- SAME-COMMIT preflight confirmation prior to this code/test repair:
DIC_PREFLIGHT_VERIFIED development_sha=b279e75c264a19eeefcb03404466a1ca6788a855 preflight_blob_sha=2fb236bbfa6bac48513eeb3bd157b260853af06d
- Full exact-source hosted CI and safe merge still required; no provider/Netlify write.

## Observed second PR-head SQL failure and targeted fixture repair
- High-risk exact PR-head SQL 43363003934 failed at `preview_two_phase_cache.sql` AFTER `url_preview_release.sql` **PASS** and `universal_url_preview.sql` **PASS**. The disposable member UUID was randomized but its Auth+admission fixture insert was omitted because a prior source replacement did not match indentation. Real DB function correctly refused the unadmitted user with `Admitted member required`. Updated fixture to create synthetic confirmed Auth account plus enabled/admitted private.beta_members inside isolated transaction only; test still ROLLBACK.
- The targeted Node preview test used reserved `.example` TLD, which safeCoffeeUrl explicitly and correctly rejects. Changed test input to valid `roaster.com` to exercise the intended handler rather than weakening SSRF guard. Any resulting Node run failure must be observed and corrected, not assumed resolved.
- Fresh mandatory preflight before this test-only commit:
DIC_PREFLIGHT_VERIFIED development_sha=b279e75c264a19eeefcb03404466a1ca6788a855 preflight_blob_sha=2fb236bbfa6bac48513eeb3bd157b260853af06d
- No application/server migration changes, no provider writes or live deployment. Await exact-PR-head SQL, Node, visual and approval success and nonforce merge before READY.

## Exact SQL security-inventory fixture failure and fix
- PR-head run 43363161081 applied proposed migration in ephemeral PostgreSQL and passed `url_preview_release.sql`, `universal_url_preview.sql` and `preview_two_phase_cache.sql`, including 12/day, 15s, admin exemption, ticket replay and denied access. Later SQL `security_surface_inventory.sql` FAILED because its broad DDL regex treats the `user_metadata` literal **in a harmless comment** as a privileged function dependency. This was a real CI failure, not a bypass.
- Removed only the prohibited metadata term from a comment in the private shared-claim function; the definer continues to use database-authenticated administrator membership, enabled/admitted state and confirmed Auth email. SQL operations and grants unchanged. Security inventory and all isolated checks must rerun at exact new SHA.
- SAME-COMMIT preflight:
DIC_PREFLIGHT_VERIFIED development_sha=b279e75c264a19eeefcb03404466a1ca6788a855 preflight_blob_sha=2fb236bbfa6bac48513eeb3bd157b260853af06d
- No production provider writes, Netlify release, or member data reads/changes.

## Exact Node full-suite failure and stale historical assertion repaired
- Exact PR-head `0d43b32cf99d45fc7f2121ae38def561e9443c19` Node/lint job 43363314265 full test step FAILED **1 of 4,453?** (CI log: `not ok 4371`, one test failure, other tests passed; final exact total must be read from logs). The failing `tests/universal-coffee-preview.test.mjs:253` asserted the old SQL fixture literal `Boundary claim did not set exactly 12`, which this branch appropriately replaced with `Member daily counter did not reach 12`. The earlier *historical migration* still correctly contains 30s by design and must never be rewritten.
- Repair the existing unit test to separate historical October quota migration assertions from **current** November admin-exemption/15s logic and the new member fixture; do NOT weaken either Auth or SQL assertions. New branch CI must pass full tests, lint, build and relevant 5 statuses. No duplicate manual rerun.
- Same-commit mandatory preflight confirmation:
DIC_PREFLIGHT_VERIFIED development_sha=659b6f3fcb62ca7198f256ef82b8a2d49452750f preflight_blob_sha=2fb236bbfa6bac48513eeb3bd157b260853af06d
- PR-head SQL 43363314247 SUCCESS; cloud/browser 43363314202 SUCCESS; security 43363314187 and approval 43363314180 SUCCESS; original frozen603 43363314153 SKIPPED NOT PASS. They are earlier SHA evidence, not automatically claims for the new HEAD. No live provider/database changes.
