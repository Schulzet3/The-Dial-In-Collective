# Issues #9 / #41: existing-account read-only acceptance

## Current result — both existing account read phases received

**Ordinary member v2: 33 PASS / 0 FAIL / 0 NOT_APPLICABLE.** [Original member report](acceptance/2026-10-20-member-readonly-v2-owner-report.json) ran October 20 19:51:21–19:51:25 America/Denver (October 21 01:51:21–01:51:25 UTC). All 17 foreign-owner table probes returned zero rows, including coffee_submissions. Administrator dashboard and access overview returned **403/42501**; direct Community table returned **403/42501**; five anonymous private-read endpoints returned **401/42501**; invalid bearer returned **401/PGRST301**. Current personal-state ownership, validated admitted nonadmin role, two sanitized 22-field Community DTOs with no raw UUID/email/nested payload, and account continuity all reported PASS.

**Administrator v1: original 32 PASS / 1 FAIL preserved.** Its incorrect owner-isolation expectation for intentional administrator submission-review access is explained below. It is not retroactively rewritten as an all-pass report. Both role checks were validated against server status; differing admin true/false roles establish distinct role phases without publishing identities. The helper verified unchanged identity inside each phase. Reports are **owner-run authenticated HTTP evidence**, supplied by the owner; Work-mode did not independently capture raw traffic/signatures.

**Read-only acceptance performed by this session is complete for the helper's explicit paths and currently returned rows. Full #9/#41 acceptance remains OPEN.** No additional repeat of these passed account checks is needed absent change/regression. Unrun checks retain their scope below; no authorization has been given for production mutation tests, account disablement or fixtures.

## Verified in Work-mode browser

The owner signed into the existing administrator account. Independently observed: synced personal workspace, Settings Administration entry, and successfully rendered administrator dashboard. Aggregate dashboard counts: 5 admitted accounts, 18 saved shots, 4 verified coffees. No invitation, access, preference, account or shot action was submitted. Private account details visible to that administrator are intentionally omitted here.

The browser automation exposes read-only DOM inspection but **no request transport** (`fetchAvailable:false`) or network-response capture. The app exposes no WebMCP tools. This is a limitation of the automation interface, not proof the real website lacks `fetch`. A dashboard UI result is not an independently captured HTTP status or payload. At that initial checkpoint, signed API negatives were NOT RUN. The owner has since supplied both administrator and nonadmin reports below.

## Owner-run helper

Use [scripts/qa/read-only-account-acceptance.mjs](../scripts/qa/read-only-account-acceptance.mjs) in the owner's own signed-in browser. It is not deployed or imported by the application. This route does not require sharing a password, token, email, account ID or private record with ChatGPT.

1. In your own browser, open the production app and sign into the existing administrator account normally.
2. Open Developer Tools → Console. Copy the entire helper file from GitHub into the Console and run it. Choose `admin` when its role prompt appears. If the browser blocks execution, report the block; do not disable security controls.
3. Copy **only the printed JSON report** back to the acceptance session. Do not copy surrounding console/network/storage data.
4. After the administrator report is reviewed, repeat with the already admitted non-admin account, choosing `member`. Two successful role-specific reports prove different server-authorized roles, without publishing identifiers.

The helper reads the existing local SDK session, validates it with `/auth/v1/user`, and uses it only against this application's exact Supabase origin. It never returns or prints the session. It does not create another SDK client, refresh credentials, write storage, sign in/out, or call an account/shot/invitation mutation. Public build config is loaded from the app's existing `/cloud/config.js` module.

### Bounded request scope

- GET: current Auth user; sanitized Community browse; own held-review list; administrator dashboard/access overview; foreign-owner probes of all 17 production owner-scoped tables; direct Community-table denial.
- POST **only** `dic_session_status` and `dic_read_personal_state`, with `{}`. Their public wrappers are VOLATILE, so PostgREST GET is unsuitable. Production definitions were inspected: they SELECT from STABLE, read-only private helpers. The HTTP verb alone does not mean an application mutation occurred.
- Anonymous denials for the same private read RPCs; invalid-bearer rejection. No real disabled/unadmitted account is fabricated or impersonated.
- Under 45 sequential requests per account, each with a 15-second timeout, no retry loop, redirect following or cookies. Error output is a small allowlist of error classes; raw bodies/errors are never logged.

