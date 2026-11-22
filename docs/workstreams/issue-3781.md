# Issue #3781 — returning-session background admission (2026-11-22)

DIC_PREFLIGHT_VERIFIED development_sha=c70825e63c862e8388d0e5da6684426bfc35ca84 preflight_blob_sha=c59d7d5097a2224fcd254d6a4133c2cf01ee3a0f

- Authority: owner explicitly approved showing previously admitted returning member's saved workspace before each fresh server access check, with background revocation; current development c70825e63c862e8388d0e5da6684426bfc35ca84, PREFLIGHT blob c59d7d5097a2224fcd254d6a4133c2cf01ee3a0f; Master Specification and Decision Ledger narrow Locked supersession in THIS commit.
- Acceptance: same-owner unexpired session and prior server-admitted cached state paints before RPC; preview read-only; no Community/Admin/remote sync/writes; negative gate for first login/expired/no cache/pending/rejected/denied/password recovery; background explicit denial erases private UI/cache preserving owner-bound outbox; cross-account epoch fence, periodic retry, offline unchanged.
- Changed paths: site/cloud/main.js, site/cloud/client.js, tests/cloud-background-admission.test.mjs, docs/MASTER_SPECIFICATION.md, docs/DECISION_LEDGER.json, this scoped journal.
- Precommit check: full source fetched from exact SHA, single-anchor transforms, JSON.parse ledger PASS. CI status at commit creation: NOT YET RUN; report exact hosted statuses after PR and merge. This is a HIGH Auth/privacy change; no shortcut to source-bound CI.
- Release/provider: NOT_APPLICABLE; development only, no Netlify/Supabase writes, production and release branch untouched. Queue status remains subject to strict #3347 frozen-source candidate certification; do NOT label READY before five exact SUCCESS checks.
- Next action: run focused Node and applicable hosted CI; fix failures; nonforce integrate only after exact PASS, then reconcile issue, queue and current source evidence; NEW owner Publish required for production.
