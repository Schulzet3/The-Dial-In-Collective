-- Issue #509 safe catalog inventory. Read-only; schema-local scalar aggregates.
-- Do not LEFT JOIN pg_class, pg_proc and pg_type simultaneously by namespace:
-- their independent one-to-many relationships multiply into enormous intermediate rows.
SELECT n.nspname AS schema,
       (SELECT COUNT(*) FROM pg_class c WHERE c.relnamespace=n.oid AND c.relkind IN ('r','p','v','m','f')) AS relations,
       (SELECT COUNT(*) FROM pg_proc p WHERE p.pronamespace=n.oid) AS routines,
       (SELECT COUNT(*) FROM pg_type t WHERE t.typnamespace=n.oid) AS types
FROM pg_namespace n
WHERE n.nspname NOT LIKE 'pg_temp_%'
  AND n.nspname NOT LIKE 'pg_toast_temp_%'
ORDER BY n.nspname;
