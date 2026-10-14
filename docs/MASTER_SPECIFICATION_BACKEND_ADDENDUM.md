# The Dial In Collective
## Master Specification: cloud foundation addendum

This is a supplement, not a replacement for the Master Specification, Decision Ledger, and the approved prototype addendum shipped with v0.2.0. Preserve all unchanged Locked decisions. New numerical implementation choices are not silently promoted to product requirements. Product copy uses The Dial In Collective, dial in, dialed in, and dialing in without hyphens. The existing GitHub repository identifier is retained unchanged.

## Approved release direction

The next external beta must have real accounts, cloud syncing and shared community data before it is hosted for testers. The local-first prototype phase remains a completed/ongoing testing phase, not the final beta architecture. Its interface and behavior are the visual baseline. Community/admin previews must not be mistaken for real hosted functionality.

Development uses the existing Supabase Free organization/project. Do not create paid projects, paid branches, upgrade plans or buy a domain without approval. Source changes live in the private GitHub repository on development/backend-foundation. The local phone prototype is unchanged by database migrations.

Google Drive is the approved automatic backup destination. The agreed folder is The Dial In Collective Backups. A ChatGPT Drive connection is not authorization for an unattended job. Scheduled encrypted exports, authentication/storage/configuration coverage, failure alerts, retention, and a tested restore remain required before real beta data. A database status table alone does not implement backups.

## Identity and access

### Account password policy (owner-approved 2026-10-12)

New account passwords and password recovery must require at least **8 characters, one uppercase letter (A-Z), and one supported special character**. Do not additionally require a digit or lowercase letter. This explicitly replaces the unapproved 12-character client-side limit. Existing sign-ins are not subject to a new-password validation gate. Apply clear inline guidance and validate before submitting a new password. Ensure the Supabase Auth project settings do not reject passwords that meet this policy; final server-side settings and real email/signup/reset tests remain a separate verification step.


After submitting account registration, the app must show a dedicated, high-prominence **Check your email to confirm your address** screen, with the submitted address, clear confirmation instructions and an explicit route back to sign in. Do not reduce this critical step to a transient toast or paragraph. This approved refinement does not disable or bypass verification.

Keep email-based accounts, password recovery, persistent sessions, minimal personal fields, and a revocable/replaceable beta admission link. Credentials remain managed by Supabase Auth; never store them in application preference tables or GitHub. New accounts are pending until admitted. User-supplied metadata cannot grant membership or administration.

Raw personal shots, free-text notes, preferences, workspaces, setup names and identity mappings are owner-protected. Community views expose only qualifying structured shot information and optional equipment details. Admin review permissions do not give routine access to another user's private notes or raw history. Only verified canonical coffee information is visible to ordinary admitted users. Users submit proposals/evidence; they cannot overwrite canonical facts or approve their own proposals directly.

## Preserve the product model

- A coffee release has a stable identity independent of its display name or URL. The same URL can represent distinct releases; group related releases without merging their history.
- Every setup is a personal workspace with the full library, setup-specific recency and Current Coffee. Adding/browsing does not activate a coffee. Only a saved shot changes Current; restoration and major-hardware transitions are deliberate exceptions already approved in the workshop.
- Major grinder/burr/machine changes create immutable setup versions. Basket changes and grinder zero-point changes retain their distinct version/calibration semantics. Shots retain the equipment used at the time.
- Basket Dose is the dose anchor. The +/-1 g range is advisory and must not become a hard database block. Other prototype numeric limits are sanity guardrails, not espresso definitions.
- Dialed In is derived from all five green values: Extraction 3, Body 3, Clarity 5, Sweetness 5, Astringency 1. Style/time guidelines do not veto taste success. Keep the existing sensory model and interpret green as ideal for the user's shot/style.
- Recipe families primarily group successful coffee/style ratio approaches, not equipment, feed mode or time alone. Personal preferred families are setup-aware; all windows retain a centerpoint. Equipment calibration and family identity remain separate.
- Only qualifying all-green evidence may enter shared recommendations. Correcting a shot replaces its contribution; a non-green correction withdraws that contribution. Personal hiding alone does not remove legitimate shared evidence.
- Preserve contributor-balanced robust learning, two-contributor community confirmation, personal repeat confirmation, exact-style priorities, weak cross-style priors, and no direct cross-style time/grind copying. These workers are not implemented by creating family tables.
- Slow Feed remains a grinder condition. It does not itself create a recipe family or Experiment. Legacy unrecorded feed remains unknown; future explicitly disabled tracking follows the approved Standard Feed rule in the mutation API.
- Advanced features are hidden by default. Pressure/flow profiling remains tabled. Private note publication remains out of V1.

## This milestone: applied, not just drafted

Five migrations have been applied to the existing empty development Supabase project: identity/access, coffee catalog, equipment/workspaces, shots/recipes/community projections, and internal-function permission hardening. There are 31 application/internal tables, all with RLS. Migration source in GitHub was checked against stored Supabase migration SQL using matching Git blob hashes.

The database computes taste success, captures equipment snapshots from versioned records, rejects mismatched ownership/setup references, audits shot changes, and maintains one structured community projection per source shot. New or materially corrected projections stay pending quality validation until the future trusted validation worker accepts them. This fail-closed staging behavior is not a change to the intended automatic qualification workflow.

The internal automatic RLS event trigger remains enabled. Its function's browser-role execution grants were revoked to resolve the security advisor warnings; no security mechanism was disabled.

## Important implementation boundaries

