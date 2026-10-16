# Universal roaster URL extraction — canonical requirement and implementation gap (2026-10-16)

**Status: canonical requirement CONFIRMED; broad extraction NOT IMPLEMENTED OR DEPLOYED.** This document corrects a misleading implication in the original October 16 nonadmin acceptance checklist: limiting URL extraction to the initial four curated roasters is **not** a Locked product requirement. The existing production code has that constraint because its server-side roaster verification worker uses a curated official-domain list, which was originally introduced for source trust and safe HTTP fetching. The owner asked why an arbitrary roaster product URL could not be entered and data extracted. The answer: this is a genuine gap versus the earlier Master Specification, not an intentional user-facing limitation.

## Canonical source, no decision change

The Library `The_Dial-In_Collective_Master_Specification_v1.0.md`, sections **9 Add Coffee**, **10 Canonical coffee facts, verification, audit**, **11 Pending coffees**, and **12 AI and API strategy**, and the Library `The_Dial-In_Collective_Decision_Ledger_v1.0.json` already Lock:

- **URL and/or bag screenshots primary new-coffee inputs**, with canonical database identity lookup **before** consuming optional AI/API usage.
- **Exact URL/release match** uses original canonical coffee; **likely fuzzy match** requires user confirmation; separate lot/harvest/release must never be silently merged.
- Extract from **roaster URLs and screenshots**, not exclusively a hand-curated list. Unavailable/unverified facts remain blank. Official exact product page first; secondary sources only when confidently matched to exact release; avoid invented facts.
- Users may add real new coffees **Pending**, and immediately Log Shot → Rate → Recommendation. Pending data stay out of community until approved; only strong verified source evidence can promote them to Verified.
- **Claude-only V1 AI**, optional BYOK, key stored **on user's device only**. The application works without Claude. Do **not** put a user Claude key in Supabase/Netlify/GitHub or route it through an unapproved server-side key store. Screenshot uploads must be discarded after extraction.

These are already Locked; this document only aligns the implementation plan. No new product decision is silently written to the Ledger.

## Observed current production behavior

- The published source SHA `4e7d4a834dd92ec79f8cd99b373374fc0a584ef8` has **Add Coffee → Roaster Page URL → Autofill From URL → Apply Suggested Details → Add Coffee**.
- Existing `supabase/functions/dic-preview-coffee/index.ts` authenticates an admitted user, calls service-only `dic_roaster_preview_target` against `private.dic_roaster_directory`, and rejects other domains as `unrecognized_official_roaster` before fetching. That directory currently includes only Sweet Bloom, Proud Mary, Orinoco and Queen City.
- `dic-verify-coffee` similarly uses trusted curated roaster official-domain/source evidence for **automatic global Verified promotion**, which is a *different security boundary* from a user's right to extract proposed details.
- Current simple HTML preview supports Product JSON-LD/OG metadata, not universal merchant engines, JavaScript-rendered pages, text extraction fallback, or optional Claude BYOK in this deployed flow. It does not promise all coffee facts from every site. A live nonadmin outside-directory URL acceptance test remains pending.

## Target architecture: broad extraction, conservative verification

1. **Universal input:** Accept any user-supplied **public HTTPS coffee product-page URL**, not an arbitrary network destination. Use the same simple one-URL paste UI. If the URL is unrecognized but safe, **attempt extraction instead of refusing only because the roaster is new**. Some pages will be inaccessible (JavaScript-only, paywall, robots/bot protection, removed products); handle gracefully.
2. **Security first:** Build a hardened, constrained fetch layer. Block localhost, raw IPs, private/reserved IPv4/IPv6, local hostnames, credentials, non-HTTPS schemes, alternate ports, internal DNS and redirects that escape validation. DNS rebinding must be handled by the outbound network enforcement itself (validated public destination at connect time, DNS pinning or controlled egress proxy); hostname regex alone is NOT sufficient. Cap time, bytes, redirects and per-account requests. Never send member cookies, Supabase tokens, private headers or Claude BYOK keys to the target site. Do not silently remove the current verified-source allowlist for **global promotion**.
3. **Cheap deterministic extraction:** Before any optional AI, extract and normalize Product schema.org JSON-LD (including graphs), OG/meta, relevant publicly available product markup and merchant-specific structured formats (e.g. Shopify/WooCommerce where contained on the fetched page). Identify name, roaster, origin, process, variety, elevation, producer, roast, tasting notes, harvest/release, roaster recipe and availability **only if actually stated**. Distinguish roaster brand vs product title and ingredient lists vs unrelated text; retain field-level source/evidence snippets, including where a field was absent.
4. **Optional Claude on device:** When a user has configured their own device-local Claude key, offer/use it only within the existing Locked BYOK policy for unstructured/ambiguous published page text or screenshot extraction; never upload that user key to the Collective cloud database, backend secrets or source repository. Treat page text as *untrusted data*, not instructions. No AI requirement for ordinary Add Coffee, no compulsory subscription or per-shot charges.
5. **Review before commit:** Show a compact, editable preview of extracted fields and missing data. Do not overwrite existing user-entered values. Preserve fastest Add Coffee → Log Shot flow; no giant wizard. Canonical lookup uses release/roaster/product evidence *before* creating new identities. Show confirmed exact match for reuse and ask only when fuzzy/ambiguous; a reused product URL can refer to another harvest, so don't collapse those identities.
6. **Trust separate from extraction:** A parsed page does not automatically prove it is the **official** source for the named roaster or correct release. Known/trusted official domains can continue using the existing source verifier. For a newly seen site, establish trustworthy roaster/domain provenance before global auto-approval. Until proof is sufficient, save the user's coffee **Pending**, immediately usable privately for espresso logs/ratings/recommendations. Never tag an untrusted or contradictory scrape **Verified** merely because the parser filled every field.
7. **Test and deliberate release:** Unit tests with multiple unrelated merchant platforms, valid unknown official coffee pages, inaccessible pages, mismatched roaster labels, new crop/release sharing URL, conflict/alias matching, HTML prompt-injection text, DNS private-target/redirect SSRF attempts, per-member quotas, malformed markup, and missing facts. Run authenticated preview and nonadmin browser integration without exposing community or original owner data. Batch the cloud release with actual Netlify credit check and owner authorization; no automatic production deployment.

## Acceptance sequence change

The **first** acceptance question should no longer require picking a coffee from Sweet Bloom/Proud Mary/Orinoco/Queen City. Instead:

- Implement/test safe general URL preview on the development branch.
- Then use a genuine coffee URL from **any** previously unknown roaster with existing nonadmin account. Confirm recognized structured facts appear or a meaningful graceful fallback; personally review, submit and verify Pending vs Verified without false public publication.
- Also regress an already curated official domain, canonical reuse and distinct harvest/releases.
- Confirm offline logging and privacy are unchanged.

**Not yet done:** No code implementation, SQL migration, Edge deployment, production site publish, Cloudflare change, new Claude integration, cost authorization or real end-to-end broad URL acceptance was completed by recording this document. Earlier read-only production baseline remains valid.
