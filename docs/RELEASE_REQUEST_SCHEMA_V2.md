# Release request schema 2: backup snapshot coverage

Schema 2 applies to new release requests after the operations audit. Previously
consumed schema-1 requests, grants and encrypted archives are historical receipts;
do not edit or replay them. This schema change does not authorize a publication.

Use `docs/RELEASE_REQUEST.schema-v2.example.json` as a field guide. It contains
deliberately invalid placeholders and `validate_only` mode. Replace each value
with independently checked evidence before constructing a real request. The
controller still requires the exact owner grant, tested source, current branch
leases, single-use claim, successful source checks and an exact two-file request
commit with the contemporaneous operations journal.

The explicit manual fallback requires the `release_evidence_json` workflow
input, using `docs/MANUAL_RELEASE_EVIDENCE.schema-v2.example.json`. It uses the
same evidence validation and single-use ledger. It must bind `release_id` and
`tested_source_sha` to the separate workflow inputs, and
`expected_main_head_sha` to both the current remote `main` and the workflow
checkout. Chat requests instead use `expected_main_parent_sha` to bind the
parent of their new two-file request commit. Manual dispatch never fabricates a
chat push event. Its mode must be `publish`; missing, stale or mismatched proof
stops the runner. Both examples are invalid until every placeholder is replaced
with verified evidence and an independently authorized, unconsumed owner grant.

## Snapshot coverage

The backup worker records `snapshot_started_at_utc` immediately before starting
the PostgreSQL export. This is a conservative lower bound on the snapshot time.
The same timestamp appears in the encrypted manifest and as the non-sensitive
`DIC_BACKUP_SNAPSHOT_STARTED_AT_UTC` line in its private Actions log.

New requests must establish this ordering from independent evidence:

`latest_observed_data_write_at_utc <= snapshot_started_at_utc <= archive_completed_at_utc <= verified_at_utc`

An archive that finishes after a data write may have started its snapshot before
that write. Therefore archive completion cannot substitute for snapshot start.
If a later write is observed, obtain a newer encrypted backup before release.
Do not infer a missing timestamp from archive completion or decrypt an archive
using a private key on a hosted runner. The owner retains the decryption key.

`archive_completed_at_utc` is the observed completion time of the encrypted
artifact, not the manifest creation timestamp. `verified_at_utc` is the time its
artifact identity, encrypted hash, owner-private offsite copy and data coverage
were checked. The existing two-hour request and backup-verification freshness
limits and the 24-hour credit observation limit still apply.

The archive retains post-export aggregate counts for a sanity check. Those
counts are explicitly later observations, so they do not prove that the earlier
snapshot contains a write. An isolated restore is separate evidence of recovery.

## Source custody

The operational backup workflow runs from `main`, retains encrypted artifacts
for 30 days and checks out application source at an immutable, independently
verified live commit. Advance that source pin only after the provider confirms
the replacement production deploy is ready and current. A moving branch head
does not establish what is live. The archive contains the application source
commit and SHA-256 in its encrypted manifest.

## Failure recovery

Release diagnostics distinguish a prepared candidate, an accepted Git ref and
the separately observed Netlify publication. A prepared candidate is not proof
of a successful push. After a push error, inspect the remote release ref and
provider state before considering any recovery; never automatically retry or
create another grant. Safe logs preserve Git's porcelain rejection details while
redacting credentials and URLs. Previously consumed grants remain consumed.
