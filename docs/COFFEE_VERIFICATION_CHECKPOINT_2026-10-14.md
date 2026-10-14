# Coffee verification automation and first canonical catalog (October 14, 2026)

## Owner-approved behavior (explicit amendment)

- The sole admitted administrator may add a coffee to their **own** library: after canonical duplicate checks, it is immediately promoted to **Verified** in the same atomic database transaction; the audit records `admin_approved`. Their administrator authority does not authorize automatically approving another user's unverified entries.
- Normal admitted accounts add any nonconflicting new coffee atomically as a usable **Pending** personal entry. A trusted official product-page check can promote it to Verified without administrator action. Lacking credible evidence does **not** become a guess. Such coffees continue working for Log Shot → Rate → Recommendation and remain out of community contributions until verified.
- Identical verified official release/product identities reuse the original canonical ID. Fuzzy spelling or release ambiguity is shown to the user to confirm. `Hambella` under `Sweet Bloom Coffee` suggests existing `Hambela`, but **does not automatically merge**.
- A user may attach their own Pending submission to a compatible existing canonical coffee. The transaction changes only the underlying **personal library entry link**, preserves its ID, keeps every shot, taste score, recipe/workspace reference, and records the original submission and alternate spelling for audit. Different roasters, conflicting release labels and conflicting origins cannot self-merge.
- The earliest chronologically submitted **coffee name** stays the primary global display name, even if it was Pending and was verified after a later entry. Later spellings are recorded as aliases rather than overwriting the first user's name. A server-maintained first-entry ledger protects this after repeated merges.
- Hard global verified-record consolidation (two already-existing verified canonical IDs) must not rewrite community history solely on a single user's say-so. Such collisions require explicit provenance-safe reconciliation, and are not silently discarded.

## Actual original owner coffees — completed

The database's four original personal submissions have been promoted to verified canonical records, preserving all existing IDs and 14 shots:
- `David Armijos` — Queen City Collective Coffee (3 original shots). Original product URL was inaccessible when checked; administrator approved, evidence remains marked as submitted label, **not** falsely marked as a live verified product page.
- `Yirgacheffe` — Orinoco Coffee & Tea (5 original shots). [Official product page](https://www.orinococoffeeandtea.com/product/organic-fair-trade-ethiopia-yirgacheffe/) corroborates product/roaster. Product page includes unrelated third-party spam content; do not use non-product text as evidence.
- `Bavyeyi IV` — Proud Mary (6 original shots). [Official page](https://proudmarycoffee.com/products/burundi-bavyeyi-iv-bourbon-natural) corroborates natural process and Bourbon; JNP is a sourcing partner, not the sole coffee producer. Original misspelled variety was corrected in canonical facts with provenance preserved.
- `Hambela` — Sweet Bloom (0 original shots). [Official archived page](https://sweetbloomcoffee.com/products/hambela) supports Guji, Ethiopia, natural process, heirloom, berry/stone fruit/chocolate; the page is archived, so no assumption of current availability.

Three source-backed roaster product-page evidence records were added separately. **Original submitted data remain in the now-approved submission audit records**. No legacy-import settings, archived original import, RLS grants to anonymous users or external access changed.

## Backend architecture

- Source: `supabase/migrations/20261014221324_dic_coffee_auto_catalog.sql`.
- Protected source worker and rate claim: `supabase/migrations/20261014222202_dic_source_worker_target.sql`.
- The JWT-gated Supabase Edge Function `dic-verify-coffee` reads only the user's own Pending submission and an internally curated roaster hostname. No arbitrary URL host, redirects, HTTP, non-product pages or unbounded response bodies are allowed. The server revalidates the official domain and release details before promotion.
- A user/coffee-level budget limits unattended HTTP fetching to six attempts per submission and thirty attempts per account in a rolling 24-hour window, at least 15 minutes apart.
- This is **deterministic** HTML Product/OG metadata parsing, not an AI guess. Existing aliases and official source data should be checked before additional fetching, minimizing cost. A verified roaster alone never proves an individual coffee/release.
- On a safe source check, the server creates/links the canonical record, updates the original personal library entry in the same transaction, and records evidence in the protected audit. On uncertainty it leaves the coffee Pending and usable.

## Limitations and release gates

- Only four roaster domains are curated so far: Sweet Bloom, Proud Mary, Orinoco, Queen City. Expanding automatic coverage needs reviewed official domains, additional real-product/seasonal regression tests, and healthy source URL data.
- Non-HTTP source evidence, nonstandard product templates, product-site outages, conflicting harvests, and unverified roaster domains remain Pending. They must not generate routine admin busywork unless duplicate/conflict escalation is genuinely needed.
- If a user already has multiple personal entries for the *same* canonical coffee, automated merge stops instead of rewriting existing shots and family statistics. A follow-up reconciliation routine must handle that exceptional case.
- The reviewer must not claim a source was checked unless the actual live endpoint ran successfully. GitHub tests, Supabase migration tests and initial manual sources are separate evidence types.
- No Netlify deployment while the verified credit snapshot reports zero credits. When budget returns, release the GitHub-tested source in one batched, SSO-protected publish.

## Implementation verification update

**Supabase backend active:** migrated admin/ordinary-tenant atomic coffee mutation paths, user-confirmed matching, oldest-entry naming, service-only product checks, and retry budget are applied. Legacy `dic_mutate` is now routed through the same protected smart submission path rather than bypassing automatic approval. All three migration SQL contents were checked against Supabase migration history and matched exactly.

**Verified Edge deployment:** `dic-verify-coffee` version **2**, status **ACTIVE**, `verify_jwt=true`, was deployed from this GitHub source. It enforces trusted official hosts, no-follow redirects, an allowlisted product path, restricted query parameters, 950 kB/10 second fetch budget, and server-side authenticated-submission ownership. The function does not request Netlify credits.

**Tests:** Node/cloud build tests **106/106 passed**, synthetic 390-pixel browser regression **29 passed**. SQL rollback-only tests proved admin own auto-approval, ordinary Pending, account/role separation, user confirmation preserving library IDs and first-entered spelling, idempotency, official verification, and source fetch rate cap. Actual authenticated external-roaster HTTP source promotion has **not** yet been end-to-end tested with a real signed-in non-admin account; do not represent it as empirically validated. Netlify deployment intentionally withheld pending credit purchase.

**Outstanding hardening:** source-backed extraction covers approved official-host Product/OG structured metadata; it does not auto-verify every roaster/product template. The confirmed offsite encrypted snapshot must be renewed after the owner database migration, and any future already-verified-to-already-verified canonical consolidation needs audited, provenance-safe treatment to avoid splitting/reclassifying community evidence.
