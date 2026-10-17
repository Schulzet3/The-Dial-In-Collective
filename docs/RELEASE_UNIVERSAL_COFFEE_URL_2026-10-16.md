# Universal roaster URL preview production release

Owner approved immediate production publication on 2026-10-16 and confirmed that Netlify credits are sufficient without another balance review.

Locked cooldown: at least 30 seconds per account across all URL preview paths. See `docs/DECISION_LEDGER_2026_10_16_URL_PREVIEW.json`.

Pre-release: GitHub application/UX and isolated SQL CI passed. The additive production Supabase shared quota migration is applied and the trusted `dic-verify-coffee` JWT-required Edge worker is active at version 4.

This commit deliberately triggers the Netlify production deploy. Deployment and live Wuri acceptance remain PENDING until verified separately. Production baseline: 4 coffees, 16 shots, import saves disabled.
