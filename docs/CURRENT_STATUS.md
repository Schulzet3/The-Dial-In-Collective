# The Dial In Collective — Current Status

**Checkpoint: October 17, 2026 (UTC and America/Denver).** Read this first, then [Master Specification](MASTER_SPECIFICATION.md), [Decision Ledger](DECISION_LEDGER.json) and [AGENTS](../AGENTS.md). All Locked decisions remain authoritative. This file describes observed progress, not new requirements.

## Resume here — Work final sweep, then release review

**The owner requested the exact Queen City URL refinement first and will use Work for the final app/error sweep afterward. That extractor pass is complete in development. Do not publish yet.** Run the Work sweep, fix and document confirmed issues, then request the owner's current Netlify credit screenshot before the already-approved coordinated publication. Do not reopen the settled seven-tier scale, five coffee assignments or 12-preview policy.

Current tested implementation: `4486e58ff82d4a8de36a5a71bf1aa8650b65e8f9` on `development/backend-foundation`. Later documentation-only commits do not alter that tested implementation. Always read the actual branch head before a write and use a non-forced expected-head update.

**Read the [Queen City improvement and Work handoff](QUEEN_CITY_EXTRACTOR_AND_WORK_HANDOFF_2026-10-17.md)** for files, regression cases, live evidence, limits and exact next steps. The prior complete status is preserved byte-for-byte in [CURRENT_STATUS_PRE_QUEEN_CITY_2026-10-17.md](CURRENT_STATUS_PRE_QUEEN_CITY_2026-10-17.md); its earlier next-action paragraphs are historical, not current instructions.

## Latest extractor changes and observed results

The exact owner link is `https://queencitycollectivecoffee.com/products/banko-gotiti-washed-ethiopia?variant=52819513737447`. The extractor now captures **eight explicit core fields**, including the previously omitted **Banko Gotiti CWS producer/washing-station name**, plus source-only fermentation and drying details. Variant and canonical URLs returned identical factual fields. No unpublished roast, harvest, espresso recipe or importer-as-producer was invented.

A bounded paired-specification helper replaces two loose Queen City parsing blocks. New cases cover inline formatting, accents, adjacent paragraphs, valid altitude ranges, competing source tuples, compound processes, related-product/template/navigation exclusion, absent evidence and preservation of typed values. **26 new tests** were added across two files. Original fetch/authentication/privacy/quota controls and the 900,000-byte cap are unchanged. No new dependencies or paid services were introduced.

