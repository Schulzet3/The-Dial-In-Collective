# Issue #18 — Owner-retired Screenshot Extraction and Claude BYOK

**Owner decision (2026-10-28):** "I don't want screenshot or claude anymore. Let's close 18 and move on to the next one please."

**Source inspected:** GitHub Issue #18 (open, historically deferred), current development branch `d46e2df58dd6dc9fdb9652f5f0f83c68626674ff`, current Master Specification, Decision Ledger, active requirements view, approval matrix, release queue, and `site/cloud/main.js`, `site/cloud/client.js`, `src/server/coffee-page-metadata.mjs`. The current runtime supports URL autofill and manual input, not member screenshot/Claude features. Do not conflate historical source texts and QA imagery with active input support.

**Decision and scope:** Retire optional coffee screenshot OCR/upload/extraction, Claude API extraction and member-provided local Claude API-key UI as product requirements, including prior future deferral. Preserve deterministic URL extraction, editable manual/Pending workflows, data, history and privacy controls. Historical requirements remain readable and are superseded by the new top-level Master Specification and Ledger decision `UX-ISSUE18-RETIRE-SCREENSHOT-CLAUDE-20261028`.

**Implementation:** Canonical documentation, approval coverage, requirements crosswalk, Current Status and this same-commit journal are reconciled. No runtime code/migration/provider changes or artificial feature-test pass. Issue #18 to be closed with reason `not_planned` and checked by readback. Queue checked; no new deployable item exists or is needed. Preserve other READY queue entries. **No publication authorized.**

**Next issue:** #22 — offline outbox, simultaneous-device edits/stale revision, account switching and owner isolation. Review and test evidence pending; do not mark as passed merely from synthetic regression coverage.
