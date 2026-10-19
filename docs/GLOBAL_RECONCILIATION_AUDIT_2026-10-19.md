# Global Cross-Service Reconciliation Audit — 2026-10-19

## Classification and scope
This is a verified **current-state baseline and first repository cleanup**, not a certification of all code paths or a declaration of full-beta readiness. Live reads were performed against GitHub, Supabase, Netlify, Google Drive and the available Gmail connection; the project history, original source archives and canonical Master Specification/Decision Ledger were cross-referenced. Cloudflare, Resend, Google Apps Script configuration and Netlify live billing lack direct account-read interfaces in this chat. No statements about restricted settings are represented as independently observed.

Owner-locked process: GitHub is the continuously maintained source of truth; original 79 Locked / 20 Open baseline records and all explicit later scoped decisions are preserved. No product decision is changed by this audit. Per-release approval remains required; **no new deployment or production schema/data change** is authorized by the prior consumed pilot-release approval.

## Verified live infrastructure (as observed 2026-10-19 UTC)
| Component | Verified state | Evidence/limits |
| --- | --- | --- |
| GitHub source | Active branch development/backend-foundation at bca1f92ff9df0118b3cb49859bd3150017eec25c prior to this cleanup | Ahead of published commit by 7 commits, affecting documentation only; compare 40b97f33...bca1f92f |
| GitHub backup ops | Default main at 1b7bc0716961999f550d1805797f3100615e9188 | Deliberate backup-only branch, not current UI source; preserve this split |
| Netlify | READY/current production deploy 6ad599e539cf6e672af21352, source 40b97f33bb1d828943e88d88ca0978c37baea18c, published 04:17:56Z | Public app URL app.dialincollective.com; nonproduction SSO enabled, production Netlify login disabled |
| Netlify configuration | Only SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY site environment variables returned; forms disabled; one coffee-url-preview function in ready deploy | Secrets scanning of 235 published files returned 0 matches; live balance not exposed |
| Netlify traffic | Available ~24h edge status counts: 200=691, 304=179, 404=148, 301=9, 499=4, 429=2, **5xx=0** | 404s largely automated WordPress probes (77 for /wp-admin/install.php), not evidence of an app route regression. robots.txt/favicon/apple-touch-icon also queried without files, optional cosmetic follow-up |
| Supabase | Project azviqqejypsefzilgonr ACTIVE_HEALTHY; Postgres 17; two active JWT-verified Edge functions | dic-verify-coffee v4, dic-preview-coffee v3 |
| Production tables | 23 public application tables listed, all RLS enabled; 21 private tables, none without RLS | 4 coffees, 16 shots, 16 notes, 2 eligible sanitized Community rows, 0 usable beta invitations; no production DML performed |
| Schema history | 30 hosted migrations; exactly 30 SQL migration files on development branch | Latest 20261019041437 Community and 20261019041452 admin controls; previous byte/manifest verification preserved in CI and docs |
| Accounts / admin | Two admitted members / one protected admin documented; owner-generated disposable admin invite issued and revoked 04:39–04:41Z, no usable code left | Owner browser and server metadata pass; full invitation redemption/negative checks and Remove/Restore browser acceptance still pending |
| Latest development CI | GitHub Actions run 39201458325 SUCCESS at bca1f92f | Node tests, lint, static cloud build and integrity all passed. Prior failures at intermediate commits were superseded by later green runs; this is not an independent exhaustive runtime test |
| Google Drive recovery | Latest cataloged scheduled encrypted ZIP 12137024904 on Oct 18, size 894341 bytes, previously byte-sha checked against GitHub | 2026-10-19 04:08 private raw backup.age (941134 bytes) was checked prerelease against matching GitHub artifact. Postrelease push-only GitHub run 39198804626 succeeded; no independently verified *scheduled postrelease* offsite copy or fresh end-to-end restore yet |
| Cloudflare + Resend | Historical signed-off sending (SPF/DKIM / password-reset receipt) and support forwarding test recorded in project docs | Live DNS/account rules, SMTP domain/DMARC configuration, sending limits and Cloudflare protections **not independently readable with current connectors** |
| Google Apps Script courier | Historical automated scheduled deliveries and recovery tests documented; latest postrelease courier receipt pending | Cannot directly audit its deployed code, triggers and failures in this session |
| Owner credit policy | Owner-managed Personal credits and per-release consent Locked. Snapshot Oct 17: 940 remaining of 1000, expires Nov 14 | Historical snapshot only. No live billing API or renewed screenshot requested. No deployment/credit spending |

