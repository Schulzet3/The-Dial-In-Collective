# Roast graphic extraction, Wuri acceptance and single shot cleanup (2026-10-16)

## Latest reconciliation 2026-10-17 UTC

The later owner-authorized **permanent purge** of exact Hambela test shot `799509a3-a16d-4380-a439-8de2a5d880e2` is **COMMITTED and independently verified**. The shot and empty note were deleted; two detailed audit snapshots were cleared while retaining metadata, and two mutation responses were replaced by replay-safe `record_purged` tombstones. Affected last-logged/feed timestamps were corrected. **15 stored / 15 visible shots remain, including all 14 legacy shots**; all other shot/note rows and the community contribution matched their pre-purge fingerprints across 42 protected table scopes. Historical backups were untouched.

See the [exact purge evidence](EXACT_HAMBELA_TEST_SHOT_PURGE_2026-10-17.md) and [current status](CURRENT_STATUS.md). The original hide-only results and 16-retained-row counts below are historical checkpoints, superseded only for this shot's final storage state. This follow-up changes documentation only; it does not perform another production mutation or authorize further purges.

## Original dated record retained

**Later decision reconciliation:** The earlier 25 vs 10 daily preview cap proposal below has been **resolved** by the owner's 2026-10-16 Denver approval of **12 claims per member per 24-hour budget window**. The source migration and regression tests are staged and passed CI; production has not yet applied the 12-limit. [Canonical new decision](DECISION_LEDGER_2026_10_16_DAILY_BUDGET.json); [current operational status](CURRENT_STATUS.md). The six-tier roast idea remains unapproved.

**Status: WURI MEMBER SAVE PASS (private Pending); EXACTLY ONE HAMBELA SHOT HIDDEN VIA CANONICAL APP MUTATION PASS; ENHANCED EXTRACTION DEVELOPED + CI PASS, NOT YET DEPLOYED.** New daily lookup cap and six-tier roast taxonomy are **proposals, NOT Locked or implemented**. Retain all existing Locked decisions, 30-second account-wide preview cooldown, roster/security boundaries, and existing production release until next owner approval.

## Owner's actual Wuri acceptance and read-only production facts

After production JSON-JWT preview authorization fix, owner reported the genuine admitted second account could preview `https://sweetbloomcoffee.com/products/wuri`, with most coffee fields populated except roast level; owner reviewed and saved the coffee.

Independent production SQL after the owner's save:
- `coffee_submissions`: exactly one Wuri submission with `status='pending'`, `source_url='https://sweetbloomcoffee.com/products/wuri'`, saved from the admitted **nonadmin** account. Personal library entry `1e5e72b9-4b5e-4e21-9f39-c379e3775548` is **visible**; `coffee_id=NULL` (not yet a publicly Verified canonical coffee). Saved proposal contains name Wuri, roaster Sweet Bloom, origin Gedeb/Ethiopia, process Washed, variety Heirloom, elevation 2000–2100 masl, notes citra hops/mandarin/sugarcane, and **manual roast level Light**. The app preserved the owner's manually selected Light; **do not claim the parser extracted it**.
- Exact coffee release and official-source provenance still require trustworthy verification before global promotion. A successful private Pending save is not a globally Verified source acceptance.
- The real publicly indexed Sweet Bloom Wuri page has product details and section labelled **Roast Level**, with **Light / Medium** graphic endpoints. A plain rendered text view cannot prove which point of the graphical scale is selected. Do **not** make up a roast category just because both labels appear. SCA confirms that roast names/colour boundaries lack uniform industry adoption: `https://sca.coffee/sca-news/25/issue-21/what-color-is-your-coffee-37lk7`.
- Direct raw webpage source and CSS files could not be retrieved by the isolated coding runner (no external DNS access), so the currently deployed parser's exact live Sweet Bloom DOM has **not** been inspected byte-for-byte. The new graphic logic is backed by synthetic representative HTML fixtures, not confirmed as the actual source-code encoding on the live Wuri page.

## Owner-authorized shot cleanup — committed and independently verified

Owner expressly requested removal of the single Hambela shot in the original administrator account. SQL first **uniquely identified one** visible Sweet Bloom/Hambela shot (dose 18g, yield 48.8g, time 25.2 sec, fresh nonlegacy entry, revision 1), then completed one **rollback-only dry-run** of the app's canonical `public.dic_apply_client_change(...,'hide_shot',...)` mutation under that verified account context, checking only one visible shot disappeared; all trial writes rolled back.

A second guarded transaction committed the same canonical `hide_shot` application mutation for that exact shot, using its expected revision, not an unaudited `DELETE` or a wholesale owner filter. Independent read-only verification after commit:
- **15 visible shots**, **16 retained physical shot rows** (one soft-hidden)
- **0 visible Hambela shots** from the specified administrator account
- **two preserved `private.shot_audit` rows** for that shot (original insert and hide/update)
- other canonical data, coffee submissions and shot history not altered by the cleanup.

This is a **reversible audit-preserving soft removal**, which is the app's existing deletion model. Never describe this as a hard purge from backups and provider storage. It is not a general authorization to delete more shots or users.

