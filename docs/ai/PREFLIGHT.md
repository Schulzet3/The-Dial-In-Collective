# Mandatory starting point for EVERY DIC task

**Single task entrypoint:** [docs/ai/PREFLIGHT.md](PREFLIGHT.md) on the live `development/backend-foundation` branch of `Schulzet3/The-Dial-In-Collective`. This is the first **document** to retrieve for every DIC request (questions, audits, development, automation, backup and publication). The link is a route, not independent product authority.

## 0. Retrieve and bind live authority FIRST

1. Resolve the current `development/backend-foundation` Git commit SHA using the live GitHub ref. Retrieve **this PREFLIGHT.md at that exact SHA**, not the default `main` branch, an old chat, a memory summary, or a cached Project attachment. For operations/release work, additionally resolve the live `main` and/or `release/production` refs. Recheck relevant refs before an uncertain write.
2. **Fail closed:** if the current preflight bytes or required branch SHA cannot be retrieved and verified, record `BLOCKED: PREFLIGHT_UNAVAILABLE`; perform **no GitHub/provider writes** and make no fresh VERIFIED, READY or DEPLOYED assertions. A safe general explanation may continue, explicitly marked unverified. Do not invent a fallback procedure or assume GitHub access.
3. Apply the provided ChatGPT Project Instructions if accessible, then this task route. They do not themselves prove that live GitHub was fetched; the full `AGENTS.md` and Locked authority remain controlling for their scope.

## 1. Select the shortest topic route

Read [CONTEXT_ENTRYPOINT.md](CONTEXT_ENTRYPOINT.md) **after this preflight** for relevant paths. Do not start there or treat its historical pointers as current live state. Select only task-specific authority:

- **Any substantive development:** current `AGENTS.md`, relevant scoped GitHub journal and issue/PR, `docs/CURRENT_STATUS.md`, `docs/MASTER_SPECIFICATION.md`, `docs/DECISION_LEDGER.json`, `docs/APPROVAL_COVERAGE_MATRIX.json`, `docs/RELEASE_QUEUE.json`, actual branch SHA and exact applicable CI. Inspect concurrent/incomplete work first.
- **Questions/status/brainstorming:** use only necessary live topic evidence and owner decisions; answer without unauthorized edits or a full repository reread.
- **Backup/recovery:** use `main` and #28 recovery/Drive evidence, preserving encrypted archives, key privacy and verified restore prerequisites.
- **Publication (only on NEW owner `Publish`):** read the live queue, #417/#457/#2169 runbook, Nov 6 incident, current Git refs, five exact-source CI checks, grant, main push-controller and Netlify READY/current. No preparation, staging, grant or production write from a development-only request.
- **Audits/research:** follow scoped #33/#267/#455/#504/#508/#509 ledgers, provenance and privacy boundaries; metadata inventory is not semantic proof.

## 2. Approve the actual action, not a guessed process

Identify explicit owner scope and current Locked decisions (Master Spec **and** Decision Ledger), applicable supersessions, data/privacy impact, and required recovery. No research or brainstorming automatically approves a product change. Use the existing #457 risk-tier test matrix: **one applicable build**, no duplicate test suite, reuse matching exact-source PASS evidence. SKIPPED, pending, NOT_APPLICABLE and PR-only status are not PASS. Respect `development/backend-foundation` = app, `main` = operations, `release/production` = publication. No invented release steps, manual owner GitHub triggers or unapproved releases.

## 3. Execute, verify and close the loop

For an authorized change: specify verifiable acceptance criteria; make safe nonforce source changes; include SAME-COMMIT scoped journal with `[skip netlify]` for code/test/CI; run focused and applicable hosted exact-source checks; repair failures and verify merged SHA/files. Reconcile the existing issue, journal, CURRENT_STATUS and queue without changing READY unless source, test evidence and approval justify it. For provider effects, read back actual provider state. Do not report success from a PR, a scheduled workflow, or a failed/pending check.

**Mandatory source/test/CI preflight receipt:** Before changing application code, scripts, tests or workflows, retrieve the live development SHA and that commit's PREFLIGHT.md Git blob. Add a NEW standalone line to the SAME-COMMIT scoped journal:

    DIC_PREFLIGHT_VERIFIED development_sha=<40-hex-source-SHA> preflight_blob_sha=<40-hex-Git-blob-SHA>

The existing approval continuity check validates the NEW first-parent journal line against actual Git objects and ancestry. Never reuse a stale line or invent a hash; on missing evidence fail closed. Historical pre-rollout commits are exempt, not silently relabeled PASS. This checks an auditable attestation, not whether the assistant truly fetched/read the file; privileged GitHub bypass remains possible.

**Mandatory evidence report for substantial tasks:** `PREFLIGHT [VERIFIED|BLOCKED] (Git branch SHA + preflight blob SHA); authority/owner scope; changes and merged SHA; exact tests/CI; provider readback or NOT_APPLICABLE; remaining blockers/next action; state VERIFIED, READY, BLOCKED or DEPLOYED.`

**Enforcement limit:** CI can reject missing or weakened repository preflight documentation and verify same-commit journals; it cannot prove a ChatGPT conversation retrieved a document or prevent privileged direct GitHub writes on Free/private. Never claim universal 100% enforcement. GitHub does not automatically update ChatGPT Project Settings; only the owner can paste the current full instructions there.
