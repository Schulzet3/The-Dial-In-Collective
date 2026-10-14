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
- No admin privileges are assigned, no coffees approved/merged, no invite tokens generated/rotated, no community evidence published, no account access changed, and no Netlify deployment requested.

## Verification/release gates

- Add Node tests for hostile source-data escaping, deny view, read-only markup, owner-session reuse, and build allowlist.
- Test SQL role denial for ordinary authenticated member and anonymous caller, and test a temporarily elevated role **inside a rolled-back transaction**.
- Test existing core cloud/owner mobile flow remains green.
- The existing real owner membership has no admin role. Administrator provisioning requires a **separate explicit owner authorization and role verification** before the private dashboard can be used.
- Before first external beta: implement audited coffee approval/conflict reconciliation without data loss; safe verification evidence and contributor projection rules; invitation management with revocation; abuse exceptions only; real cross-account/auth and hosted browser tests.
- The current Netlify Free balance is **0** according to the owner-provided October 14 screenshot. This milestone remains GitHub/Supabase only until a purchased plan or new cycle resumes production publishing. The credit-aware release gate and SSO protection must remain intact.

**Never claim a functional deployed admin portal based solely on this GitHub milestone.**
