# Issue 96: repository-wide source and security inspection

## October 23 UTC / October 22 MDT: authorized intake and source acquisition
Owner requested new line-by-line inspection and penetration testing with repairs. Starting application459d2418, operations1678391d, productionf97b8f30. Preserve issue93 READY source, all Locked decisions, data, permissions and single-use publication boundary. No publication is authorized.

This same-commit audit-only workflow packages tracked source at immutable application/operations/production refs plus unique blobs at other branch tips. It has read-only repository permission, no persisted credentials, no secrets or provider access, and one-day private artifact retention. It does not execute repository application scripts. Container direct DNS/network is unavailable, so connected GitHub artifact download is required for local inspection. No claim of inspection/test completion yet.

Next: verify artifact hashes, read canonical recovery/decision/approval/queue records, inventory every file and line, perform security-focused semantic review and isolated attack suites, fix confirmed issues, run applicable CI, nonforce integrate and queue verified runtime changes. Every file must have a truthful coverage classification; automated screening is not manual semantic review. Production destructive, credential guessing, account/member mutation and denial-of-service tests are excluded. Provider-access limits and untested cases remain explicit.
