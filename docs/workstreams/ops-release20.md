# Release20 source-bound candidate CI guard baseline test

## 2026-11-06T14:15:33.704Z — repair previously published guard test fixture without weakening release controls
- Authority: owner Nov 6, 2026 'Publish' of the live 25 READY inventory; preparation/test repair only, no deployment.
- Failed exact candidate 48d4afe4a63d817b1e415794b14bcb9fe7bcd7ff, validate run 42231930887: 12/13 Netlify guard focused tests passed, one obsolete fixture hardcoded only older published baseline hashes and misclassified verified current published 06418ca2c9d391892747da77851a9384ca6e31e5. Other four check jobs succeeded on candidate.
- Test-only fix: dynamically verify candidate manifest published SHA against immutable candidate queue baseline and read exact old guard bytes via git show. Preserve subject-only behavior for genuine old publication guards and full-message skip behavior for upgraded published guards. Missing/incorrect ancestor fails closed. No production runtime, source policy, data or queue state changed.
- Scoped change: tests/netlify-credit-guard.test.mjs and this same-commit journal. Base development e70e4b8b9570bf352629e260b148d271d03968cc; exact-source CI verification PENDING after integration. Candidate r1 failed and must not publish; stage new r2 after this repair and certify 5/5, including source isolation and provider preflight. [skip netlify]

- First nonforce direct integration against 18fb1c678c2e9fa5225e4f513ba0ef8ffdfa936d returned an uncertain GraphQL error; actual development readback e70e4b8b9570bf352629e260b148d271d03968cc excluded that test commit. Rebased as a separate safe source commit for PR; no production action or forced rewrite.


## 2026-11-06T14:33:01.127Z - Release20 exact-source CI HOLD, no publication
- Owner-approved inventory: 25 READY at original source 820a49accfad4126d5fa55441b0106b1514025b2. An unrelated new #33 raw-script JSON-LD scanner became READY later and is explicitly excluded, not auto-added.
- Release candidate r1 48d4afe4a63d817b1e415794b14bcb9fe7bcd7ff: approval/cloud/mobile/SQL PASS; validate FAIL on stale hardcoded published-guard baseline test fixture, corrected by PR #1039, merged b0f67d88ab9981e818adc0afcbbd528a8d885294 with five green PR-head checks.
- Ops controller #1042 merged ba5b9d3b89dd7fae1575edf10d8e97e80d4f1b3e; main controller exact post-merge acceptance PASS. Changed only isolated unselected READY promotion safety check and narrow tests; no direct provider mutation.
- Candidate r2 71a78872fce891467eea44d3a5ee68edc6e40f95 from frozen 25-READY source eb1d90f32f77339d1a7f80df88147f8d94e728ea; four unfinished/unselected app paths restored to exact published bytes. Five checks: approval PASS, cloud PASS, mobile-browser PASS, SQL PASS; validate FAIL (run42233939206, 1060 PASS, 173 FAIL, 6 intentional SKIP). Error: selected READY coffee-page-metadata.mjs imports reconcileSelectedCoffeeReviewActorRoles, absent from frozen last-published coffee-source-facts.mjs. It exists in unfinished TESTING Issue33 #440. Actual unready code dependency, not safe to ship or ignore. Source and exact CI logs: https://github.com/Schulzet3/The-Dial-In-Collective/actions/runs/42233939206.
- Tracking issue https://github.com/Schulzet3/The-Dial-In-Collective/issues/1044. BLOCKED: independently certify #33-440 and required current official 3 selected Add Coffee after-proof, or remove/refactor ready-source dependency with tests; then stage/validate correct authorized scope. No release authorization grant, request, branch claim, Netlify build or production member/SQL/Edge/Auth write performed. Release19 remains current; DO NOT mark queued entries DEPLOYED.


## 2026-11-06T14:57:36.349Z - Issue #33 selected #440 exact-current after-proof trigger [skip netlify]
- Owner Nov 6: Fix it now, after Publish 25 READY. Issue #1044 requires #440 after-proof before marking READY. Base 62404598d12415139dd871111b78bef3baa7da98. #440 fix PR #956 merged e4d6551beed0f59cbb27f44f1fa23e77caabb565.
- The existing public source probe selector [dic-issue33-fiftyeighth3] covers #431/#437/#440 selected current pages, fact attribution, exact Add Coffee and source-review render. Prior successful run42180252873 PRECEDED #956 and cannot certify this fix. Trigger NEW source-bound current probe; read all three outcomes, exact #440 role facts and valid source identity. No member/prod/SQL/deploy writes. No 603-wide certification.
- Same-commit audit script comment and scoped release journal only; exact official after-proof and separate promotion pending. [skip netlify]
