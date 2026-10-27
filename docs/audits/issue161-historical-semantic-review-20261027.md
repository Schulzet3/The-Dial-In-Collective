# Issue #161 — Historical source semantics and synthetic workload audit

**Scope and authority:** Owner asked for synthetic fuzz, load and concurrency testing plus manual semantic review of every historical source line. This file records what can be substantiated rather than equating automated line screening to human comprehension of every historical fact. No live member data, paid services, publication, main/release branch, production SQL/Auth/Edge or original frozen extractor oracle is changed.

## Complete prior-tree inventory and structural review

Independently fetched the private CI tracked-source archive for source tree `c54ade64eca30946df8858297578a172f5cf6fa8` (757 original files, 32.4 MB, 579,961 text lines). The archive SHA-256 `ad6010e5cf01315a87cf3a68279c8646aee682381b0186f8525a185849b22d83` and source manifest were verified in the prior audit. The new development branch includes later, parallel approved Issue33 changes; those retained files are out of scope for editing.

Historical review grouped every original file by its *meaning*, not just an extension. A source-aware local parser verified file hashes on 755 of the 757 pre-change files (the remaining two, `site/cloud/main.js` and `site/cloud/outbox.js`, were deliberately being edited and are subject to exact PR blob and CI verification). Categories for the unchanged historical inventory:

| Semantic category | Files | Text lines | Review approach |
|---|---:|---:|---|
| Historical extractor oracle, source evidence and archived audit records | 207 | 503,938 | Parse source data structures, duplicate-key checks, retain provenance and immutable baselines |
| Operational histories, current status and noncanonical docs | 145 | 13,449 | Check release/operational boundaries and historical/READY distinctions |
| Master Specification, Decision Ledger and approval coverage | 3 | 8,023 | Confirm explicit owner supersessions govern retired features |
| Executable app and parser sources | 70 | 12,014 | Inspect authorization, caching, import, DNS, recommendation, stale session and HTML trust boundaries |
| SQL migrations | 49 | 6,468 | Verify guard patterns, approved staged/destructive scope, role and search-path boundaries |
| Tests | 174 | 20,595 | Inspect regression provenance, negative cases and remaining blind spots |
| Workflows and operational scripts | 70 | 10,572 | Check exact source, private CI, safety, backup and release authority |
| Other configuration/assets | 37 | 3,819 | Inspect build/dependency boundaries and packaging |

Every historical JSON file was parsed with an object-pairs hook detecting repeated keys: **zero duplicate keys or JSON parse failures** in the unchanged baseline. Node syntax checks passed on **254 JS/MJS files**, Python AST on **20 Python files**, and `bash -n` on **8 shell scripts**. The earlier all-tracked-line audit reported 0 credential-pattern matches and 207 redacted findings; these represent a risk-prioritized review queue, not 207 demonstrated defects. No previously exact extractor case, historical note, source capture or approval was altered.

## Semantic finding reproduced by falsifiable interleaving

The cloud Outbox's *global* single-flight Promise and CloudApp's same-thread wait were intended to serialize mutations, but they also serialized two **different** member sessions. A deterministic hold of account A's remote mutation and a subsequent account B login proved B's flush could be delayed over 1,500 ms despite independent account scopes. A separate stalled A cloud read exposed the same app-level condition. This is a real availability and account-isolation boundary failure; prior account data must never overwrite new account state.

The scoped fix binds single-flight to owner **and session epoch**, maintains FIFO/idempotent mutation receipts within a session, and lets the new epoch refresh without awaiting the old request. After the patch, A's remaining queued events still belong to A, B's events are sent only as B, and late A network results are ignored by the app epoch guards. The fix does **not** cancel acknowledged server writes or discard original offline data.

## Additional new synthetic verification

- Fixed-seed **5,000 IPv4/DNS samples**, including blocked private and reserved sockets, without real DNS or network traffic.
- Fixed-seed **3,400 URL authority variations** covering protocol, credentials, non-default ports and fragments.
- **320** Unicode JSON bodies (UTF-8 byte cap), **4,000** rejected invalid-shot field cases.
- **400** queued shot writes with **20 overlapping flushes** checked exactly-once remote acknowledgments; **160** independent writes with deliberate conflicts checked durable pending receipt retention and no repeated rejected action.
- Cross-account queue and CloudApp race tests with a deliberately hung request, plus **600 coffees /6,000 historical-shaped shots** retaining original order, notes, hidden latest shots, archived bag references and source inputs.
- Pre-commit isolated local Node22 focus: **76 tests passed /0 failed**. Exact PR/full CI, browser, lint/build and SQL evidence must be read back prior to READY.

## What is *not* a completed manual semantic certification

The 503,938 lines of archived oracle and audit material contain independently sourced facts and adjudications. Parsing and reviewing their schemas, provenance, and error patterns is not an expert manually reading each factual assertion against its original roaster website, nor does any one finite context prove semantic correctness of all 579,961 lines. A literal manual human verification of every historical line remains **unperformed**; do not close that acceptance criterion on the strength of these scans, rename it to "manual complete", or modify immutable oracles without real source-backed review.

The synthetic workload does not substitute for two live member accounts, physical iOS/Android performance, paid infrastructure load testing, or actual production data mutation. Independent extractor Issue #33, previously merged READY items, the Master Specification, Decision Ledger and the one-publish-command boundary remain intact.
