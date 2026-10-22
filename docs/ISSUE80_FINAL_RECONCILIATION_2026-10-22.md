# Issue #80 Approved Refinements — Development Readiness Reconciliation (2026-10-22)

**Authority:** owner Issue #80 and its approved narrow supersessions in Master Specification and Decision Ledger. **This is not publication approval.**

## Verified development READY
- Mandatory outlier Confirm/Correct preserved; new shot basket guidance strictly >2 g is dismissible and does not reappear on edit. PR #81.
- Account-scoped informed signout, independent outbox conflict progress and lower idle full-state polling, preserving 30-second admission check and reconnect. PRs #81–83.
- Admin collapsed-data lazy loading, all-record server-side search with 50-row paging and role gate. PR #86 and merge d3ad52fe.
- Community eligible+verified coffee/style search and stable server-side paging, preserving anonymous sanitized DTO. PR #91 merged ede403a0; SQL source staged.
- Extractor exact verified URL/canonical coffee reuse, 15-minute bounded public-only cache, two-phase quota charging excluding transient retrieval failures; existing IP/member/day/cooldown and SSRF protections retained. PR #91; SQL source staged.
- Actual packaged member+Admin Chromium build smoke added and passed. PR #85.
- Redundant Netlify full npm test moved entirely to mandatory GitHub source validation while Netlify retains the checked build graph. PR #87 merged 05dda786.
- Current requirements view exists; scoped independent same-commit journals merged in PR #92, final postmerge checks pending at this checkpoint.

## Conditional work disposition (not license to weaken safeguards)
- No further preview-preflight consolidation or older preview API removal without direct caller/runtime evidence demonstrating equal or better extraction reliability, usability **and** efficiency. Keep external safe-URL/DNS/DNS-rebinding protections.
- No broad history rendering rewrite without measured material bottlenecks; current narrow mobile/browser fixes and paging already tested.
- No blind dead-code/prototype deletion without caller proof; preserve archived history and existing recovery paths.
- Weekly Sunday 08:00 UTC GitHub comprehensive regression already runs Node unit tests, lint, production build integrity, SQL and mobile/offline checks; this is automated checking, not automatic code rewriting or human review.
- Supabase production advisors reviewed read-only: performance INFO 12 foreign-key index observations, 11 unused-index observations; security INFO 5 intentionally private RLS no-policy tables and WARN 5 authenticated SECURITY DEFINER RPC endpoints plus leaked-password-protection disabled. No speculative index, RLS/Auth policy or password configuration changes. Review guidance: https://supabase.com/docs/guides/database/database-linter and https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection.
- Existing 8-character + one-number + one-special password policy retained. No plugin global permissions altered (the user asked about possibility rather than an unqualified change instruction).

## Provider and test boundaries
- Tested source and CI evidence are recorded individually in docs/RELEASE_QUEUE.json. Published Netlify deploy remains 6ada3b5018ccdd080d3b4584 (Git SHA fe2eee66717b13b9c9d203d1728bfc863961732e).
- Production Supabase had 40 migrations including previously reconciled duplicate-name Admin entry 20261022165047; new 20261022220000, 20261022220100 and 20261022220200 are **staged only**, not applied. No live member-data read/write requested.
- GitHub private Free advisory checks and exact source release queue protections preserved. Signed-in owner/device acceptance and production SQL readback after release are not claimed.
