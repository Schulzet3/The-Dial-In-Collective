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

## Netlify credit conservation amendment — explicitly owner-approved 2026-10-14

This **revises only the publishing cadence** of the previous Locked automatic owner-release policy (OPS-20261014-01). The owner approved batching changes and tests in GitHub, then making **one finished, tested, deliberate Netlify production release per bundle**, instead of treating every intermediate GitHub push as a publish instruction. We must continue to ship completed work promptly **when Netlify credits are confirmed sufficient**. A skipped or credit-paused deploy is not live and must never be represented as live. Keep all other Locked release, security, recovery, identity and product decisions unchanged.

Netlify Free currently includes 300 credits per monthly billing cycle; each successful production deploy consumes 15. The owner's 2026-10-14 Netlify usage screenshot proves 22 production deployments (330 credits), web requests (0.1), bandwidth (0.1), total 330.2 consumed and zero remaining. Netlify blocked further production publishing for this billing cycle. This was deployment-frequency usage, not AI inference or compute. Netlify will need to resume paid-feature capability on the new cycle before publishing the queued UX changes. No upgrade or payment is authorized.

**Operational rule:** Work in reviewable GitHub feature branches, run CI and synthetic phone tests there, and merge only completed bundles to `development/backend-foundation`. Production builds are now guarded by `netlify.toml` and `scripts/netlify/should-ignore-build.mjs`; only `Release DIC: ... [dic-publish]` subjects with recently verified, sufficient credits may publish. All other Git commits remain source/spec updates only. A future build hook could bypass the ignore command and must not be used to circumvent the gate. Dev/PR/branch deploys are non-production preview contexts and are not charged as production publishes under the current Netlify schedule; GitHub Actions tests do not consume the site's Netlify production deploy allowance.

The authoritative **point-in-time** usage snapshots and release gate assumptions are tracked in `docs/NETLIFY_CREDIT_LEDGER.json`. The Netlify connector does not expose billing balance or cycle reset dates; never fabricate a live balance, silently reset the snapshot, or infer that a successful GitHub merge equals a published Netlify deploy. Before each intentional release, recheck the real provider balance and update the ledger. Following a successful Netlify publish, verify the SHA of the deployed version, SSO, and recovery gate, and update the recorded usage. No new Mac installation, subscription, domain or upgrade required for GitHub testing.


## Add Coffee alias recognition and verified identity matching (2026-10-14)

This is **implementation of existing Locked rules** in Master Specification sections 8.3, 9.1–9.4, 10, 11 and 32, not permission to equate a roaster with its individual coffees or unrelated harvests. Brand normalization removes case, spaces, punctuation/hyphens, accents, and terminal generic business descriptors such as "Coffee Roasters". It maps `Sweet Bloom`, `Sweetbloom`, `Sweet Bloom Coffee`, `Sweet Bloom Coffee Roasters` and `Sweet-Bloom` to the same **roaster identity**. The reviewed registry separately records trusted official branding and permits curated exceptional aliases; untrusted user entries cannot approve their own alias. The official example is grounded in `https://sweetbloomcoffee.com/pages/locations`.

The authenticated, admitted-only `dic_find_coffee_matches` RPC returns only verified canonical coffee candidates. Only a **unique** high-confidence match can be linked directly: exact roaster and coffee name together with either a compatible explicit release label or a recent, previously curated official product page with no conflicting origin/release. Normalized tracking parameters never equate meaningful product variants. Ambiguous names, fuzzy spellings and release conflicts require **user confirmation**; selecting "different coffee" preserves an independent Pending entry. No canonical records, personal shots, hidden data, or community contributions are rewritten. A recognized brand does **not** verify any new coffee automatically. New coffees lacking verified source evidence remain Pending and privately loggable.

As of this checkpoint Supabase has **0 canonical verified coffees and 4 Pending submissions**. Therefore deterministic identity matching is implemented, but no honest "most coffees auto-verified" coverage claim is possible yet. A subsequent curated/source-backed product-catalog ingestion and verification pipeline (exact roaster product pages, extract/release metadata with provenance, cross-check aliases and conflicts, preserve audit history) is required before a large share of new submissions can be verified automatically. Such a source acquisition stage must not make arbitrary HTTP/DNS fetches from untrusted user URLs or treat a model-generated guess as evidence. Preserve existing Admin-only access, all other Locked decisions, data integrity and the Netlify 0-credit publish gate.

## Locked amendment: automatic coffee approval with canonical-first identity (2026-10-14)

**Explicit new owner decision:** Only the owner-administrator's **own** coffee entries are automatically approved on submit, after conservative match/conflict checks. This is the administrator exception to the older global Pending rule. It does not permit unauthenticated, non-admitted, or other-member users to grant themselves approvals.