## Development changes to improve public roaster extraction across websites

New `src/server/roast-level-evidence.mjs`:
- Parses **explicit product metadata/HTML `data-roast[-level]` attributes**, accessible image or SVG `alt`/`aria-label`/`title` descriptors, and clearly selected roast-level labels (`aria-selected`, `aria-pressed`, selected/active CSS classes) in the *product's* markup.
- Recognizes common alternate spellings **Medium Light / Light-Medium** and **Medium Dark / Medium-Dark**, retaining current five canonical values; does not redefine taxonomy without owner approval.
- For a bare Light-to-Medium graphic with no explicit selected value, a percentage-only visual slider, or conflicting signals, returns a **safe review hint** instead of fabricating Light/Medium. For roaster-authored `Ultra Light` outside the current canonical enum, surfaces the original label as a hint for manual selection, not a silent coercion into Light.
- **Does not fetch screenshots or arbitrary external image bytes**; the existing IP-pinned HTTPS page reader and Netlify authenticated quota remain unchanged. Optional device-only Claude BYOK screenshot analysis is still future product work under the original Locked spec. No new image APIs, OCR/AI spending, or risky scraping services.
- The UI preview now shows a concise, HTML-escaped **Roast graphic** note when the selected value is ambiguous.

Extended `src/server/coffee-page-metadata.mjs`:
- Uses the graphic evidence when a singular confident value is available; detects and withholds *conflicting* structured versus graphic roast claims.
- Reads merchant-provided roast/origin/variety/processing data from safe inline Shopify JSON `metafields`, `metadata`, `tags`, labeled description HTML, and explicit product/coffee-specific meta fields without executing JavaScript.
- Reads a roaster's explicitly labeled producer-group heading only when its metric label is adjacent and before another heading (fixes test-found false producer assignment).
- Stops auto-filling a **false single process** if a blend is marked *Washed & Natural*, because the current canonical process control cannot represent both. Leaves it blank for owner review.
- Leaves product identity, official Verified promotion, release/harvest safety, canonical RLS, owner device-local Claude BYOK, 30-second throttle and username data isolated as before.

Tests in `tests/roast-level-evidence.test.mjs` and `tests/universal-coffee-preview.test.mjs` cover semantic roast markers, inline SVG, accessibility, intentional ambiguity, conflict, unsupported ultra-light hints, HTML escaping, Shopify metafields, JSON-LD description, labeled Wuri producer and multi-process blends. First intermediate test exposed nested HTML label selection bug; a second exposed unrelated-variety-as-producer regression; both fixed.

**Latest GitHub cloud app test `https://github.com/Schulzet3/The-Dial-In-Collective/actions/runs/38994786401`: PASS 226/226 Node tests, release build and nonpublication check on SHA `3b98b086babeff2b47a4d218ecd4c1fee02887ff`.** This SHA and later documentation commits are development-only. **No new Netlify deploy, DNS, Supabase migration, Edge function update, AI credit usage, or new billing review took place for extraction improvements**. Production remains the existing owner-approved publish `f08dfda99f46b25240cb8cc35c46d2c3c76344b8`, deploy `6ad2c872ad7a8fa78dc410dc`.

## Decisions under discussion, NOT adopted

- Current production: owner-Locked **>=30-second per-account URL lookup cooldown** + adjustable **60 rolling 24-hour lookups**. Owner says 60 is overly generous; is weighing **25/day** vs **10/day**. Recommendation **25/day** to support initial setup, temporary site lookup failures, tasting flights and new-member exploration while capping consumption 58.3% below 60; 10 is likely too tight because even failed roaster attempts currently consume one quota claim. **Do not modify production cap or canonically lock a new number before the owner chooses one**. Existing shots/manual Add Coffee remain unaffected.
- Current canonical roast choices: **Light, Light-Medium, Medium, Medium-Dark, Dark** with a database CHECK and engine mapping. Owner suggested Ultra Light and considered dropping Medium Dark. Recommended **six tiers**: Ultra Light, Light, Medium Light, Medium, Medium Dark, Dark (display labels), with compatibility mapping to existing stored `Light-Medium`/`Medium-Dark` names. SCA cautions labels are not objectively standardized across roasters, so source wording should be preserved separately from normalized category. **Requires a separate explicit Locked product decision, app/engine/sql regression and deliberate release**; do not change by implication.

## Next steps

1. Ask **one owner product question at a time**, starting with 25 vs 10 URL lookup cap.
2. Decide six roast tiers and the most suitable displayed naming separately; update Master Specification and Decision Ledger only when owner confirms.
3. Batch owner-approved enum/cap changes with the tested parser into a single release; check all required engine mappings and release/security gates. Ask release authorization before consuming another Netlify deploy if owner has not already provided authorization for this specific revision.
4. Repeat a real signed-in Wuri URL preview after the release. If the selected graphic remains unreadable, collect a screenshot and the webpage's original saved HTML/CSS for exact source-specific investigation; do not invent a categorical value or issue repeated quota-spending tests.
