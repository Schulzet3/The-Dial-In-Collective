# Real non-admin New Coffee URL → Verified/Pending acceptance — 2026-10-16

**Status: PRE-FLIGHT PASS, genuine user-driven product URL and browser submission PENDING.** This is the next remaining real beta acceptance gate after hosted recovery completion. No production data was changed while preparing this checkpoint. The owner will use the already confirmed/admitted non-admin test account, not the administrator account or an invented new user.

## Product-corrected test prerequisite, owner question on 2026-10-16

**Current test is DEFERRED pending implementation of universal safe URL extraction.** The 2026-10-16 baseline below is still valid as evidence of deployed behavior. However, earlier suggestions to choose a URL from one of the four already-curated roasters were **not consistent with the original Locked Add Coffee requirements**. The Master Specification sections 9, 10, 11, 12 and Ledger require URL/screenshot extraction as first-class input without a product-level roaster count limit; user-device Claude BYOK remains optional. The four-domain trust directory is still appropriate for current **automatic canonical Verified promotion**, but **must not be treated as a hard limit on trying to extract the webpage's available facts**. See [universal extraction implementation gap](UNIVERSAL_ROASTER_URL_EXTRACTION_GAP_2026-10-16.md).

Once safely implemented and deliberately published, the genuine nonadmin acceptance should begin with an official product URL from a **previously unknown roaster**, verify best-effort metadata and trustworthy citation/provenance, avoid blank-field fabrication and silent canonical merges, and confirm no automatic Verified designation without genuine official-domain/release evidence. Include old curated-domain regression. Until deployed, the current product will safely refuse unknown domains for preview; do not mislabel the broader acceptance PASS.

## Production baseline: read-only Supabase query, 2026-10-16

- Active production Supabase project: `azviqqejypsefzilgonr`; app `https://app.dialincollective.com`; published Git SHA `4e7d4a834dd92ec79f8cd99b373374fc0a584ef8`.
- Two confirmed, admitted Auth members: one sole admin and one non-admin.
- Global catalog **4 Verified coffees**, **0 Pending** and **0 Conflict** submissions, **4 submissions** (all from original admin), **4 personal library entries** (all admin).
- Original non-admin account has **0 library entries, 0 coffee submissions and 0 shots**; original admin history includes all **16 total shots**.
- Historical import saving remains **disabled**.
- Four existing canonical identities: Sweet Bloom **Hambela**, Proud Mary **Bavyeyi IV**, Orinoco Coffee & Tea **Yirgacheffe**, Queen City Collective Coffee **David Armijos**. All four already Verified; do not blindly create new global duplicates from these.
- JWT-protected production Supabase Edge Functions: `dic-preview-coffee` v1, `dic-verify-coffee` v3; both `ACTIVE`, `verify_jwt=true`.
- No previous URL-preview quota rows. Official roaster host allowlist includes `sweetbloomcoffee.com`, `proudmarycoffee.com`, `orinococoffeeandtea.com`, `queencitycollectivecoffee.com`. Other legitimate roasters can be saved by manual entry, but untrusted source metadata cannot automatically approve them.

## Current published UI verified from exact deployed GitHub SHA

1. Sign into the live production URL **as the non-admin account** and choose **Add Coffee**. In **New Coffee**, paste a real official product URL under **Roaster Page URL**.
2. Press **Autofill From URL** (read-only source/facts request; may record a small per-user request-quota count, but saves no coffee). If recognized, display **Details Found On Official Roaster Page** and **Apply Suggested Details**; existing typed fields are never overwritten. If unrecognized/unsupported/unavailable, provide a clear explanation and safe manual entry. Only secure official host, supported product path and safe query parameters are fetched.
3. Review name, exact roaster, release/harvest (if provided), origin, process, other product fields. Check the **URL/source** against what the official page actually says; never infer an unstated harvest or variant. URL alone and roaster match are not enough for auto-verification.
4. Before final **Add Coffee**, obtain owner confirmation that this is a legitimate coffee intended to be added to this test account. If existing-identity match appears, the app must require confirmation on ambiguous harvest/release rather than silently merge. An exact same release can reuse verified canonical identity; an actually distinct or uncertain release remains separately represented.
5. Save once and observe status: the non-admin addition is immediately usable in a **Pending** private library entry while a trusted official-source check may promote it to **Verified** only on matching product evidence. Verification must preserve original personal entry ID and all shot references. If source unavailable, pending stays usable; no false verified claim.
6. Inspect the actual production database **read-only** after submission: compare coffee/submission/library/source/audit counts against above baseline, inspect only the tested nonadmin's new entry and source evidence, ensure owner's 4 coffees/16 shots and catalog provenance remain intact, pending stays out of community data. Verify browser refresh keeps expected status.
7. Additional distinct cases later: exact existing canonical reuse without duplicate, related spellings and harvest ambiguity requiring user choice, manually entered unknown-roaster Pending, independent account privacy, eventual legitimate trusted proof/verified promotion. Never create fake public coffees to satisfy tests.

## Acceptance/reporting discipline

- **First user question only:** provide the real roaster product-page URL for a *new* coffee they actually want to add to the nonadmin test account; a recognized roaster is preferred for the first URL-autofill test. Do not ask the user to paste a password, private token or personal email.
- If an official URL is not available, choose a legitimate coffee with accurate manual fields for the Pending fallback case. Do not silently treat successful simulated SQL tests or the existence of the UI as a real user pass.
- No new code deploy, Supabase migration, Auth invite, Cloudflare change, paid subscription or historical import switch is authorized by this test preparation.
- This checkpoint adds no new Locked product decisions and does not modify the canonical specification/ledger.