## Supabase security and performance findings
- **Confirmed:** No public/private application table without RLS in the two inspected schemas. Anonymous role lacks private-schema USAGE; five public SECURITY DEFINER RPCs are executable by authenticated users, not anonymous users. Exposed RPCs require context-specific membership/ownership validation; an advisor warning is not proof of exploitable bypass. Current adviser: 5 authenticated SECURITY DEFINER WARN (intentional API design pending ongoing function-level review); 4 private RLS-without-policy INFO (possible service-only deny-by-default); 1 leaked-password-protection WARN (explicitly owner accepted for limited invite-only pilot, not a universal security waiver).
- **Performance INFO:** 10 foreign keys without separate covering indexes (in private tables), 13 currently unused indexes. Do not bulk-create or delete indexes on low-traffic production without workload evidence, explain plans and migration/recovery gates.
- **Confirmed counts:** Production select returned shots=16, shot_notes=16, coffees=4, community_rows=2, migrations=30, usable_invites=0.
- **Not proven:** Cryptographically signed ordinary member calls for every new Community/admin RPC, private data visibility via all network payloads, negative invite redemption and revoke race behavior, full production backup restore after current release.

## Code, build and drift\n- **Confirmed non-orphan distinction:** legacy/native import modules remain in source and import-unit tests for preservation, but `build_cloud.mjs` explicitly omits them from production assets; `scripts/audit/site-integrity.mjs` asserts none of the retired import UI files are shipped. Retaining recovery code as disabled source evidence is safer than deleting it as supposedly orphaned production logic.
- Primary source files, deployment entrypoints and core modules were inspected through the GitHub connector, including cloud/main, lib/engine, lib/model, community, authentication client, outbox, admin UI, URL extractor and validation, Netlify Function and Supabase Edge entrypoints. Current source files are not to be confused with the legacy 5289-line uploaded JSX prototype.
- Browser UI intentionally uses HTML templates and innerHTML; exported text escape function e() HTML-escapes ampersands, angle brackets, quotes and apostrophes. This is a source-level positive finding, **not** an independent proof that every template interpolation is safe. Existing checks and remaining real-browser XSS/accessibility/security review remain relevant.
- Edge Functions are JWT-protected and read server-side service credentials in their backend runtimes; Netlify frontend site environment contains only publishable Supabase coordinates. No value of a secret was copied into the report.
- Netlify's configured ignore hook gates builds to the authorized branch, a deliberate '[dic-publish]' commit subject, a well-formed ledger and the current owner-managed grant. Manual/API publishes can bypass that source gate, so provider access remains part of issue #27.
- Most recent seven development commits after the published SHA are documentation-only. **Do not publish or merge main** based on this audit. Historical release records are evidence of past releases, not fresh permission.

