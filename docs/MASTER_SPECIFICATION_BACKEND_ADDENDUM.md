# The Dial In Collective
## Master Specification: cloud foundation addendum

This is a supplement, not a replacement for the Master Specification, Decision Ledger, and the approved prototype addendum shipped with v0.2.0. Preserve all unchanged Locked decisions. New numerical implementation choices are not silently promoted to product requirements. Product copy uses The Dial In Collective, dial in, dialed in, and dialing in without hyphens. The existing GitHub repository identifier is retained unchanged.

## Approved release direction

The next external beta must have real accounts, cloud syncing and shared community data before it is hosted for testers. The local-first prototype phase remains a completed/ongoing testing phase, not the final beta architecture. Its interface and behavior are the visual baseline. Community/admin previews must not be mistaken for real hosted functionality.

Development uses the existing Supabase Free organization/project. Do not create paid projects, paid branches, upgrade plans or buy a domain without approval. Source changes live in the private GitHub repository on development/backend-foundation. The local phone prototype is unchanged by database migrations.

Google Drive is the approved automatic backup destination. The agreed folder is The Dial In Collective Backups. A ChatGPT Drive connection is not authorization for an unattended job. Scheduled encrypted exports, authentication/storage/configuration coverage, failure alerts, retention, and a tested restore remain required before real beta data. A database status table alone does not implement backups.

## Identity and access

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
