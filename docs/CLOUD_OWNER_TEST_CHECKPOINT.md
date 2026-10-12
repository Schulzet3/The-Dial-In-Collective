# The Dial In Collective: account and cloud development checkpoint

## Readiness

**Development code, not a released beta. There is no hosted login URL yet.** No actual owner/tester account has been provisioned, no real user data has been migrated, and no automated Google Drive backup is running. The local v0.2.0 prototype remains unchanged.

The owner-development screen reuses the prototype palette, typography, sensory/radar components, recipe renderer and recommendation/model logic. It calls typed relational cloud APIs, not an unrestricted whole-account JSON upload. Cloud configuration defaults to disabled; build output receives only public project coordinates.

This checkpoint is an implementation addendum, not a change to the approved product scope. Features absent from the owner-development harness have NOT been removed from the Master Specification or Decision Ledger.

## Implemented

- Auth UI and official SDK adapter for email/password sign-in, signup, recovery, invitation entry and device-local sign-out. Real email delivery and authentication lifecycle still require end-to-end verification.
- Verified-email beta invitation redemption with expiry, revocation, maximum uses, attempt limiting and no automatic admin grants.
- Typed create-setup, personal preference, manual coffee submission, verified-coffee library, style selection, workspace selection, advanced Temperature/Slow Feed, shot save/edit/hide and Make Current Recipe operations.
- Owner-bound reads and writes. Browser changes include the original account ID, checked against the actual authenticated ID before any write, protecting against mid-request account switches.
- Stable mutation IDs, recorded receipts, atomic operations and revision conflict responses. A lost response can retry without creating another shot. Conflicting changes remain in the local queue instead of being silently overwritten.
- Server-derived all-green shot status, private notes, immutable historical equipment provenance and ratio-led personal recipe families. New shot logging changes Current Coffee; adding or browsing a coffee does not.
- Browser queue and acknowledgement cache code. Server acknowledgements are preserved locally before a subsequent refresh, so a failed read does not make an acknowledged shot disappear from the local cache.
- Core owner-development interface: setups, coffees, logging, all five sensory scales, recommendations, range/centerpoint display, inline expandable shot details, light/dark appearance, persistent Settings, optional Temperature/Slow Feed, and emergency development exports.

## Verification performed

- **89 Node tests passed** in the combined local working tree: 57 existing prototype/domain/admin checks and 32 new cloud/adapter/cache checks. The repository's `npm test` runs the 32 committed cloud checks; it does not imply that all original prototype files are present on this branch.
- **19 injected Chromium UI checks passed** at a 390px phone viewport. Covered admission screens, Settings staying open, blank measured inputs, five-rating requirement, pin-after-log, inline radar/history, dark mode, offline queue retention, sign-out protection and reconnect replay.
- **31 current database assertions passed** after workspace operations were added, plus **5 account-bound mutation assertions passed** after the final wrapper. Synthetic Auth users and records were created inside rolled-back transactions. These are database-role tests, not real JWT/browser authentication tests.
- A fresh query confirmed zero Auth users, coffees, shots, community shots and backup runs. No application/private table lacked RLS.
- Supabase's security advisor returned no findings after the latest migrations.
- All eleven committed migration blobs match the SQL in Supabase migration history byte-for-byte.

The earlier 60-check foundation suite is a historical checkpoint. Some of its direct-write expectations are superseded by the new controlled-mutation APIs. Do not claim it still passes unchanged against this milestone; adapt those assertions before reusing it as a current release gate.

## Explicit testing limitations

The browser harness injects mocked backend/auth responses and an in-memory store because this runtime blocked normal browser navigation. It does NOT verify live email, password-reset callbacks, SDK session refresh, native IndexedDB persistence, offline cold start, a physical iPhone, or concurrent real devices.

The official SDK is pinned to `@supabase/supabase-js` 2.117.3. Package registry access was unavailable from the build runtime, so dependency installation, SDK bundling and the complete hosted build still require a network-enabled run. No successful production build or deployment is claimed here. Generate and review a lockfile in that environment before beta release.

## Hosting and build

The development branch now contains the owner-screen source and its dependencies, an explicit package manifest, a build allowlist and Netlify build configuration. The build outputs only the selected static app files and official SDK asset into `dist/`. It excludes backups, research, test fixtures, application credentials, SQL migrations and internal documentation. Browser configuration accepts only `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`; database/service-role, email and backup secrets never belong in that build.

Netlify has been proposed but no hosting account/site is connected or verified in this checkpoint. Before providing a login link: create the controlled HTTPS deployment, configure its exact Supabase callback URLs, verify confirmation/recovery delivery, provision the intended owner's access, and run actual login/save/reload tests. Do not disable email verification to bypass configuration. Do not invent an owner email or an invitation token.

## Remaining full-beta work

- Complete cloud binding for experiments, bags, multiple-basket management, hardware version/recalibration/reactivation, Custom targets, import/restore, coffee edits, AI extraction and real admin workflows.
- Add conflict review/resolution UI. Current conflicts stop the queue and preserve changes; they are not automatically reconciled.
- Finish native browser persistence, authentication lifecycle, revoked-access/cache policy, offline startup and real multi-device tests.
- Complete canonical coffee verification and contributor-balanced community summary/outlier processing. Current community projections remain unpublished until authoritative validation.
- Configure unattended encrypted Google Drive backups, failure alerts, full recovery coverage and an actual restore drill before real beta data.
- Connect email delivery suitable for external testers and verify signup, password recovery and session persistence.

No paid project, preview database branch or domain has been created. Main and the user's existing local installation remain unchanged. Owner-test readiness and external-beta readiness are separate gates.
