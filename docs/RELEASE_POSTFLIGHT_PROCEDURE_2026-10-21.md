# Read-only postrelease verification checklist

This procedure performs no publish, SQL/Edge/Auth update, production member mutation or paid action. It supplements, never replaces, the unique authorized release controller and source CI.

1. **Record the actual grant and immutable source.** Confirm one-use ID, tested SHA, GitHub branch claim, consumed ledger and successful latest exact-SHA \`approval\`/\`validate\`/\`cloud-tests\`/\`mobile-browser-qa\`/\`sql\`. GitHub Free private push checks remain advisory.
2. **Independently read Netlify.** Query the actual project current deploy, confirm \`READY/current\`, \`release/production\`, exact commit SHA/ID and installed function. Never substitute GitHub push success or an old status file. Document new deploy ID and publish time.
3. **Read Supabase without mutations.** Confirm intended migration versions and Edge function version/\`verify_jwt\`; if expected backend is absent, stop rather than exercise incompatible frontend paths. Query only aggregate counts and access-control metadata; do not fetch/export member-private notes or secrets for the report.
4. **Check privacy with existing permitted accounts.** Reuse valid authenticated owner/member evidence where the code and roles are unchanged. If a changed feature requires a new real check, perform only that narrow authorized action, never insert throwaway production shots or change other members to manufacture PASS. Record any inaccessible device check as UNVERIFIED, not FAIL or PASS.
5. **Account for backup and cost truthfully.** Compare snapshot creation to latest user write, private offsite archive checksum and historical restore receipt. A valid ZIP is not proof the exact archive was restored. Netlify \`READY\` is not a billing receipt; mark actual debit/remaining credits UNKNOWN when unavailable.
6. **Close with source → CI → provider → acceptance matrix.** Update active journal, current status, coverage matrix/credit ledger when provider evidence changes, affected issues and precise next action. Verify actual GitHub write SHA/files. Never silently close outstanding owner acceptance, accessibility or offline/device cases.

If provider, billing, or GitHub write readback fails, stop further production actions; document exact last verified state and the unsupported claim.
