# The Dial In Collective

Better espresso through shared experience.

## Development status

This branch contains the first applied cloud database foundation. It does **not** yet replace the local v0.2.0 prototype or provide a hosted beta.

- [Verified backend checkpoint and remaining work](docs/BACKEND_CHECKPOINT.md)
- [Master Specification backend addendum](docs/MASTER_SPECIFICATION_BACKEND_ADDENDUM.md)
- [Decision Ledger backend amendments](docs/DECISION_LEDGER_BACKEND_AMENDMENTS.json)
- [Applied migrations](supabase/migrations/)
- [60-check database security/integrity suite](supabase/tests/security_foundation.sql)

The existing Master Specification, Decision Ledger and prototype addendum remain authoritative for unchanged requirements. Preserve Locked decisions; document changes explicitly. Keep the experience sleek, clean and centered on **Log Shot -> Rate -> Recommendation**.

## Database testing

On a development/test Supabase database with all migrations applied, use the migration role:

```sh
psql "$TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/security_foundation.sql
```

The suite creates temporary synthetic users/data and rolls the transaction back. It is not a browser-login or synchronization test. Never paste credentials into chat or commit connection strings, exports or backup files.

## Deployment boundary

Source is on `development/backend-foundation`. Database migrations were applied to the existing empty development project; no paid preview branch was created. No real account or shot data was seeded, and the user's local app was not changed.

Real authentication UI, invitation admission, syncing, cloud community calculations, hosted delivery and Google Drive backup/restore remain the next implementation stages. No automated backup is currently running.