Other admitted users may enter and privately log new coffees immediately. Source-backed, uniquely identified releases are automatically verified by trusted, JWT-protected roaster product checks; a user-confirmed legitimate alias uses the earliest existing canonical coffee ID and primary name. Potential duplicates must first be offered to the user for confirmation; uncertain product identity, different harvests, conflicting origins or URLs, broken source pages and unknown roaster domains remain Pending, without routine admin workload until escalation is truly needed. Ambiguous self-confirmations that would lose data remain blocked.

The first **original database submission**, not merely the first approval timestamp, controls the primary coffee name globally. Later variants such as Hambella vs Hambela or Sweet Bloom Coffee vs Sweet-Bloom become aliases where confirmed. The original personal library ID, every shot and recommendation family must remain referentially stable. Automatic canonical identity re-association is transactionally audited and idempotent; no bulk data rewrites, silent cross-roaster merges or untrusted user-published source proof.

The original four owner submissions (David Armijos, Yirgacheffe, Bavyeyi IV and Hambela) are verified as canonical coffees, retaining 14 historical shots. The official product links for the latter three were checked; David Armijos's submitted direct page was not reliably reachable and is marked as administrator approved with only original source-label evidence. The protected source-check worker is deterministic and rate-limited, with curated hostnames only. No Netlify publication or public beta status change.

See [coffee automation checkpoint](COFFEE_VERIFICATION_CHECKPOINT_2026-10-14.md). These revised Locked rules do not waive the requirement to preserve source provenance, compare release-specific facts, log changes, maintain RLS, keep private pending shots out of community, or satisfy other release gates.

## Approved domain structure and user onboarding resource (2026-10-14)

**Domain structure — Locked by the owner.** The app's permanent user-facing hostname will be `https://app.dialincollective.com`, using the **existing** Git-linked, SSO-protected Netlify project. The root `https://dialincollective.com` is reserved for a later public/marketing homepage; until then it may redirect to the app after HTTPS, authentication callbacks, and access controls work. No new Netlify project, hosting subscription, or production release is authorized by this domain choice. Retain the existing `*.netlify.app` host during migration for safe owner acceptance, and keep beta admission and SSO restrictions unchanged until their existing launch gates pass.

Cloudflare manages DNS and free inbound support-address routing; the owner confirmed a working delivery test for `support@dialincollective.com`. The owner also confirmed a working Supabase password-reset email using Resend Free, with sender `no-reply@auth.dialincollective.com` and verified sending SPF/DKIM. The distinct `auth` subdomain must not be overwritten by web/app DNS or apex routing changes. These owner-observed tests do **not** prove real outside-user signup or invite delivery. After the new app hostname is established, configure exact allowed Supabase Auth redirects and production Site URL, verify TLS, and test genuine authentication and password reset before shifting owner traffic. Do not loosen the private Netlify SSO, RLS, beta gate, or historical-import guard. Any root redirect should avoid intercepting email or app authentication hostnames.

**Future onboarding material — owner-approved deliverable, format and timing to be finalized.** Publish beginner-friendly written instructions and/or a short video walkthrough of the *then-current* app's available functions. Prioritize the shortest Log Shot → Rate → Recommendation path, and explain adding and verifying coffees, ratings and recommendations, equipment setups/Slow Feed, history and editing, available recovery settings, and relevant member versus administrator features. Match the actually shipped features; do not claim unfinished prototype parity is already live. Keep guides concise, mobile-friendly, and easy to update as functionality changes. No tutorial production, media subscription, new frontend screen, or Netlify deployment is implied now.


## Locked visual refinement and review hold - 2026-10-15

The owner approved one coordinated visual refinement: vibrant filled badges with distinct borders in both themes; a consistent warm coffee-inspired palette; defined cards, dividers and secondary buttons; a conspicuous Search & Sort button; cleaner display ligatures; Title Case for standalone interface labels while preserving sentences, acronyms, units and personal names; grouped Settings with Add Another Setup directly below Active Setup, Cloud Sync near the bottom and icon-labelled Sign Out last. Admin follows the app's saved Light/Dark/System appearance, not a separate theme setting. Preserve the fastest Log Shot -> Rate -> Recommendation flow, calculation semantics and historical data.

**Explicit amendment to UX-20261014-05:** Remove the routine Recovery Options section and manual import/export entry points from the beta Settings UI. The earlier proposal to unlock general-purpose imports is withdrawn. Preserve historical import source, the closed server-side import gate, encrypted backups and operator recovery procedures. Keep password recovery and the emergency download for unsynced pending changes; sync is not a backup and full hosted recovery is not newly certified.

**Release hold:** Stage on work/visual-refresh-20261015 for screenshots and approval. Do not publish to Netlify (production or preview), change Netlify SSO, admit accounts, or apply database migrations in this visual work. The approved design direction is not permission to release. Actual screenshots must render the implementation using labelled synthetic fixtures without production writes.
