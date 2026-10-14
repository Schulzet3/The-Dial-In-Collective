# Admin dashboard read-only foundation

**Milestone:** safe, minimally scoped admin visibility before any coffee approval, invitation, or public-beta workflow.

## Canonical requirements

Master Specification v1.0 section 32: pending coffee verification, true canonical duplicates/conflicts, beta-link revoke/replace, basic activity, and only exceptional abusive/impossible shots. Ordinary fuzzy matches and ordinary shots are **not** routed to an administrator.

## Implemented source

- Supabase `private.dic_admin_dashboard_read()` and public read RPC `dic_admin_dashboard()` require the existing server-side `private.is_admin()` check; the former executes in the nonexposed private schema and the public wrapper has only explicit `authenticated` EXECUTE.
- Results contain only whitelisted proposed coffee facts, status, date, and aggregate counts, with a 50-item oldest-first queue. **No owner IDs, account emails, private free-text notes, individual shots, passwords or app secret settings** are returned.
- New responsive `/admin.html` owner dashboard shows a read-only queue, basic application aggregate counts and an explicit note that backup health is handled externally. It reuses the existing signed-in Supabase session and checks `dic_session_status` before requesting admin data.
- The normal Settings menu links to the dashboard only when `session_status.admin=true`. The **server denies all non-admin access regardless of any browser changes**.
- The native cloud build allowlists just the admin page/assets. It cannot publish SQL, secrets, personal exports, provider configuration or test files.
- At initial implementation no admin privileges were assigned. Following explicit owner approval, one existing admitted, email-confirmed owner account has been assigned the admin role; no coffees were approved/merged, no invite tokens generated/rotated, no community evidence published, and no Netlify deployment requested.

## Verification/release gates

- Add Node tests for hostile source-data escaping, deny view, read-only markup, owner-session reuse, and build allowlist.
- Test SQL role denial for ordinary authenticated member and anonymous caller, and test a temporarily elevated role **inside a rolled-back transaction**.
- Test existing core cloud/owner mobile flow remains green.
- **Completed 2026-10-14:** Owner explicitly authorized promoting their existing account. Preflight checked the sole existing Auth account, sole active email-confirmed member, ownership of exactly 14 historical shots, 4 library entries and 1 private original archive, and zero existing admins. A guarded transaction inserted the owner into `private.app_admins`; readback confirms exactly one active confirmed admin and no changes to shot/library/import counts. A simulated authenticated RPC test verified `dic_session_status().admin=true` and four sanitised pending coffees visible to the admin. Anonymous/non-admin denial tests passed earlier. An actual owner browser session is not yet retested and `/admin.html` is not live on Netlify.
- Before first external beta: implement audited coffee approval/conflict reconciliation without data loss; safe verification evidence and contributor projection rules; invitation management with revocation; abuse exceptions only; real cross-account/auth and hosted browser tests.
- The current Netlify Free balance is **0** according to the owner-provided October 14 screenshot. This milestone remains GitHub/Supabase only until a purchased plan or new cycle resumes production publishing. The credit-aware release gate and SSO protection must remain intact.

**Never claim a functional deployed admin portal based solely on this GitHub milestone.**

## Coffee review boundary (canonical, not a new policy)

Ordinary confirmed matches and verified, non-conflicting coffees are not manual admin tasks. Genuine identity conflicts or ambiguous duplicates go to the administrator; user-resolvable fuzzy matches must not. A genuinely new coffee that has not met source-backed or automated verification requirements remains **Pending** and may be logged privately, but its observations are not eligible for community evidence until verification. This follows Master Specification sections 9.1–10.4, 11, and 32; do not silently auto-approve unverified coffees merely because no duplicate was found.
