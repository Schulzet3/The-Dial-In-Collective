# Issue #2258 — newly approved user confirmation

- **Authority:** Owner Nov 12 2026 requested notifications to newly admitted users. Preserve #1756 verified email + admin approval and #1938 administrator-only push; development does NOT authorize production publication.
- **Feature parent:** `c493935c37c6e93ae9d0bc98fdcea1f46c38bd85`; branch `work/issue2258-member-approval-notification-20261112`; same-commit source, styling, regressions and this journal. No provider, Auth, SQL, private member data, Netlify or production writes.
- **Built:** Pending accounts periodically recheck only the server admission status while their app is visible. A proven pending-to-approved transition shows an accessible dismissible Account Approved notice above workspace, including when the same account has a pending marker from a previous signed-in session. The marker is a per-user boolean, no personal content. Reject/revoke/offline/incomplete checks cannot invent approval; no notice for already admitted users. Role/Auth gates and offline data are unchanged.
- **Limits:** This is **in-app notification, not background delivery**. Email and closed-app **member** push are NOT built or verified. Auth magic-link mail from the admin's PKCE browser is unsuitable for transactional approval notification. Existing #1938 off-screen push targets the admitted administrator only. Off-screen member delivery requires a separately secured opt-in push subscriber or real transactional email transport; don't silently reuse admin permissions or claim delivery.
- **Acceptance:** Targeted `tests/cloud-auth-startup-verification.test.mjs` covers pending→admitted, rejected, already admitted and network failure. Run applicable exact-source Node/build/browser/mobile/offline/approval before READY. No device signoff is a mandatory source gate. Preserve Log Shot→Rate→Recommendation, Community, history and existing users.
- **Next:** Current source TESTING pending exact PR checks and nonforce merge; reconcile queue with source-only status and leave the member off-screen delivery gap OPEN. Publication remains owner-command-only.

## CI intake repair — same-commit queue reconciliation

- PR head `654c5043369828120c47d243b172ceae4253e0c8`: scoped cloud-tests SUCCESS in run `43226631450`, security-inventory SUCCESS `43226631867`; approval run `43226631434` correctly HELD solely because `site/cloud/main.js` and `site/styles.css` lacked a new in-progress queue row. Original frozen603 SKIPPED, not PASS. No source/UX claim from a failed governance check.
- Added `DIC-Q-2258-user-account-approval-confirmation` TESTING with the exact two runtime scope paths to `docs/RELEASE_QUEUE.json`; 321 prior items and existing delivery/status history preserved. No READY certification or publication. Applicable exact new-head CI and nonforce integration still required.

## Exact full-suite regression fix

- PR head `e0c154652e8f025e4cad02ec02ed3114b915dfc8`: approval, SQL, security-inventory, cloud-tests and mobile browser checks SUCCESS; full Node22 validate run `43227076001` **FAILED 2/4,248** (4,240 pass, 6 intentional skip). Issue #1596 source contract expected the exact baseline `connected?this.coffees():this.auth()` expression, and one new test incorrectly expected a mocked `render()` that always calls `auth()` to show the connected workspace. Both failures were genuine test results, not hidden as PASS.
- **Fix in this code/test/journal commit:** Keep the original authorized view ternary intact and compose the admission banner before it; assert actual `status.admitted` and notice, not a deliberately stubbed auth template. Recheck the entire applicable exact-source test suite (do not reuse failed validation), with unchanged strict approval/privacy/SQL controls.

## Source READY verification (not publication)

