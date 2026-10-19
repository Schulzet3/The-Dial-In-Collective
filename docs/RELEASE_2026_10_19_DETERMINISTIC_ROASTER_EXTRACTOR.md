# Production release: deterministic universal coffee URL extractor
**Release request:** October 19, 2026 UTC.  
**Owner authority:** Single explicit publication approval from the owner after robust deterministic extraction and final tests (issue #33). This document is the exact Git-connected release-intent commit. Publication is **pending independent Netlify READY/current verification**; this commit alone is NOT proof of release.

## Tested source baseline
- **Application source SHA before release marker:** `4de4dc5fbdc9c7a86a3ea4f9eb28d903411136c2`.
- All **380 Node tests**, zero-warning ESLint, cloud build and package integrity passed [39320786487](https://github.com/Schulzet3/The-Dial-In-Collective/actions/runs/39320786487).
- Final mobile 390px cloud/account/owner-admin synthetic QA passed [39320786249](https://github.com/Schulzet3/The-Dial-In-Collective/actions/runs/39320786249).
- Private visual review prior identical browser UI passed [39320386964](https://github.com/Schulzet3/The-Dial-In-Collective/actions/runs/39320386964).
- Real pinned-HTTPS roaster matrix passed [39320640613](https://github.com/Schulzet3/The-Dial-In-Collective/actions/runs/39320640613): 31 URLs, 25 parsed, 1 deliberately rejected homepage, 1 deliberately rejected >900 KB page, 4 unavailable/removed URLs. Not an authenticated owner-browser acceptance.
- Corvus Echo Gesha: source-supported Panama, Finca Deborah, Jamison Savage (named grower), Gesha, cascara-infused carbonic maceration with washed finishing and jasmine/Cabernet-grape/tropical notes, no guessed roast/elevation.
- Corvus Dead Reckoning: distinct source-backed origins `Ethiopia, Colombia, Peru`; `Other/Unknown` for Natural+Washed components; published `18g ± 0.2g` dose, `40–48g` yield, `24–32s` time. Keep component names in review-only details. Distinct verified named producers are retained where actually specified; unlabeled lot names do not become producers.
- Additional source-safe parsing: bounded selected-product narrative and HTML labels, named farms/growers, multilingual labels, exact source-tied recipes, inline and multiline blends, no repeat countries/farms, invalid/partial blend lists not treated as complete.

## Latest owner-locked scope
**NO NEW AI integration.** The optional Claude browser module, key settings, service payload, Anthropic API domain and AI tests were removed from the production source. Earlier same-day BYOK discussion is historical and explicitly superseded by the later owner's decision in Master Specification and Decision Ledger. Preserve originals of 79 Locked baseline decisions as historical evidence, do not silently replace other product requirements.

## Release safeguards and authority
- Single deliberate `[dic-publish]` commit on `development/backend-foundation` only. No repeated releases or preview branch deploys.
- Preserve Auth/member gating, 12 previews per account/24h, >=30 s cooldown, HTTPS/SSRF/pinned DNS/900 KB limits, existing 7-tier roast selector, clean single-click blank-only Autofill and manual Add Coffee review, canonical Verified/Pending release handling and all historical shot data.
- No Supabase SQL/migration, Edge, Cloudflare, Resend, credentials, member data, private data export or billing plan change.
- Preflight database read-only: `public.coffees=4`, `shots=16`, `shot_notes=16`, `community_shots=2`, `private.beta_members=2`, `private.app_admins=1`, `coffee_submissions=5`, `library_entries=5`; 30 applied migrations, Supabase ACTIVE_HEALTHY.
- Current Netlify site before release `6ad599e539cf6e672af21352` at prior source SHA `40b97f33`, production-only app Auth protected; branch previews under team SSO.
- Owner manages Netlify credits. Historical owner-observed 940 Personal credits on Oct17, grant expiry November 14, 2026; actual live balance and final billing debit are NOT readable from the linked provider. Guard requires >=15 known credits, unexpired grant and exact owner-authorized release marker. No purchases/recharge authorized.

## Postflight required before claiming published
1. Independently check Netlify site's actual new deploy ID, SHA, branch, context, READY/current state, primary domain, access settings and generated `coffee-url-preview` function.
2. Confirm served client JS and latest Netlify function assets are healthy; do not claim genuine signed-in browser URL Autofill without performing it.
3. Read-only compare database counts, migrations and service availability with the preflight baseline.
4. Update this report and `docs/CURRENT_STATUS.md`, GitHub issue #33, Netlify credit ledger's last publication (actual debit UNKNOWN), and backup/source continuity with **confirmed deployed SHA**.
5. Document blocked/publicly unavailable roaster URLs and remaining genuine Auth/mobile acceptance; do not claim universal or complete coverage.

**Release request is authorized and tested.** Release receipt must be completed with actual Netlify state after the deployment, not inferred from this Git push.
