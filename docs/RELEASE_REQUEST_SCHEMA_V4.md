# Current release request schema v4 (owner-monitored Netlify credits)

**Authoritative from 2026-10-22.** This source contract supersedes schema v2 and v3 for NEW owner-approved release requests. Older executed requests and credit snapshots are preserved as historical records, never replayed. A development/build request is NOT permission to publish. An owner instruction to publish/deploy a selected READY queue or named READY feature IS the one release approval; no second confirmation after readiness report.

## Two examples (invalid placeholders, not executable approvals)
- `docs/RELEASE_REQUEST.schema-v4.example.json`: narrow authenticated chat request with `expected_main_parent_sha`, mode `validate_only` or owner-authorized `publish`.
- `docs/MANUAL_RELEASE_EVIDENCE.schema-v4.example.json`: manual GitHub workflow fallback with `expected_main_head_sha`, mode `publish`. Inputs must be bound to the exact workflow main SHA and separate release ID / tested source inputs.

## Exact schema
Fields: `schema_version:4`, `release_id`, `tested_source_sha`, `expected_release_head_sha`, `expected_development_head_sha`, `owner_approval_source`, `created_at_utc`, `backup_evidence`, `database_change_risk`, `mode`, and exactly one main-lease field described above. No unknown fields. `backup_evidence` requires `artifact_id`, `encrypted_sha256`, `owner_private_offsite_file_id`, `snapshot_started_at_utc`, `archive_completed_at_utc`, `verified_at_utc`, `latest_observed_data_write_at_utc`. Valid risks: `none`, `non_destructive`, `potentially_destructive`; the controller reclassifies real SQL changes and fails closed on mismatch. For potentially destructive database changes, backup evidence must cover the latest observed write and pass the narrow freshness rule; routine releases use previously verified scheduled archives.

**No Netlify credit evidence, balance, plan expiration, minimum credit amount, or billing timestamp is collected or checked.** Owner monitors credits. Provider may independently reject quota at publish; never buy/top-up/upgrade without separate owner approval. Preserve exact source-bound one-use release grant, advisory GitHub CI checks, serialized nonforce claim, legitimate provider routing and postflight. Changing this schema or these example files never triggers a production deployment or consumes an approval.

## Controlled transport
The GitHub main push controller accepts only a new one-parent, nonforce `ops(release-request): ID [skip netlify]` commit changing exactly `docs/RELEASE_REQUEST.json` and the append-only ops journal; validates before SHA, event SHA, live refs, grant, 5 required checks and queue readiness. No user should edit historical request files to attempt replay. The default branch manual workflow remains a fallback; no second approval for already authorized components.
