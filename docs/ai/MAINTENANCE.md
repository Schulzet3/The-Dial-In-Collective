# Knowledge-system maintenance and verification

GitHub is the durable project authority; ChatGPT memory and Project attachments are supplementary retrieval surfaces. The five `docs/ai` files are a **navigation and evidence layer**, not a replacement Master Specification or operational release records.

## Intake and changes
1. Discover each attachment, nested archive member and GitHub source at an exact version. Classify source type, privacy, rights, authority and relevant topic before copying bytes.
2. Hash original bytes with SHA-256 and record size, archive member path, external location/version and how accessibility was tested. Mark `ACCESS_UNVERIFIED` if a Project attachment may not be available in a future session. Record exact Git blob SHA for committed copies.
3. For exact duplicate hashes, preserve all occurrence references and designate one working copy; do not delete originals or erase migration/decision history. Similar text is **not** a verified duplicate.
4. Maintain separate levels: `FILE_VERIFIED` (retrieved and hashed), `CONTENT_REVIEWED` (direct substantive review with coverage), `CLAIMS_VERIFIED` (independent relevant evidence). Machine inventories, regex and summaries do not imply semantic review.
5. Privacy/rights review before permanent GitHub copies; exclude unredacted transcripts/JSON exports, secrets, member data and production dumps. The approved private encrypted-backup folder is not a general documentation repository.
6. New owner decision: update Master Spec **and** Decision Ledger, scoped supersession and coverage evidence. Completed feature/fix: update issue journal/current status/release queue with exact source/test evidence. New research: register, assess claims independently and document uncertainty; do not silently modify heuristics.
7. Track link integrity, JSON schema/enum/ID uniqueness, archive completeness, hashes, Git paths and approval references with lightweight deterministic checks when available. Do not create new workflow/CI code without same-commit journal and exact-source checks.
8. Documentation commits: follow non-force Git, `[skip netlify]`, verify final SHA/changed paths/readback and relevant CI. Record unresolved defects and do not equate docs integration with production DEPLOYED.
9. Keep `docs/README.md` and `AGENTS.md` pointing here; GitHub Project Instructions and actual ChatGPT Project Settings are separate copies, and only owner changes the latter. If instruction changes are essential, provide a full **≤8,000-character** GitHub-matching paste-ready replacement.

## Boundaries
- Issue #267 V2 frozen (757 files / 579,961 lines) and separate current code tracks remain source-of-truth for semantic code review; inventory does not change their counts.
- #33 deterministic extraction, #96 privacy/auth and #28 backups retain independent authority.
- Preserve original603 oracle/captures, Locked behavior, migrations, community/history/offline/private shots, release receipts and encrypted backups.
- No production Netlify/Supabase/provider writes, purchases, plan upgrades or unnecessary secrets exposure under documentation authority.

## Status definitions
`ACCESS_VERIFIED`: bytes actually available at identified version at verification time; `ACCESS_UNVERIFIED`: historical attachment or locator not proven durable. `INVENTORIED`: metadata only; `CONTENT_REVIEWED`: direct substantive analysis of identified scope; `CLAIMS_PARTIALLY_VERIFIED`: some external assertions checked, not universal science certification. Lack of evidence is explicitly `NOT_VERIFIED`, not PASS.

## Acceptance
A knowledge intake reports parent archive counts and meaningful nested file counts, exact hashes where obtainable, register/entrypoint/authority/preflight/maintenance files, safe Git readback, link/JSON validation, restrictions and remaining access/citation gaps. Re-run focused checks after any source change; never silently claim 100% coverage.