- Nonforce PR #2260 squash-merged to `9beb10f04d0db227abacb553a50832caa4ba65dc`. Reviewed exact PR head `8dabb809ddf46af05315e1138972bd6fad94107a`: governance `43227731727`, isolated SQL `43227731718`, security `43227731779`, cloud/mobile/browser `43227731712`, Node22/lint `43227731992` all SUCCESS; frozen603 SKIPPED/N/A. Four source/test and queue blobs byte-identical to merged commit.
- Merged SHA `9beb10f04d0db227abacb553a50832caa4ba65dc`: Node/lint `43228346551` SUCCESS (4,242 PASS, 0 FAIL, 6 intentional SKIP), cloud/mobile/browser `43228346616` SUCCESS, approval `43228346560` SUCCESS. Source-equivalent unchanged SQL and security verified at PR head, no invented merged workflow.
- Queue item `DIC-Q-2258-user-account-approval-confirmation` promoted TESTING → READY for **in-app only** after CI; 322 items preserved; published base and existing decisions untouched. **NOT DEPLOYED**. User offscreen push/email not implemented; #2258 OPEN for distinct transport/verification. Never claim that a user already receives external notifications or that administrator device delivery was physically validated.

## November 12 owner extension — EMAIL + opt-in member background PUSH (clean source integration)


- **Owner authorization:** Nov 12: "Do both, please" means transactional approval email plus opt-in member Web Push on verified admin approval; it does NOT authorize Publish, paid services, changing auth rules or sending actual production test mail.
- **Recovered start:** development `91ae8e71352e1f58eb9ecbf628632eccbf06d3d8`; current production commit `d0bc07df641af6411435daac74ee3cb16d1bdb61`, Netlify `6af51c834f09e4e2c0f203ea`. Existing in-app approval `DIC-Q-2258-user-account-approval-confirmation` READY but unpublished; #1938 administrator push is separate/deployed without physical delivery evidence.
- **Architecture:** Atomic approval-event trigger creates one immutable, per-channel service-only outbox receipt; SQL claims use lease, token, retry and provider idempotency; separate per-member opt-in endpoint table denies anon/authenticated access; service-role-only RPCs; standalone, content-free member push worker; timed Edge dispatch calls Resend only if server-side `RESEND_API_KEY` plus verified `DIC_APPROVAL_FROM_EMAIL` exist. Reuse existing Supabase Vault VAPID key **only for cryptographic sending**, NEVER admin permissions/endpoints. Source-only no application DB/identity/shot/Community changes.
- **Source work:** `supabase/migrations/20261112135900_dic_member_approval_notices.sql`, `supabase/functions/dic-member-approval-broker/{index.ts,core.mjs}`, `netlify/functions/dic-member-approval-poll.mjs`, browser opt-in, one separate scoped push worker, build graph and privacy regressions. No publication or provider mutation.
- **Known blocker:** No transactional mail provider key or verified sender was present in Netlify site/team environment readback. Edge secret availability and verified sender are **not verified**. Required actual delivery/provider configuration and owner-controlled publication remain outstanding; source completion cannot prove email inbox or device push acceptance. Free-service selection must not cause spending/upgrade; no keys in GitHub/chat.
- **Acceptance:** authenticated verified pending account only; outbox created only on real approved event; rejected/unverified never enqueue; service-only claims and REST/RLS; successful mail and push independently acked/retried; Resend idempotency key and no unapproved mail; push body generic, content-free; per-device opt-in/disable; role/session isolation, no loss of local shots/outbox, no admin push regression; high-risk SQL/Auth/offline + Node/lint/build/mobile exact-source CI. Track GitHub PR and merged SHA, evidence, provider gaps and queue.
- **Status:** IN_PROGRESS until source/tests/CI; never label READY if environment blocks actual delivery. All changed code/test/SQL commits include this journal and [skip netlify].

## Edge broker implementation checkpoint

- `core.mjs` implements explicit member JWT + live email-verification/pending/admission checks on each subscribe, distinct endpoint allowlist and max-three per member, owned-only unsubscribe, Vault-backed VAPID signing, fixed generic push (no payload) and provider-accepted Resend API receipt with per-event idempotency key. Dispatch consumes only service-role SQL claims from the approved review trigger, always replies to callers without identity, address or endpoint data, and independently finishes/retries each channel. An absent verified email sender must report `email_not_configured` and retain email queue; no fake delivery receipt.
- Preview/source implementation ONLY. Edge deployment, source full tests, isolated SQL role checks, browser UI and actual external delivery are NOT verified and remain pending. New source-only integration does not publish.