This is a database foundation, not a usable cloud release. Except for limited preference edits and owned coffee submissions, direct browser writes are intentionally unavailable until controlled, revision-checked mutation APIs exist. Mutation receipts are scaffolding, not yet a working retry/idempotency service. Family statistics and confirmation labels remain server-managed records awaiting their calculation worker. Source verification and admin decisions still need real service workflows.

No real account, coffee, shot, secret, backup or prototype demo fixture was seeded. Temporary security-test fixtures were rolled back and post-test counts were checked. Browser authentication, email delivery/recovery, invitation redemption, session/offline behavior, multi-device conflicts, community aggregation, hosted frontend and Drive backup/restore have not been end-to-end tested.

## Delivery queue retained

1. Bring the tested v0.2.0 frontend/source into the repository without personal exports, secrets or mock data entering production storage.
2. Build authenticated setup/library/shot mutation APIs, idempotent retry handling and optimistic conflict checks. Add API-level positive/negative tests.
3. Implement admission and real signup/login/recovery; configure email delivery and allowed redirects before beta use.
4. Wire cloud sync without replacing local data until import mapping and recovery are verified.
5. Implement verification/admin workflows and contributor-balanced community learning; expose only validated results.
6. Configure unattended encrypted Drive backups and perform an actual restore drill, covering Auth and any stored files/configuration as well as application tables.
7. Test real devices and multi-account flows, then host the private beta.
8. Preserve the queued Mac double-click launcher and safer Documents-folder updater for local distributions; these were not part of the database milestone.

No new product question is required to complete this foundation. Infrastructure authorization/configuration steps will be requested individually when needed.


## Approved owner-only import exception, 2026-10-14

The owner explicitly approved a **one-time, existing admitted-account-only** historical-data import before full managed Supabase reconstruction, following live server validation and confirmed independent local recovery-copy download. This is a limited change to the *order* of owner-only testing, not a relaxation of other Locked requirements or external-beta recovery obligations. This approval is recorded in the updated canonical Master Specification v1.0 **Appendix A** and Decision Ledger approved amendment `OWNER-IMPORT-20261014` in the owner's ChatGPT Library. No other of the 79 baseline Locked decisions was modified.

Security implementation must keep `private.import_control.recovery_verified_at` **NULL** while managed-service restoration remains unverified. A server-side exception must be bound to the existing unique enabled member's UUID, be valid for no more than 24 hours, and re-lock automatically in the same transaction on first successful, atomic, idempotent owner import. It must refuse another owner even if admitted in the future. All existing owner checks, the reviewed file's hash, acknowledgement of recovery download, RLS policies, Netlify SSO, private original phone/Mac records and no-credit-card/no-domain constraints remain unchanged.

No real data was imported simply by granting approval. After authenticated UI commit, verify exact history and idempotence, then produce a **new** encrypted source-inclusive backup and confirm Drive delivery and offline restoration of nonzero imported rows. Full hosted Supabase configuration, SMTP, external multiuser signup/privacy, admins, and real beta device tests remain mandatory before external beta.

## Approved product refinements (2026-10-14)

- Every admitted user can rename their own equipment setups, without creating an equipment version or altering prior shot hardware provenance.
- Slow Feed is remembered per setup, from the most recent explicitly logged condition. Switching it OFF makes Standard Feed the next default. The active equipment version stores the preference. Cloud synchronization must guard against stale offline uploads, and historical Unknown must stay Unknown.
- Edit remains on the left and is the primary shot-history action. Make Current Recipe is separate on the right: a deliberate preferred-family/example choice, not a necessary step after each successful shot. Eligible Dialed In observations automatically inform their recipe-family windows.
- Place shot values and setup, Basket Dose, feed, style, date, and status within a compact header above the sensory ratings/radar. Make optimal use of phone width without crowding.
- Keep import/export under a collapsed Recovery options disclosure in Settings, not prominent routine controls. Cloud sync is normal; the development cache export is not a full user-data portability or restore service.

These are additive Locked decisions, leaving every unrelated Master Specification/Decision Ledger requirement intact. Preserve the historic import recovery gate, Netlify private beta protection, and community verification requirements.


## Approved automatic owner-release procedure (2026-10-14)

**Locked user instruction:** For all future requested and approved development updates, publish promptly to the existing, SSO-protected Netlify owner preview after required tests pass. Treat a task as incomplete until GitHub source, applied Supabase migrations (when needed), Netlify's actually published commit, and the Master Specification/Decision Ledger are checked and consistent. The approved publishing target is the existing Netlify project, and the development source branch remains `development/backend-foundation`; do not silently deploy from or merge into `main`.

Workflow: (1) update applicable Locked records and implementation in a reviewable Git commit; (2) validate schema/role security, required migrations, Node and mobile browser regressions, and the static build; (3) merge accepted code to the development branch; (4) publish on the existing Git-connected Netlify site with its build-time `npm test && npm run build:cloud` gate; (5) verify the deployed commit equals the accepted GitHub head and that Netlify SSO and import-save restrictions persist. A failed/pending build leaves the previously published site unchanged and must be reported. Stop rather than silently bypassing a test, access control, import gate or data migration safety condition.

The owner explicitly does **not** want to give a new per-change publishing approval each time the work and tests are done. This authorization does not launch the external beta, authorize public visitor access, enable historical import writes, or relax restoration, account, admin, community and privacy release requirements. If the Netlify integration prevents auto publishing, diagnose and request one minimal action; an unverified deployment is never described as live.
