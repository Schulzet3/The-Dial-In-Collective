# Issue #161 — October 27, 2026, read-only post-closure reconciliation
**Source:** GitHub private repo `Schulzet3/The-Dial-In-Collective`, development SHA `cb9b9013e1fc0caad05d4a0a6f1585f032088982`. This is a bounded evidence inventory, not a declaration that all files or live user journeys were reviewed manually.

## Repository, production and authority
- All original Issues #1–16 closed. #13–16 explicitly not_planned after owner-retired functionality. Source READY does not mean deployed; do not merge historic Custom, Experiment, Bag or basket version UI work.
- Complete recursive nontruncated Git tree: **751 tracked files**, **32,393,756 total tracked bytes**, including 36 `site/` files, 27 `src/` files, 51 `scripts/` files, 49 `supabase/migrations/` files, 172 `tests/` files and 17 workflows. This is metadata inventory, not per-line manual certification.
- Private GitHub Free preserved. Development branch and operations main intentionally diverge; never merge to main to erase ancestry. Actual production source `65ee38609db6bd5977dd0f2b393e7791a5e1b766`, release/production branch and Netlify READY/current deploy `6adc20c03a07673c4dd08035` agree.
- Open independent extractor PR162 explicitly remains DRAFT/TESTING and excluded.

## Production Supabase, read-only diagnostics
- `azviqqejypsefzilgonr` ACTIVE_HEALTHY, Postgres 17, 49 hosted migrations. Two active JWT-required Edge functions; no provider mutation by this audit.
- 47 ordinary public/private tables, 47 RLS enabled and **zero** RLS-disabled; 104 indexes, zero invalid/unready; zero duplicate exact index definitions in catalog inspection.
- 23 shots; 23 shot notes; 4 historical bags; 14 bag-linked shots; zero orphan bag, library or notes relations; 4 personal recipe families; 4 preferred recipes; 2 Community projections; 0 Experiment rows or shot links.
- Advisor reports 12 unindexed foreign keys on small private support/audit tables and 10 unused indexes. Adding indexes to tiny relations and dropping sparse-use constraints/indices is unproved as an optimization. Leave unchanged pending real workload and FK performance evidence.
- Security advisor reports 6 private RLS/no-policy tables, 10 intended authenticated SECURITY DEFINER public endpoints and breached-password protection disabled under the previously approved private beta constraint. Anon direct execution to listed public SECURITY DEFINER RPCs was checked denied; these warnings do not establish an exploit. Private-schema admin delete functions had anon EXECUTE privilege but anon lacked private schema USAGE; do not infer public callability or weaken admin checks. No security finding was silently marked resolved.
- Historical experiment retirement DDL remains staged in source, NOT applied. Never replay applied SQL just because Git filenames differ from hosted migration history.

## Source changes being independently tested
- O(n×m) hydration scans across every setup/shot replaced by first-match and grouped Maps, preserving matching/row order. Latest visible shot selection indexed once by version/coffee/style with stable tied timestamps.
- Per-coffee/style Community recommendation evidence refreshes at most once per five minutes while active/expanded, preserving prior successful evidence on network failure, never writing member data and isolating identity epochs.
- New automated tests address legacy data preservation, offline outbox, suggestion selection, hidden history, stale retries, refresh error handling and account swaps.
- No owner Locked product change, production SQL/Edge/Auth operation, purchases, publication or private export.

## Unverified by this report
- Literal inspection of every line in historical reports, archives, fixtures and all 751 files (metadata enumeration alone is not a source-level review).
- Real signed-in two-member and physical device acceptance, active browser network performance under real member load, and natural scheduled offsite Google Drive backup delivery/restore at the latest source.
- Per-request SQL EXPLAIN workload for production release traffic; advisors do not replace measurement.
- The independent extractor source candidate in PR162; it is not merged by Issue161.

## October 27 UTC — Source integration and additional operations findings

Safe tested runtime package PR163 merged `8bd32e5fef37384c2a0bdac5ec5a370964e98c0b`; exact merge tree and PR-head tree `620fee45086f7c88c8a5e5a2735442d2ff261fdc` identical. 1,651/1,657 Node pass, zero fail, six known skips, lint/build, isolated SQL and signed HTTP, packaged Chromium/synthetic mobile, source security, visual and approval checks successful; all four applicable merged-source push workflows SUCCESS. Full static source-pattern inspection included all 49 GitHub migrations (6,515 lines), 32 site text files, 27 source parser files and 51 scripts, and workflow definitions on development and default main. No original roster corpus or archived oracle changed.

**Live operations:** GitHub scheduled Oct 26 encrypted backup run 40341453705 SUCCESS, Sunday Oct25 weekly full regression 40194860522 FAILED due missing dist/sw.js in then-running mobile/offline step, now addressed in main by PR135 but unverified as a naturally run Sunday. Sunday Oct25 isolated recovery verification 40202770692 SUCCESS, but not proof of newest daily encrypted ciphertext's offsite delivery. Default-main cron definitions remain 08:00 UTC; actual GitHub Actions job start is not guaranteed at that minute. Preserve #28 backup/alerts and #134 schedule-acceptance trackers.

Netlify last-24-hour status totals at this check: 200=329, 404=218, 304=92, 301=11, 499=7, 429=1, no 5xx. Most 404s are non-existent WordPress installer, .env, .git and similar bot scans; they do not imply shipped app assets are missing. 499s were canceled connections, not proven application bugs. Supabase last-24-hour logs include 16 PG LOG, two PG ERROR (SQLSTATE 21000 and 42809), three Auth informational and five edge 200 records. One 21000 error matches a failed audit query; do not attribute the other error without source proof.

No production SQL, auth/edge, member data, Netlify publication or spending was performed. Full physical-device and genuine user HTTP/privacy acceptance remains unverified; not a release blocker for this narrowly source-complete efficiency change, but not a claimed pass.
