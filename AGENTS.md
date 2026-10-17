# The Dial In Collective continuity

- Use `development/backend-foundation` for active application work and current documentation. The default `main` branch is the backup-operations branch, not current app source. Read branch refs before changing anything; never silently merge into main.
- Start with `docs/CURRENT_STATUS.md`, then `docs/MASTER_SPECIFICATION.md` and `docs/DECISION_LEDGER.json`. Use `docs/README.md` to locate precise acceptance/recovery evidence.
- Preserve every Locked decision. An implementation shortcut, historical checklist, or proposal cannot supersede it. Ask product questions one at a time; record an explicitly approved change in both canonical files with its narrow supersession scope before implementing it.
- Keep the fastest Log Shot → Rate → Recommendation workflow. Use The Dial In Collective and unhyphenated dial in in current product copy.
- Distinguish development source, CI results, published frontend, applied SQL/Edge changes, owner reports and independent provider observations. A GitHub commit is not a deployment.
- Do not infer deployment, migration, production-data mutation, account changes, purchases or provider reconfiguration from a continuity request. Follow the current owner's authorized scope and the existing deliberate release/credit gates.
- Preserve original evidence, encrypted backups, historical import safeguards and local/offline history. Historical reports are archived in place unless an approved move preserves their links and provenance. Do not repeat passed acceptance checks without a change, regression or distinct test scope.
- Before a GitHub write, inspect the current head and intended diff. Commit related work atomically, avoid release markers for documentation work, update refs without force using the expected head, then read the commit and changed files back from GitHub. Report the SHA, paths, checks, and anything inaccessible; do not use "verified" to imply a cryptographic signature.
- Update CURRENT_STATUS and the relevant evidence after each meaningful milestone, leaving an exact next action and open owner decision. Never commit credentials, recovery keys, private exports or raw provider tokens.