Reports contain role expectation, timestamps, status/error classes, fixed test names, counts and boolean/schema assertions. Community rows must match the exact 22-field allowlist; nested payloads, raw UUIDs and email-like content fail checks. Private state must belong to the validated account. Foreign-row probes request only `owner_id` and at most one row. v2 treats administrator `coffee_submissions` review access as NOT_APPLICABLE; any visible foreign row for an ordinary member, and any visible foreign row on the other owner-only tables for either role, is a FAIL without publishing its value. Admin-only read endpoints must deny a nonadmin with HTTP 401/403 and SQLSTATE 42501; a missing endpoint/transport error cannot pass as denial.

## Independent production source/schema evidence

- Last independently checked Netlify current release: deploy `6ad7be20bf672d5c8936f19a`, source `e7e16e5e13b35a6f4b6aa81db5b09b93b1aefc60`. Recheck provider source before accepting future reports; a hardcoded reviewed SHA is not a runtime deployment receipt.
- Read-only hosted SQL confirms `dic_browse_community_shots`, `dic_my_community_outliers`, administrator dashboard and access overview are STABLE, with server membership/admin checks. `private.read_personal_state` and `private.session_status` are also STABLE/read-only. These are **source/schema checks**, not signed HTTP acceptance.
- Current aggregate baseline: **18 shots / 18 notes / 2 eligible Community rows / 0 held rows / 5 enabled members / 1 admin**. The admin owns 16 shots; nonadmins own 2. Thus foreign shot data exists for either role's negative query; no owner IDs were returned by this baseline query.
- Local helper safety suite: **5 tests PASS**, including both role paths, forbidden-request boundaries, redaction with sentinel private values, foreign/private/held leaks, changed identity, wrong role, stale session, transport errors, incorrect denial classes, and wrong origin/project. Mocked safety tests are not production acceptance. [Full Node/lint/build/source-integrity CI 39526389115](https://github.com/Schulzet3/The-Dial-In-Collective/actions/runs/39526389115) and [approval/continuity 39526389020](https://github.com/Schulzet3/The-Dial-In-Collective/actions/runs/39526389020) PASS on helper commit `7e21f9cf065dbebeb82a2f1a2fc2cc3b27882746`. Cloud UX 39526389131 was still running at last readback; no UI source changed.

## Remaining gates

Both issues remain OPEN. Both role-specific owner-run API reports have been received (see current result above); independent automated network capture remains unavailable. Administrator mutation-RPC denials are deliberately untested because no production mutation endpoint is invoked. Real disabled/nonadmitted sessions, any held-shot positive case, Confirm/Correct/error-retry/hide/version conflicts, timing/races, and offline cache isolation remain unverified. #9/#34 lifecycle cannot be completed by this read-only helper. Results cover only currently returned eligible rows, not every possible/future canonical release. No Locked decision or release permission is changed.

Current next action: retain passed read results and complete the remaining unrun cases only with a naturally available case or a separately authorized isolated authenticated fixture. Current authorization does not permit creating/disabling production accounts, adding held shots or calling production mutation endpoints. Keep PASS/FAIL/NOT RUN evidence separate and record every report in the active journal and relevant issues.

## Administrator HTTP report received and v1 helper correction

The owner supplied the redacted [original v1 report](acceptance/2026-10-20-admin-readonly-v1-owner-report.json), run October 20 at 19:41:57–19:42:02 America/Denver (October 21 01:41:57–01:42:02 UTC). It contains **32 PASS / 1 FAIL**; the file preserves the original values, including the failure. This is owner-run signed-browser evidence supplied as a report, not an independent Work-mode network capture.

Reported PASS evidence: validated identity/admitted administrator role, own-only personal-state RPC, 16 foreign-owner table probes without visible foreign rows, 2 Community rows with exact sanitized schema/no raw UUID/email/nested payload, administrator read endpoints, direct Community-table 403/42501, anonymous private-read 401/42501, invalid bearer 401/PGRST301, and unchanged account through the run. The empty held-review list remains a vacuous ownership check; it does not prove the positive held-review case.

**Sole original failure:** `foreign_owner_read:coffee_submissions`, HTTP 200 / `UNEXPECTED_RESPONSE`. Investigation confirmed a **helper expectation error**: this table's SELECT policy deliberately allows admitted administrators to review other accounts' proposals. Exact live policy is `private.is_member() AND (owner_id=auth.uid() OR private.is_admin())`; RLS enabled, authenticated SELECT granted, anonymous SELECT denied. This matches [source migration](../supabase/migrations/20261009192735_dic_coffee_catalog.sql) and [security_foundation.sql assertions 36/38/39](../supabase/tests/security_foundation.sql): ordinary members cannot read other proposals, admitted admins can review submissions, and admins still cannot read others' raw shots/notes. Canonical Master Specification §32 requires Pending Coffee verification. No policy was changed.

Current count-only baseline for this table: 6 submissions, 4 admin-owned and 2 nonadmin-owned, 2 pending / 0 conflict. No owner IDs/proposal text/source URLs returned. These counts and the admin OR-policy explain why a nonempty foreign submission probe is expected. **The v1 report did not retain response shape/count**, so exact original payload shape is not independently certified, and its failure is not rewritten as a production isolation PASS.

Helper **v2** now records a valid admin submission probe as `NOT_APPLICABLE / ADMIN_REVIEW_ACCESS` outside owner-only isolation scope. The member branch remains strict: a visible foreign submission FAILS. It includes only safe row counts in foreign-table probe receipts and separately counts not-applicable checks. Six local safety tests PASS, including explicit admin-review versus member-leak fixtures and continued admin raw-shot/notes protections; [v2 Node/lint/build/source-integrity 39529372356](https://github.com/Schulzet3/The-Dial-In-Collective/actions/runs/39529372356) and [approval/continuity 39529372348](https://github.com/Schulzet3/The-Dial-In-Collective/actions/runs/39529372348) SUCCESS on `c5fe2af5ae7bd8cc117200102c1137d7a3a1da2e`. Unchanged-UI [UX 39529372485](https://github.com/Schulzet3/The-Dial-In-Collective/actions/runs/39529372485) subsequently read SUCCESS. Existing v1 full-source build/lint/Node/UX/continuity CI all passed; last documentation continuity run 39526545543 also passed.

Provider source independently rechecked after receiving the report: current READY Netlify deploy `6ad7be20bf672d5c8936f19a` still publishes `e7e16e5e13b35a6f4b6aa81db5b09b93b1aefc60`, matching reviewed_source. This resolves that deployment-match question **at this check time**, not for future reports. No production records, policy, accounts, settings, provider configuration or deployments changed.

**Historical next step fulfilled:** the nonadmin v2 report is now received and preserved above. Both issues remain OPEN only for the remaining scope exclusions; passed account-read checks need no repeat.

## Post-member independent provider and continuity check

- Netlify **current READY** `6ad7be20bf672d5c8936f19a`, exact published source `e7e16e5e13b35a6f4b6aa81db5b09b93b1aefc60`, still matches **both** report reviewed_source values. Provider metadata was independently read after member receipt; the report's static SHA was not used as proof of deployment.
- Read-only aggregate baseline remains **18 shots, 18 notes, 2 eligible Community rows, 0 held, 5 enabled members, 1 admin**; 16 admin-owned and 2 nonadmin-owned shots. Foreign shot data exists for both phases, so those empty foreign-shot results are not explained by an empty database. No original IDs or private content returned. Other table-specific nonempty foreign fixtures were not exhaustively counted, so empty results on tables without foreign rows may be vacuous.
- Helper v2 source `c5fe2af5ae7bd8cc117200102c1137d7a3a1da2e`: full Node/lint/build/leak guard [39529372356](https://github.com/Schulzet3/The-Dial-In-Collective/actions/runs/39529372356), approval [39529372348](https://github.com/Schulzet3/The-Dial-In-Collective/actions/runs/39529372348), cloud UX [39529372485](https://github.com/Schulzet3/The-Dial-In-Collective/actions/runs/39529372485) all independently read SUCCESS. Latest prior docs continuity [39529503766](https://github.com/Schulzet3/The-Dial-In-Collective/actions/runs/39529503766) SUCCESS on `35e8310c7b886d2f64ec05a74df193e8790865f6`.
- **No production mutation or release.** GitHub evidence/checklist/status changes only for this receipt. No credentials/private IDs were collected; original administrator and member report values stay intact.

### Exact unresolved boundary

| Remaining case | Current evidence and next permitted route |
| --- | --- |
| Ordinary member administrator mutation-RPC denial; wrong-member shot correction/confirmation denial | Not called in production under read-only scope. Review source/synthetic tests already separately recorded; require separately authorized safe authenticated environment for real mutation-path HTTP proof. |
| Real nonadmitted/disabled signed identity denial | Anonymous/missing bearer and invalid bearer denials passed; these do not prove an actual disabled or nonadmitted account case. Existing appropriate sessions or an authorized isolated fixture needed; do not alter current membership. |
| Held-shot positive ownership, Confirm/Correct/failure-retry/hide/version-conflict | Zero held rows. #9/#34 remain OPEN; await natural hold or separately approved isolated setup, preserving history. |
| Wider releases, timing/races, persistent offline cache isolation | The reports cover current two DTOs and sequential reads only. Existing owner-reported phone browse/#11 acceptance is retained; no new general guarantee inferred. |

No new product decision is needed to accept the performed read-only results, and no existing Locked security requirement is waived. Do not describe the entire beta or either open issue as complete.

## Follow-up independent provider corroboration and closure boundary — 2026-10-20 MDT
- Fresh production provider metadata independently verified: same READY Netlify deploy and exact reviewed source; Supabase 30 migrations and unchanged 18 shots/18 notes/2 eligible Community/0 held/5 enabled admitted accounts/1 admin. No genuine nonadmitted or disabled signed production identity exists to test today.
- Corroborating HTTP edge log **aggregate only** in the exact reports' timestamp windows: authenticated Community browse 200, authenticated admin dashboard+access-overview 200 in administrator interval and **403** in ordinary-member interval, protected route **401** where authorization missing. Provider log JWT-role omissions on some entries make identity inference inappropriate; no raw response-body or independent owner-ID inspection. This supports, but does not reclassify, the owner's report provenance.
- Inspected production DDL confirms admin mutation functions check member-admin state before writes and outlier Confirm checks member, shot owner, expected revision and held reason before changing quality. None of these mutation endpoints was invoked. Supabase intentional SECURITY DEFINER advisories remain tracked in #27; no claim of cleared warnings.
- Outstanding original authentic tests: nonadmin signed admin-mutation rejection; genuinely signed disabled/nonadmitted accounts; unrelated member/owner held-shot Confirm/Correct negative/positive/retry/hide/version conflict (#34 for real failure/retry). Current population supplies no safe live fixture. Do **not** create/disable a production account or shot just for testing. Next approval request should be for tightly scoped disposable **nonproduction, no-cost** authenticated fixtures, with explicit outcome distinction: isolated JWT validation does not prove live production held-shot UX.
- No production/user/provider/billing or application source changes. Issue #9 and #41 remain OPEN. Original report files remain preserved, including administrator v1 32/1.

## Isolated signed HTTP extension, original report integrity preserved — 2026-10-20 MDT

On `2f328a3ee8080c6ca687c81b4e5dae18c43bc7f1`, CI [39532058139](https://github.com/Schulzet3/The-Dial-In-Collective/actions/runs/39532058139) passed 32 cryptographically signed **isolated** JWT/PostgREST assertions. [Full evidence and closed-vs-open gates](ISOLATED_SIGNED_HTTP_ACCEPTANCE_2026-10-20.md). Original admin/member live HTTP reports unchanged; no production disabled/held flow was performed. Existing #9/#34/#41 remain OPEN under their recorded real-client criteria.

## Live owner-session soft-disable acceptance — 2026-10-20 21:06 MDT (RESTORATION PENDING)
- Existing second nonadmin account was soft-removed by the owner administrator from live `/admin.html`. Owner-provided screenshot shows immediate transition to **Your Invitation**, accompanied by an admitted-beta-account requirement without refresh. Email in screenshot is **not preserved in this GitHub receipt**.
- Independently checked anonymized Supabase HTTP log aggregate during `2026-10-21 03:01–03:10 UTC`: authenticated member-facing `dic_read_personal_state` returned **HTTP 403**; `dic_admin_set_member_access` returned **HTTP 200**. This corroborates that a genuine authenticated request was denied by production backend, rather than merely a frontend route change. No response body/SQLSTATE or user ID was extracted; provider log correlation is by timestamp, request class and role only.
- Live database **4 active admitted/1 disabled**, **18 shots/18 notes/2 Community intact**. **Disabled-signed-member access denial = owner-observed UI + authenticated HTTP corroboration PASS**; successful Restore Access and post-restoration same-session API **NOT YET VERIFIED**. No independent production never-admitted-user or nonadmin admin-MUTATION-negative recorded. Issue #41 stays OPEN.

## Live disabled-account restore completed — 2026-10-20
- Owner observed immediate lockout and immediate recovery of same existing signed-in ordinary member, without refresh or new invite. Supabase minute-level logs show authenticated personal-state HTTP 403 at 03:04 UTC; admin restore HTTP 200 at 03:07; two authenticated personal-state HTTP 200 at 03:08. Private audit recorded one removal, one restoration. Afterward 5 admitted active, 0 disabled, 18 shots, 18 notes, 2 Community; original records preserved.
- LIVE disabled-member remove/restore acceptance PASS. Logs aggregate request status and role, not exact JWT identity. Never-admitted and nonadmin admin-mutation real HTTP checks NOT RUN; #41 stays OPEN. No credentials or private screenshots saved.
