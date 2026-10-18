# Current Status — The Dial In Collective

Updated: 2026-10-17. Active application/documentation branch: `development/backend-foundation`. `main` remains backup operations.

**The available-source sweep, confirmed fixes and applicable local/GitHub checks are complete. Do not publish. Full beta readiness is not established.** Final tested code: `670a104eb670049b001b4ab182b05edeb2a2de5c`, following initial implementation `035337e03f2391d4acbfce2607ed4342ef01bfe7`. Restricted private provider checks and the limitations below remain unresolved. See [the complete sweep report](APP_WIDE_ERROR_SWEEP_2026-10-17.md) for findings and verification boundaries.

## Development checkpoint

Baseline source: `d788572438bae2e4c23f4264e783f798a733bbb7`, following [the Queen City handoff](QUEEN_CITY_EXTRACTOR_AND_WORK_HANDOFF_2026-10-17.md). Confirmed fixes cover account-switch privacy races, stale admin data after auth changes, unrelated/conflicting coffee-page evidence and an unbounded incoming request read. Unused bindings were removed, lint coverage expanded and the visual workflow connected to the active branch. Its stale two-step autofill test now checks current behavior without changing that behavior.

Verified evidence: **291 Node tests pass; zero lint errors/warnings; cloud build and 26-asset import graph pass; 30 synthetic mobile checks and 117 visual checks pass, with 36 screenshots.** [Final unit/lint/build](https://github.com/Schulzet3/The-Dial-In-Collective/actions/runs/39070714855), [final mobile/regression](https://github.com/Schulzet3/The-Dial-In-Collective/actions/runs/39070714841) and [final live source probe](https://github.com/Schulzet3/The-Dial-In-Collective/actions/runs/39070714862) passed on the final code SHA. [Visual/integrity acceptance](https://github.com/Schulzet3/The-Dial-In-Collective/actions/runs/39070423151) passed on the unchanged UI/harness in the initial implementation SHA. The final source probe confirms Queen City and restored Proud Mary fields; nine product URLs parsed across eight coffees, with the homepage rejected and Picky Chemist still oversized. Deprecated v4 actions were replaced. The browser fixtures use mock services/storage, not real login or native IndexedDB. No fresh production SQL test or arbitrary-site/device completeness is claimed.

All changed file contents were fetched back from their exact GitHub commits and matched. [#29](https://github.com/Schulzet3/The-Dial-In-Collective/issues/29) is closed after its active-branch visual gate actually passed; #8/#27/#28 were updated and remain open. Final handoff edits are documentation only.

The runtime dependency audit reports no known vulnerabilities. A final freshness check found Supabase SDK 2.118.0 available; the tested 2.117.3 pin is retained after reviewing the upstream release notes, which identify no fix for a confirmed app problem. See the report for the exact update boundary.

The older Locked Apply Suggested Details wording and later published one-click autofill behavior need a narrow decision-record reconciliation if no later explicit approval resolves them. Both historical wording and current product behavior remain intact; the optional Apply helper was not removed. This does not reopen the already-decided quota or roast categories.

## Live system and preserved data

Fresh read-only checks still show READY Netlify deploy `6ad2c872ad7a8fa78dc410dc`, source `f08dfda99f46b25240cb8cc35c46d2c3c76344b8`, the older five-tier frontend. Production extra SSO is off; nonproduction team SSO stays on. No publication, Edge deployment, SQL write, account/provider setting change or purchase occurred in the sweep.

Supabase is ACTIVE_HEALTHY. Independent counts retain **15 legitimate stored/visible shots, four Verified coffees, one community shot and one contribution link**, and no row for the already-purged test-shot UUID. The exact purge is complete; do not repeat it. No Storage objects are present. Applied schema still includes the 12-preview budget and seven-tier compatibility; the final coffee-data migration remains unapplied.

The latest reviewed scheduled backup [39034890506](https://github.com/Schulzet3/The-Dial-In-Collective/actions/runs/39034890506) succeeded with a fresh encrypted artifact. Main still pins the verified published source and retains artifacts 30 days. Today's exact Drive delivery/hash and live Apps Script triggers remain unverified; incomplete Drive search results are not proof of missing files. Prior exact encrypted restoration and provider recovery evidence remain valid for their dated scope.

## Locked rules and staged rollout

- URL preview: **12 allowed claims/account per 24-hour budget window**, with an account-wide **at least 30-second cooldown** shared across routes. The window starts at its first allowed claim, not a strict sliding event log. Manual entry and logging remain available.
- Seven Title Case roast levels: **Ultra Light, Very Light, Light, Medium-Light, Medium, Medium-Dark, Dark**. Preserve original five-tier meanings/priors; legacy Light-Medium is a read alias; the two new lightest levels inherit Light priors for now.
- Approved final coffees: **Hambela Light; Yirgacheffe Medium-Light; Bavyeyi IV Very Light; David Armijos Very Light; private Pending Wuri Very Light.** These exact corrections remain pending. Apply `supabase/migrations/20261017064000_dic_seven_roast_owner_data.sql` only after the compatible frontend is verified live. Preserve source evidence, IDs, all shots, private audit and Pending status.
- Keep the outbound **900,000-byte** preview limit and DNS/TLS/redirect/decompression protections. The Picky Chemist's oversized page remains an explicit limitation.
- The current Netlify credit balance is not exposed by connected reads. Preserve [the credit ledger](NETLIFY_CREDIT_LEDGER.json) and obtain the owner's current screenshot only when moving to a later authorized release. The current instruction is **do not publish**.

## Readiness and unresolved limitations

The sweep fixes are staged for release review; **the complete beta is not ready to be declared finished**. [The reconciled issue backlog](AUDIT_RECONCILIATION_BACKLOG_2026-10-17.md) and [decision crosswalk](DECISION_IMPLEMENTATION_CROSSWALK_2026-10-17.md) still govern unfinished community, family/experiment, recommendation, PWA and workflow features. #22/#26 retain real iPhone/Safari, offline/cross-device and accessibility acceptance. Passing mock tests do not close those issues.

[#27](https://github.com/Schulzet3/The-Dial-In-Collective/issues/27) retains disabled leaked-password protection and restricted GitHub/Netlify/Cloudflare/Resend controls. One recent Auth refresh lookup timeout was observed; its cause is unconfirmed. [#28](https://github.com/Schulzet3/The-Dial-In-Collective/issues/28) retains current Drive courier/Apps Script/retention and independent development-document backup checks. [#30](https://github.com/Schulzet3/The-Dial-In-Collective/issues/30) retains the nine missing research bodies and workshop source. None is certified solved through inference.

## Exact next action

The requested sweep is handed off without publishing. Resolve the documented owner/provider access and acceptance limits as separately authorized; do not turn a passing suite into a full-beta completion claim. For a later authorized release, obtain the current Netlify credit screenshot and follow [the ordered seven-tier rollout](SEVEN_ROAST_TIER_ROLLOUT_2026-10-17.md), coordinate the official Edge parser, verify the compatible frontend before the approved data correction, and update main's backup pin only after successful release verification.

The [complete pre-sweep status](CURRENT_STATUS_PRE_SWEEP_2026-10-17.md), [pre-Queen City status](CURRENT_STATUS_PRE_QUEEN_CITY_2026-10-17.md), [purge report](EXACT_HAMBELA_TEST_SHOT_PURGE_2026-10-17.md) and [documentation index](README.md) preserve historical acceptance and provider coordinates. Earlier next-action text does not override this status or the owner's current no-publish instruction.
