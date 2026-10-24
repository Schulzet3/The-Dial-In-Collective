# Issue 5: trusted-source identity assurance

## October 23, 2026 MDT

Authorization: owner requested complete remaining focused tests and repairs, no production publication. Recovered from live development `b64bbfe642ef69a0232955ea5a993137ff0e306b`, Issue #5 history and October 23 owner-observed real two-account Arbey Cordoba approval/deduplication with independent read-only Supabase evidence. Previously existing trusted-source tests cover false domains, harvested release mismatch, reused URL, stale revision, revoke, service-only JWT and Pending retry; the latter are synthetic, NOT real logged-in negative evidence.

Confirmed gap: source parser checked explicit Process but not explicit Origin/Producer, and trusted server-only source target omitted proposed Producer. Narrow fix compares only independently stated JSON-LD Product additionalProperty fields, rejects ambiguous/conflicting facts, allows country-only versus region+country, never invents missing values. SQL target wrapper is service_role-only and read-only. Add Node negative tests and rollback-only SQL assertion. Preserve source host, release, role, freshness, retries, ownership, canonical identity, history and provenance.

Staged migration `20261024020500_dic_source_target_producer.sql` is NOT applied. Supabase Edge/frontend remain unchanged live. No production records, credentials or provider settings touched. Source exact-SHA CI/merge and release readiness must be read back before calling this READY; real production negative observations unverified.