## GitHub issue reconciliation (provider-backed)
Initial live inventory: 36 issues (26 open/10 closed). This audit additionally recovered one previously untracked owner-approved future onboarding deliverable and created [issue #37](https://github.com/Schulzet3/The-Dial-In-Collective/issues/37), making the current tracker **37 issues: 27 open, 10 closed**. The already closed items include #35 migration reconciliation, #32 producer/parser release, #29 integrity gates and #8 seven-tier rollout; do not reopen or duplicate. No new issue was generated for a gap already tracked.

**P0 / core requirements:** #9 server-owned Community eligibility and corrections, #10 alternate recipe families and preferred windows, #11 real-member Community privacy acceptance, #12 recommendation evidence tiers, #13 experiment confirmation/lifecycle, #21 remaining multi-device/offline isolation acceptance (actual iPhone offline shot queue/save was owner-confirmed PASS). A working partial implementation is not equivalent to full acceptance.

**P1 / remaining feature and acceptance:** #5 source-backed coffee verification; #14 Custom styles; #15 frozen/new bag handling; #16 equipment/basket version-safe UI; #17 grinder direction and scale semantics (needs owner decision); #18 optional device-custodied screenshot extraction; #19 editable recommended style; #20 Hide Shot; #22 multi-device offline conflict; #23 admin review; #24 complete invite/revoke/redeem/remove/restore lifecycle; #25 roast-graphic browser acceptance; #26 mobile/accessibility; #33 URL extractor completeness; #34 real-member outlier confirmation retry; #36 technical pilot real-user acceptance/recovery evidence.

**P3 / explicitly deferred:** [#37](https://github.com/Schulzet3/The-Dial-In-Collective/issues/37) beginner guide or short walkthrough, approved for the stable future UI with format/timing intentionally undecided; not a blocker for the technical pilot. The future optional AI Coach/Ask AI, paid product and marketing homepage are aspirational/deferred, not auto-authorized implementation tasks.\n\n**P2 / monitoring and missing external materials:** #27 restricted provider controls, #28 courier/failure alerts/scheduled offsite delivery, #30 missing nine original research bodies and unavailable prototype workshop addendum. Preserve references; do not hallucinate missing research.

**Open proposal, not authorized:** #31 SEYspro-inspired Fast-Flow vs sixth espresso style. No change to Locked shot style taxonomy without owner decision.

## Documentation cleanup performed
- The previously cumulative CURRENT_STATUS (~115 KB) and chronological docs/README index (~35 KB) are stored verbatim under docs/archive as dated snapshots. They contained valid *historical* milestones but many superseded 'latest', 'not live' or pending statements.
- Active docs/CURRENT_STATUS is a concise current snapshot and next-action guide, and docs/README is a curated live index. No original evidence report, historical decision object, account data, migration, test or secret was deleted.
- Canonical MASTER_SPECIFICATION.md and DECISION_LEDGER.json are intentionally unchanged: historical original baseline and 23 explicitly scoped supersessions must not be silently rewritten for a housekeeping task.
- The archival snapshots preserve old claims as dated evidence rather than treating them as active requirements. The Git commit history also retains the original source.

## Next evidence-gated actions (no new owner product decision required)
1. Verify real invited ordinary-member Community listing/privacy and admin denial against signed browser sessions (#11, #36). Use personal data only in each authorized account; never disclose invitation plaintext or session tokens.
2. Prove single-use invite first/second redemption, revoked-code failure, protected admin, reversible Remove/Restore and history retained (#24, #36) using genuine user-mediated interaction and isolated non-destructive test accounts.
3. Verify first *scheduled* postrelease Drive archive, checksum against GitHub and isolated restore; test courier negative-path alerts without intentionally breaking production (#28).
4. Audit restricted Cloudflare/Resend/Apps Script settings via a supported authorized logged-in UI/session, including SPF/DKIM/DMARC, supported DNS records, forwarding, ownership, backup courier trigger logs (#27). Account connectors alone cannot accomplish these checks here.
5. Complete full code/security/recommendation/mobile acceptance by the existing P0/P1 issue sequence; use isolated fixtures and CI, no destructive production data experiments.

## Owner decisions still needed (ask one at a time)
- #17 grinder direction/scale normalization for all grinder types, if canonical ledger has not resolved the concrete ambiguity.
- #31 whether Fast-Flow is a sixth espresso style, recipe variant, or deferred.
- Individual later production release approvals under the owner-locked credit-aware release gate, only when a complete tested bundle is ready.
- Decisions about private offsite retention beyond the approved plan or irreversible user-data deletion only if separately scoped, legally reviewed and explicitly authorized.

## Residual verification limits
No login-capable browser session for Cloudflare/Resend/Apps Script, no direct production Netlify billing data, no authenticated second-user browser session in this audit, no complete bodies for the nine historical research pointers, and no local clone of the private GitHub repository (direct network unavailable). GitHub Actions results are provider-observed CI, not my own end-to-end reexecution. No production write, account removal, invitation generation, email send, paid upgrade or new release occurred.