| Independent check on the implementation SHA | Result |
| --- | --- |
| [Full Node test suite, locked install, static build and private-source exclusion](https://github.com/Schulzet3/The-Dial-In-Collective/actions/runs/39051887637) | PASS |
| [Cloud regression, syntax/build and synthetic 390px Chromium QA](https://github.com/Schulzet3/The-Dial-In-Collective/actions/runs/39051887663) | PASS |
| [Actual bounded public-source probe and explicit Queen City assertions](https://github.com/Schulzet3/The-Dial-In-Collective/actions/runs/39051887621) | PASS |

The public probe made 11 requests: two Queen City URLs for the same coffee, one homepage negative control, and eight other products. Nine product requests parsed, representing eight distinct coffees. All previously successful roaster cases remained parsed. **The Picky Chemist still exceeds the 900 KB cap** and falls back safely; this is not fixed or certified as supported. Other unextracted fields, JavaScript-only data and future page changes remain limitations, not permission to guess. [Earlier multi-roaster inventory](COFFEE_URL_MULTIROASTER_VALIDATION_2026_10_17.md).

## Production and release boundary

**Fresh Netlify read after this pass:** published deploy `6ad2c872ad7a8fa78dc410dc` remains READY, production SSO off and nonproduction SSO on. Its last recorded source is `f08dfda99f46b25240cb8cc35c46d2c3c76344b8`, still the old five-tier frontend. No Netlify publication, SQL write/migration, Edge deployment, account change, billing change or backup change was made during this extractor pass. Automated public probes did not consume member preview quota.

The owner already approved using credits for the consolidated release, but **now wants Work's final sweep before publishing**. The current Netlify balance is not available through the connected project API. Keep [NETLIFY_CREDIT_LEDGER.json](NETLIFY_CREDIT_LEDGER.json)'s current verification gate and obtain the screenshot after the sweep; do not fabricate a balance, clear a gate, buy credits or change plans.

**After** the sweep and credit check, publish the tested seven-tier frontend and improved extractor together using the established deliberate release marker. Verify the live compatible frontend before running the guarded coffee data migration. Coordinate the staged JWT-protected official preview Edge parser. Refresh the published-source backup pin only after successful release verification. [Detailed ordered rollout](SEVEN_ROAST_TIER_ROLLOUT_2026-10-17.md), [tracking issue #8](https://github.com/Schulzet3/The-Dial-In-Collective/issues/8).

## Locked decisions and existing production work

- **URL preview quota:** 12 allowed claims per account per 24-hour budget window; 30-second account-wide cooldown, shared across preview routes. SQL-only migration `dic_preview_daily_budget_12`, version `20261017050220`, was previously applied and verified. Current window is 24 hours from its first allowed claim, not strict sliding event accounting. Manual Add Coffee / Log Shot remain available. This pass did not alter the rule.
- **Seven Title Case roast levels:** Ultra Light → Very Light → Light → Medium-Light → Medium → Medium-Dark → Dark. Preserve the original five meanings and starting priors; old Light-Medium is a read-time alias. New lightest categories currently borrow Light priors rather than invent new extraction precision. [Locked amendment](DECISION_LEDGER_2026_10_16_SEVEN_ROAST_TIERS.json).
- **Approved final coffee values:** Hambela Light; Yirgacheffe Medium-Light; Bavyeyi IV Very Light; David Armijos Very Light; private Pending Wuri Very Light. **The final coffee corrections are still pending.** No roast values were changed here. Prior production compatibility migration `dic_seven_roast_tier_compatibility` (`20261017053258`) accepts new labels and the transitional legacy spelling. Apply `supabase/migrations/20261017064000_dic_seven_roast_owner_data.sql` only after the new frontend is live; preserve original source evidence, IDs, all shots, private audit and Wuri's Pending status.
- **Fake Hambela shot:** exact permanent purge is complete and documented; do not repeat it. Earlier independent checks retained 15 legitimate stored/visible shots, including 14 legacy imports, and the one community shot/link. These are prior SQL observations, **not a fresh database audit in this pass**. [Exact purge evidence](EXACT_HAMBELA_TEST_SHOT_PURGE_2026-10-17.md).

## Broader work remains outstanding

The owner's upcoming Work sweep is **not completed by this focused parser change**. Use the [26-finding issue reconciliation](AUDIT_RECONCILIATION_BACKLOG_2026-10-17.md), [decision/implementation crosswalk](DECISION_IMPLEMENTATION_CROSSWALK_2026-10-17.md) and live GitHub issues, not old transcript to-do lists. Existing issues #5 and #8–#30 are not closed by this pass; refresh their current state before acting.

Remaining areas include recommendation-tier/family and community completeness, missing workflow bindings, real iPhone/PWA/offline/cross-device tests, writable admin/invitation workflows, safe conflict handling, source-extraction edge cases, and provider/security review. Do not remove deliberate historical-import or recovery code as "unused" without proving it has no retained purpose. A passing mock/browser suite does not establish production authorization/security or complete beta readiness.

[Security/provider review #27](https://github.com/Schulzet3/The-Dial-In-Collective/issues/27) and [backup/alert resilience #28](https://github.com/Schulzet3/The-Dial-In-Collective/issues/28) retain their unresolved access/evidence limits: leaked-password protection review, private provider settings, alert delivery/overlapping watches and independently encrypted backup coverage of current development documents. The `main` branch remains backup operations, not active app source. Never merge into it casually or replace its verified published-source pin with unapproved development code. Missing original research bodies remain tracked, not recovered by inference.

## Completed historical evidence to preserve

Real owner logging/reload, second-account isolation/admission checks, SMTP and support-mail acceptance, exact encrypted restoration, managed Supabase/Netlify recovery and cleanup, and prior DNS reconstruction evidence remain valid for their dated scopes. Do not repeat the passed recovery drill or original Wuri save without a changed-code/regression reason. See the [preserved complete previous status](CURRENT_STATUS_PRE_QUEEN_CITY_2026-10-17.md) and [documentation index](README.md) for all original reports, provider coordinates and acceptance qualifications.

At every milestone, record source SHA, actual CI results, live-versus-staged status, uncertainty, and the exact next action here. Product changes require explicit approval and matching specification/ledger updates; routine implementation evidence does not supersede Locked requirements.
