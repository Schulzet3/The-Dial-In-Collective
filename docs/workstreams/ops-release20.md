# Release20 source-bound candidate CI guard baseline test

## 2026-11-06T14:15:33.704Z — repair previously published guard test fixture without weakening release controls
- Authority: owner Nov 6, 2026 'Publish' of the live 25 READY inventory; preparation/test repair only, no deployment.
- Failed exact candidate 48d4afe4a63d817b1e415794b14bcb9fe7bcd7ff, validate run 42231930887: 12/13 Netlify guard focused tests passed, one obsolete fixture hardcoded only older published baseline hashes and misclassified verified current published 06418ca2c9d391892747da77851a9384ca6e31e5. Other four check jobs succeeded on candidate.
- Test-only fix: dynamically verify candidate manifest published SHA against immutable candidate queue baseline and read exact old guard bytes via git show. Preserve subject-only behavior for genuine old publication guards and full-message skip behavior for upgraded published guards. Missing/incorrect ancestor fails closed. No production runtime, source policy, data or queue state changed.
- Scoped change: tests/netlify-credit-guard.test.mjs and this same-commit journal. Base development e70e4b8b9570bf352629e260b148d271d03968cc; exact-source CI verification PENDING after integration. Candidate r1 failed and must not publish; stage new r2 after this repair and certify 5/5, including source isolation and provider preflight. [skip netlify]

- First nonforce direct integration against 18fb1c678c2e9fa5225e4f513ba0ef8ffdfa936d returned an uncertain GraphQL error; actual development readback e70e4b8b9570bf352629e260b148d271d03968cc excluded that test commit. Rebased as a separate safe source commit for PR; no production action or forced rewrite.