## Pending-account opt-in and worker

- A visible, explicit **Enable/Disable Approval Push Alerts** control appears only for a signed-in, email-verified pending account; the permission prompt runs synchronously from the tap. The device verifies installed iPhone Home Screen mode and validates server-bound subscription ownership. Separate `/member-approval/` service-worker scope avoids replacing the existing root Admin/offline worker. The worker uses a single generic approval notification and focuses/open `/`, never leaks email/user IDs or Admin data; local signout/reset clears UI flags, not opted-in background delivery until user disables or endpoint expires.
- New `site/cloud/approval-push.js` and Netlify asset allowlist/graph generated worker are source-only; exact build/browser CI and device acceptance not yet observed. `site/cloud/client.js` forwards signed session function calls; Edge revalidates auth/email/pending state; no admission decision in the client.

## New focused regression suite

- `tests/issue2258-member-approval-notices.test.mjs`: signed verified pending-only subscribe and per-owner endpoint permissions; no SSRF/nonmember/Admin registration; successful member push delivery is empty payload; Resend acceptance/idempotency; no-subscriber skip; email configuration absence preserves email retry while push still delivers; malformed endpoint retry; replay claim no send; SQL service-only ACL/trigger; static scoped worker leaves Admin PWA behavior unchanged. This initial suite is added before CI. No live recipient or provider call is performed by these mocks.

## Device UI regression contract

- `tests/issue2258-approval-push-device.test.mjs` asserts the browser permission request is immediate from the user action, distinct narrow worker scope, VAPID URL-safe key decoding, subscription status/opt-out, and iPhone Home Screen gating. Static tests require verified-pending UI only, explicit provider server call, Admin PWA worker unchanged. These are isolated mocks; they do not prove Apple device delivery.

## Locked owner decision, queue and source-intake correction

- Explicit `ACCESS-MEMBER-APPROVAL-EMAIL-AND-OPTIN-WEB-PUSH-20261112` approved Nov12; narrow scope in Master Specification + Decision Ledger and coverage inventory/contract. Do not change 79 original Locked baseline decisions.
- Mandatory queue row `DIC-Q-2258-user-account-approval-confirmation` was independently READY only for earlier in-app PR #2260. Because new build overlaps `site/cloud/main.js`, the prior READY cannot be published independently without exact-byte isolation. We safely moved the same row to **IN_PROGRESS**, merged SHA null (historic proof retained), broadening scope to email, push, migrations, Edge and worker; no other row/status was modified. A new tested source and verified provider configuration will be required for READY.
- New worker template recognized as deployable by `scripts/release/release-queue.mjs`; all changes retain exact commit journal and [skip netlify]. Still no live provider writes or account notifications.

## Exact first-pass CI failures and fixes

- Initial six-commit PR #2270 head 8a53e2d5c9f75d6ba1f80da2a45efb41e4f973e8 FAILED mandatory approval continuity: its new journal path was not recognized, although a journal was present in each commit. Replacement single nonforce commit on live development updates recognized docs/workstreams/issue-2258.md SAME COMMIT as ALL code, SQL, tests and decisions. Never weaken guard.
- First Node22 validate run 43235749318 4,265 PASS/3 FAIL/6 SKIP. Two new synthetic push tests incorrectly supplied a fake SHA-256 endpoint hash; fixture now hashes real endpoint. Existing workflow reconciliation requires exact RETIRED_NOT_REQUIRED prefix; coverage now preserves policy while saying actual provider/device delivery unverified. Historical run stays FAILED.
- First browser run 43235749632 FAILED because tests/browser/cloud_owner_qa.py synthetic module bundler omitted newly imported approval-push.js; updated the fixture module graph, not actual production Auth/workspace. Initial built_app_qa.py was PASS but does NOT supersede failed browser run. Exact new-head CI required.
- Added admitted-member Settings notification-management/opt-out. Physical device acceptance optional; no provider writes, release, or mail sent.
