# Issue 96: repository-wide source and security inspection

## October 23 UTC / October 22 MDT: authorized intake
Owner requested new line-by-line inspection and penetration testing with repairs; subsequently explicitly extended equivalent tests to Supabase and Netlify and reports funded GitHub overages. No publication, production SQL/Edge/Auth/member mutation, account creation, password guessing, destructive or load tests.
Starting application459d2418, operations1678391d, productionf97b8f30. Preserve issue93 READY source and all Locked decisions.

## Source acquisition and baseline
Private tracked-source artifact39900425092/12478796499 SHA25671a95a1c22182254c174535cba6b7eb020315f40f35f5c3f35b0618acb5d7f5c verified. Application456 files/72237 lines; operations52/3239; production442/71520;39 remote refs contain897 unique blobs/243322 text lines and3 binaries. All unique text lines pattern-screened; this is not full manual semantic coverage or commit-history-wide clearance. Local baseline650 Node tests pass.
Hosted read-only checks preserve22shots/22notes/5accounts/2Community/48receipts; no missing app RLS, direct client table-write grants, anon public dic execute, missing definer search_path, app views or Storage buckets.

## This same-commit extension
Add low-rate nonmutating HTTP provider probes. Public client config only, no real user tokens, passwords, writes or data extraction. Test public security headers, eight private-source paths, nonproduction access, preview auth/origin/content-type, anonymous table/RPC denial, private-schema access and invalid/unsigned JWT rejection at REST and Edge. Private report stores status/header/hash only, never bodies or keys. This audit-only branch workflow replaces completed source-export job; no source export rerun or release trigger. Results pending.

## Confirmed candidates being repaired locally
Password composition contradicts Issue80; unbounded Edge request JSON/Netlify body-read time; catalog cache falsely labeled source-verified;10000-character silent note truncation; retired/privacy wording; pathological HTML regex CPU. Synthetic worker fuzz reproduced >2-second parser timeouts. No source repair is READY yet. Next implement regression-first fixes, verify provider probes, CI and exact-source readback, integrate nonforce and queue only verified changes. Never call inaccessible member/device/provider tests complete.
