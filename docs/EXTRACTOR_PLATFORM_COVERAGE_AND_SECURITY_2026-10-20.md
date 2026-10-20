# Extractor platform coverage and security review — October 20, 2026

**Status: tested development source only; not deployed.** This document captures the interrupted work so another session can continue from GitHub, not a handoff. See [Current Status](CURRENT_STATUS.md), [canonical specification](MASTER_SPECIFICATION.md), [Decision Ledger](DECISION_LEDGER.json) and [extractor issue #33](https://github.com/Schulzet3/The-Dial-In-Collective/issues/33).

## Mango Tree root cause and correction

The exact `https://www.mangotreecoffee.org/shop/Mango-Tree-Blend-p734210068` returns a **662,738-byte Wix storefront shell** with `og:title = Mango Tree Coffee: Store`. The original HTML fallback incorrectly interpreted that storefront title as the coffee. The selected product is instead rendered in an embedded Ecwid frame. [Public browser probe 39358722071](https://github.com/Schulzet3/The-Dial-In-Collective/actions/runs/39358722071) established the public Ecwid store ID **6820274**, exact product ID **734210068**, and real product description. The no-token public static product endpoint returned 43,355 bytes and the name **Mango Tree Blend**, but its `canonicalUrl` was blank.

The new extraction requires an exact product-ID + normalized title match, and safely parses public structured product data. Evidence-backed fields: name **Mango Tree Blend**; roaster **Mango Tree Coffee**; roast **Medium**; origin **Ethiopia and Brazil**; notes **Pear, Molasses, Brookside Chocolate Covered Acai**. The product did not establish producer, processing, variety, altitude, release, or published espresso dose/yield/time: leave these blank. A generic Wix shop title is now rejected rather than submitted as a coffee.

## Reusable platform and field improvements

- **Ecwid** static product lookup supports common `-p<productId>` product paths (shop/store/online-store/coffee/coffees/products), using one independently grounded known store ID for Mango Tree or a unique real `app.ecwid.com/script.js?<storeId>` public script on another site. Reject mixed IDs, wrong title or unrelated data.
- **Shopify** public Ajax `/products/<exact-handle>.js` endpoint supports locale/collection aliases. No merchant API, store tokens, mutation or executable scripts. These JSON responses can be labeled `text/javascript` or `application/javascript`; the transport permits that MIME **only on a valid exact Shopify product path**, then `JSON.parse` validates content. The product's stated handle must match the requested handle. Blank data cannot replace populated HTML facts; contradictory categorical facts are withheld rather than guessed.
- **Any selected Product**: parse explicit structured source labels separated by newline, BR or semicolon without reading an unrelated product card. Existing roast/Agtron, espresso recipes, multi-origin blends, country, narrative, verified-versus-unverified and manual fallback rules remain.
- No AI integration, browser automation in production, HTML execution, new member-data writes, database changes, or altered quotas.

## Real public source evidence

[Five-source read-only probe 39361144815](https://github.com/Schulzet3/The-Dial-In-Collective/actions/runs/39361144815) **parsed 5/5 product endpoints**: Mango Tree Blend (Ecwid); Corvus Echo Gesha, PERC Kenya Mara Estate, Sweet Bloom Wuri, Heart Phono (Shopify). Completeness varies. For example, PERC Ajax exposed tasting notes but not all other fields, while normal HTML extraction may provide additional facts. Independent synthetic tests, lint and build were successful for [exact app source `36c6b1350784`](https://github.com/Schulzet3/The-Dial-In-Collective/commit/36c6b1350784852416570c96222eceaa3f7a6070): [Node/lint/build PASS 39361144927](https://github.com/Schulzet3/The-Dial-In-Collective/actions/runs/39361144927), [mobile/cloud PASS 39361144914](https://github.com/Schulzet3/The-Dial-In-Collective/actions/runs/39361144914). Failed intermediate CI tests exposed a mis-escaped fixture and blank-field merge bug, both repaired. Real signed-in Mango Autofill and full field-by-field owner acceptance **remain unverified**.

The earlier temporary Mango HTML/browser scripts were removed from the current tree and replaced by one compact, optional public-platform probe. Historical GitHub Action logs preserve the original evidence. A recursive GitHub tree inventory found one exact duplicate active source blob, `src/server/agtron-roast.mjs` and `supabase/functions/dic-preview-coffee/agtron-roast.mjs`: a **necessary Node/Edge mirror**, not an orphan. Preserve this mirror and keep its contents synchronized.

## Existing security limits and possible changes

| Protection | Potential coverage gain | Risk / decision |
| --- | --- | --- |
| **900,000-byte** fetched/decompressed limit | Larger roaster pages, including sites currently over cap | More memory, parsing and hosting costs. Study bounded 2 MB in isolated CI first; no approval to change now. |
| **11-second request wall / 10-second socket timeout** | Slow origins | Increased wait/expense, especially when second endpoint is needed. Keep until measured. |
| **Public pinned IPv4 only** | IPv6-only sources | Requires complete public IPv6/IPv4-mapped exclusion and connection-time DNS pinning. Never weaken SSRF/private-IP checks. |
| **Two HTTPS redirects max** | Longer redirect chains | Every hop must be revalidated; unnecessary bounces and higher latency. Keep absent evidence. |
| **HTTPS, TLS verification, no URL credentials, no local/reserved addresses, reject mixed private DNS** | No justifiable improvement from disabling | **NEVER weaken**: credential leak, metadata and private-network SSRF risk. |
| **No remote JS execution in backend** | Browser-rendered product text on dynamic sites | A much larger attack surface, possible remote-site scripting, headless-browser CPU/hosting costs. Prefer public static data endpoints. |
| **12 member previews per rolling 24h, shared 30s cooldown, IP rate limits** | More lookups, not deeper facts | Abuse and billing considerations. Separate owner product decision. |

Official references: [Ecwid static product endpoint](https://docs.ecwid.com/api-reference/rest-api/storefront-widget-details/static-store-pages/static-code-for-product-page), [Ecwid SEO path pattern](https://github.com/Ecwid/ecwid-api-docs/blob/master/includes/_customize_storefront.md), [Shopify Ajax Product API](https://shopify.dev/docs/api/ajax/reference/product), [Shopify unauthenticated scope](https://shopify.dev/docs/api/ajax).

## Remaining work / release boundary

Member-authenticated live URL autofill tests (Mango and other roasters), product-to-bag field validation, unavailable/oversized sources, real mobile acceptance and any proposed nonproduction size-cap benchmark are open. No approval to publish or relax security. Independently queried Netlify still reports READY/current deploy `6ad6801b20c067ef4f2e3729` with previously published source `8769508fc234`; there was **no new deployment, SQL/Edge change, credit spend or historical shot mutation**. Separate owner-approved one-shot publication remains mandatory. The optional beginner design proposals are tracked in [issue #40](https://github.com/Schulzet3/The-Dial-In-Collective/issues/40), distinct from Locked grinder/next-shot design in #39.
