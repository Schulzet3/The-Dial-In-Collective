# Issue #1937 — Admin record section ordering

- **Authority:** Owner Nov 10, 2026 screenshot and instruction to place **New Account Requests immediately above Accounts**, after Logged Shots; no other layout or functionality changes.
- **Base:** development/backend-foundation `57d74beb1a6cf95fe92fc6a9f6f4419b7f71b782`. Implementation in `site/admin/view.js`, dedicated stable-order regression in `tests/admin-count-refresh.test.mjs`.
- **Acceptance:** Rendered Admin record panels order Pending Coffee Review → Conflicts → Approved Coffees → Logged Shots → New Account Requests → Accounts. Existing attention summary, search/status links, paging, approval/rejection, counts, records and member access are untouched.
- **Status at authoring:** IMPLEMENTED in this same commit; test/CI, nonforce PR integration and exact-source READY still need verified GitHub evidence. No Netlify, Supabase, production, member records or release authorization.
- **Next:** Run targeted Node order test and one applicable build/visual check, verify PR-head CI, nonforce integrate, reconcile issue/current-status/queue to READY only with actual checks. Keep publication owner controlled.
