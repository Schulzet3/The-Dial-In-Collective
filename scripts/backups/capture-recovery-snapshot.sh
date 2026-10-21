#!/bin/sh
# PostgreSQL 17 collector. The caller owns a private output directory and its
# cleanup trap. Source access stays read-only; nothing is uploaded here.
set -eu
umask 077
: "${SUPABASE_DB_URL:?Missing source connection}"
cd "${1:?Missing private snapshot output directory}"

cat > core-counts.sql <<'SQL'
select (select count(*) from auth.users),
       (select count(*) from auth.identities),
       (select count(*) from private.beta_members),
       (select count(*) from private.import_control),
       (select count(*) from public.account_preferences),
       (select count(*) from public.coffees),
       (select count(*) from public.setups),
       (select count(*) from public.library_entries),
       (select count(*) from public.shots);
SQL
cat > table-list-query.sql <<'SQL'
select format('select %L, count(*) from %I.%I;',
              schemaname || '.' || tablename, schemaname, tablename)
from (
 select schemaname, tablename from pg_tables
 where schemaname in ('public', 'private')
 union all select 'auth'::text, 'users'::text
 union all select 'auth'::text, 'identities'::text
) inventory
order by schemaname, tablename;
SQL
cat > app-schema-inventory.sql <<'SQL'
select concat_ws('|',
 (select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname in ('public','private') and c.relkind in ('r','p')),
 (select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname in ('public','private') and c.relkind in ('r','p') and c.relrowsecurity),
 (select count(*) from pg_policy p join pg_class c on c.oid=p.polrelid
  join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','private')),
 (select count(*) from pg_indexes where schemaname in ('public','private')),
 (select count(*) from pg_trigger t join pg_class c on c.oid=t.tgrelid
  join pg_namespace n on n.oid=c.relnamespace
  where n.nspname in ('public','private') and not t.tgisinternal),
 (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname in ('public','private')),
 (select count(*) from pg_trigger t where t.tgrelid='auth.users'::regclass
  and t.tgname='dic_auth_user_created' and not t.tgisinternal));
SQL
cat > row-fingerprint-generator.sql <<'SQL'
select format(
  'select %L, md5(coalesce(string_agg(md5(to_jsonb(t)::text), %L order by md5(to_jsonb(t)::text)), %L)) from %I.%I t;',
  schemaname || '.' || tablename, '', '', schemaname, tablename)
from (
 select schemaname,tablename from pg_tables where schemaname in ('public','private')
 union all select 'auth'::text, 'users'::text
 union all select 'auth'::text, 'identities'::text
) inventory
order by schemaname,tablename;
SQL

# pg_dump imports the exporting transaction's snapshot. The same transaction
# reads every expected count, metadata total and payload fingerprint, so a
# legitimate concurrent data write cannot make the dump disagree with them.
# ON_ERROR_STOP covers SQL/meta-command errors, but not a failed \! child.
# Check SHELL_ERROR as well, and require the completion marker after ROLLBACK;
# an early \quit must never become a successful capture.
if ! DIC_CAPTURE_RESULT=$(PGAPPNAME=dic-recovery-snapshot psql \
  --no-psqlrc --no-password --quiet --tuples-only --no-align \
  --set=ON_ERROR_STOP=1 --dbname="$SUPABASE_DB_URL" <<'SQL'
begin transaction isolation level repeatable read read only;
set local row_security = off;
select pg_export_snapshot() as dic_snapshot \gset
\setenv DIC_RECOVERY_SNAPSHOT :dic_snapshot
\! pg_dump --dbname="$SUPABASE_DB_URL" --snapshot="$DIC_RECOVERY_SNAPSHOT" --no-password --format=custom --no-owner --no-privileges --file=database.dump
\if :SHELL_ERROR
  \warn Recovery pg_dump failed; refusing incomplete snapshot evidence.
  \quit
\endif
\setenv DIC_RECOVERY_SNAPSHOT
\o expected-counts.txt
\i core-counts.sql
\o table-count-selects.sql
\i table-list-query.sql
\o expected-all-counts.tsv
\i table-count-selects.sql
\o live-app-metadata.txt
\i app-schema-inventory.sql
\o table-row-fingerprints.sql
\i row-fingerprint-generator.sql
\o source-row-fingerprints.tsv
\i table-row-fingerprints.sql
\o
rollback;
\echo DIC_RECOVERY_SNAPSHOT_CAPTURED
SQL
); then
  echo '::error::Recovery snapshot transaction failed; no valid capture.' >&2
  exit 1
fi
if [ "$DIC_CAPTURE_RESULT" != DIC_RECOVERY_SNAPSHOT_CAPTURED ]; then
  echo '::error::Recovery snapshot did not complete; no valid capture.' >&2
  exit 1
fi
pg_restore --list database.dump > contents.toc
