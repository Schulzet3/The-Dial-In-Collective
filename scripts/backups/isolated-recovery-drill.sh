#!/usr/bin/env bash
# Disposable recovery drill: live source is read-only, restore target is offline.
set -Eeuo pipefail
umask 077
: "$SUPABASE_DB_URL"
: "$SUPABASE_PROJECT_REF"
if [[ -z "$SUPABASE_DB_URL" || "$SUPABASE_DB_URL" != *"$SUPABASE_PROJECT_REF"* ]]; then
  echo "::error::Missing connection or unexpected Supabase project"; exit 1
fi
OUT="$RUNNER_TEMP/dic-restore-drill-$GITHUB_RUN_ID"
CONTAINER="dic-restore-$GITHUB_RUN_ID"
mkdir -p "$OUT"
cleanup() { docker rm -f "$CONTAINER" >/dev/null 2>&1 || true; rm -rf "$OUT"; }
trap cleanup EXIT
docker run --rm --user "$(id -u):$(id -g)" --env SUPABASE_DB_URL \
  --env PGSSLMODE=require --volume "$OUT:/out" postgres:17-alpine sh -euc '
  pg_dump --dbname="$SUPABASE_DB_URL" --format=custom \
    --no-owner --no-privileges --file=/out/database.dump
  pg_restore --list /out/database.dump > /out/contents.toc
  psql --no-psqlrc --dbname="$SUPABASE_DB_URL" --tuples-only --no-align \
    --command="select (select count(*) from auth.users),
             (select count(*) from auth.identities),
             (select count(*) from private.beta_members),
             (select count(*) from private.import_control),
             (select count(*) from public.account_preferences),
             (select count(*) from public.coffees),
             (select count(*) from public.setups),
             (select count(*) from public.library_entries),
             (select count(*) from public.shots)" > /out/expected-counts.txt
'
# Rebuild EVERY first-party public/private table plus the core Auth identity pair.
# Constraints, RLS and functions are versioned in source migrations and need a
# separate managed-Supabase configuration check.
awk '
/^[0-9]+;/ {
  if ($0 ~ / (TABLE|TABLE DATA) auth (users|identities) / ||
      $0 ~ / (TABLE|TABLE DATA) (private|public) [A-Za-z_0-9]+ /)
    print $0
}' "$OUT/contents.toc" > "$OUT/recovery.toc"
SOURCE_TABLE_COUNT=$(grep -Ec ' TABLE DATA (public|private) [A-Za-z_0-9]+ ' "$OUT/contents.toc")
if [[ "$SOURCE_TABLE_COUNT" -lt 30 ]]; then
  echo "::error::Snapshot unexpectedly contains fewer than 30 first-party tables"; exit 1
fi
# Query every first-party table count from the live source. Only table names and
# counts are retained, never user records or plaintext backup artifacts.
cat > "$OUT/table-list-query.sql" <<'SQL'
select format('select %L, count(*) from %I.%I;',
              schemaname || '.' || tablename, schemaname, tablename)
from pg_tables
where schemaname in ('public', 'private')
order by schemaname, tablename;
SQL
docker run --rm --user "$(id -u):$(id -g)" \
  --env SUPABASE_DB_URL --env PGSSLMODE=require \
  --volume "$OUT:/out" postgres:17-alpine sh -euc '
  psql --no-psqlrc --tuples-only --no-align --dbname="$SUPABASE_DB_URL" \
    --file=/out/table-list-query.sql > /out/table-count-selects.sql
  printf "%s\n" \
    "select '\''auth.users'\'', count(*) from auth.users;" \
    "select '\''auth.identities'\'', count(*) from auth.identities;" \
    >> /out/table-count-selects.sql
  psql --no-psqlrc --tuples-only --no-align --dbname="$SUPABASE_DB_URL" \
    --file=/out/table-count-selects.sql > /out/expected-all-counts.tsv
'
if [[ "$(wc -l < "$OUT/expected-all-counts.tsv")" -ne $((SOURCE_TABLE_COUNT + 2)) ]]; then
  echo "::error::Source table inventory does not match the expected database scope"; exit 1
fi

for tbl in "auth users" "auth identities" "private beta_members" "private import_control" \
 "public account_preferences" "public coffees" "public setups" \
 "public library_entries" "public shots"; do
  grep -Fq " TABLE $tbl " "$OUT/recovery.toc" || {
    echo "::error::Required source table DDL missing"; exit 1
  }
  grep -Fq " TABLE DATA $tbl " "$OUT/recovery.toc" || {
    echo "::error::Required source table DATA missing"; exit 1
  }
done
# No published ports and no network connectivity from the restore target.
docker run -d --rm --name "$CONTAINER" --network none \
  --env POSTGRES_HOST_AUTH_METHOD=trust postgres:17-alpine >/dev/null
# Docker's postgres image starts a temporary Unix-socket-only server during
# initdb, shuts it down, then starts the real server. A socket readiness probe
# can pass against that temporary server and race its shutdown.
# TCP on container loopback becomes ready only when the final server is up.
# --network none keeps the target isolated from all external networks.
ready=0
for i in $(seq 1 50); do
  if docker exec -u postgres "$CONTAINER" pg_isready -h 127.0.0.1 -U postgres -q; then ready=1; break; fi
  sleep 1
done
[[ "$ready" == 1 ]] || {
  echo "::error::Final isolated PostgreSQL did not become TCP-ready";
  docker logs "$CONTAINER" 2>&1 | tail -n 80 || true
  exit 1
}
docker exec -u postgres "$CONTAINER" psql -X -v ON_ERROR_STOP=1 -U postgres -d postgres \
 -c 'CREATE SCHEMA auth; CREATE SCHEMA private;
     CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT NULL::uuid $$;' >/dev/null
docker cp "$OUT/database.dump" "$CONTAINER:/tmp/database.dump" >/dev/null
docker cp "$OUT/recovery.toc" "$CONTAINER:/tmp/recovery.toc" >/dev/null
docker exec -u root "$CONTAINER" chmod 644 /tmp/database.dump /tmp/recovery.toc
docker exec -u postgres "$CONTAINER" pg_restore --exit-on-error \
  --no-owner --no-privileges -L /tmp/recovery.toc -U postgres -d postgres \
  /tmp/database.dump >/dev/null
RESTORED=$(docker exec -u postgres "$CONTAINER" psql -X -v ON_ERROR_STOP=1 \
 -U postgres -d postgres --tuples-only --no-align \
 --command="select (select count(*) from auth.users),
             (select count(*) from auth.identities),
             (select count(*) from private.beta_members),
             (select count(*) from private.import_control),
             (select count(*) from public.account_preferences),
             (select count(*) from public.coffees),
             (select count(*) from public.setups),
             (select count(*) from public.library_entries),
             (select count(*) from public.shots)")
EXPECTED=$(tr -d '[:space:]' < "$OUT/expected-counts.txt")
RESTORED=$(printf '%s' "$RESTORED" | tr -d '[:space:]')
if [[ "$RESTORED" != "$EXPECTED" ]]; then
  echo "::error::Restored account and app table row counts do not match"; exit 1
fi
RESTORED_TABLE_COUNT=$(docker exec -u postgres "$CONTAINER" psql -X -v ON_ERROR_STOP=1 \
  -U postgres -d postgres --tuples-only --no-align \
  --command="select count(*) from information_schema.tables where table_schema in ('private','public') and table_type='BASE TABLE'")
RESTORED_TABLE_COUNT=$(printf '%s' "$RESTORED_TABLE_COUNT" | tr -d '[:space:]')
if [[ "$RESTORED_TABLE_COUNT" != "$SOURCE_TABLE_COUNT" ]]; then
  echo "::error::Not all public/private tables restored"; exit 1
fi
docker cp "$OUT/table-count-selects.sql" "$CONTAINER:/tmp/table-count-selects.sql" >/dev/null
docker exec -u root "$CONTAINER" chmod 644 /tmp/table-count-selects.sql
docker exec -u postgres "$CONTAINER" psql -X -v ON_ERROR_STOP=1 \
  -U postgres -d postgres --tuples-only --no-align \
  --file=/tmp/table-count-selects.sql > "$OUT/restored-all-counts.tsv"
if ! cmp -s "$OUT/expected-all-counts.tsv" "$OUT/restored-all-counts.tsv"; then
  echo "::error::At least one restored app/Auth table row count differs from source"; exit 1
fi
# FIRST_PARTY_METADATA_RESTORE_CHECK
# Rebuild app-owned functional schema in the same disposable database. This is
# distinct from provider-managed Supabase Auth/Storage service restoration.
# Only SQL objects from public/private are selected; no secrets or user data
# are written to the GitHub workspace or uploaded as artifacts.
awk '
/^[0-9]+;/ &&
/ (FUNCTION|PROCEDURE|AGGREGATE|SEQUENCE|SEQUENCE OWNED BY|DEFAULT|CONSTRAINT|FK CONSTRAINT|INDEX|TRIGGER|ROW SECURITY|POLICY|VIEW|MATERIALIZED VIEW|TYPE|DOMAIN) (public|private) / {
  print
}
# First-party signup provisioning trigger is attached to the managed Auth table.
/^[0-9]+;/ && / TRIGGER auth users dic_auth_user_created / {
  print
}' "$OUT/contents.toc" > "$OUT/recovery-metadata.toc"
test -s "$OUT/recovery-metadata.toc" || {
  echo "::error::No application metadata found in database dump"; exit 1;
}
grep -Fq ' TRIGGER auth users dic_auth_user_created ' "$OUT/recovery-metadata.toc" || {
  echo "::error::The first-party Auth signup provisioning trigger is missing from the dump"; exit 1;
}
# App foreign keys reference auth.users(id). Restore the source core Auth key
# constraints/indexes too; bare auth tables have no unique keys and cannot
# support faithful app foreign-key recovery. This does not start Supabase Auth.
awk '
/^[0-9]+;/ && / (CONSTRAINT|INDEX) auth (users|identities) / {
  print
}' "$OUT/contents.toc" > "$OUT/recovery-auth-keys.toc"
test -s "$OUT/recovery-auth-keys.toc" || {
  echo "::error::Core Auth primary key metadata missing in database dump"; exit 1;
}
docker cp "$OUT/recovery-auth-keys.toc" "$CONTAINER:/tmp/recovery-auth-keys.toc" >/dev/null
docker exec -u root "$CONTAINER" chmod 644 /tmp/recovery-auth-keys.toc
docker exec -u postgres "$CONTAINER" pg_restore --exit-on-error \
  --no-owner --no-privileges -L /tmp/recovery-auth-keys.toc \
  -U postgres -d postgres /tmp/database.dump >/dev/null

# Supabase's managed project provides these roles. The offline database creates
# inert NOLOGIN stubs for policy SQL; no authentication services are started.
docker exec -u postgres "$CONTAINER" psql -X -v ON_ERROR_STOP=1 -U postgres -d postgres \
  -c 'CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN;' >/dev/null
docker cp "$OUT/recovery-metadata.toc" "$CONTAINER:/tmp/recovery-metadata.toc" >/dev/null
docker exec -u root "$CONTAINER" chmod 644 /tmp/recovery-metadata.toc
docker exec -u postgres "$CONTAINER" pg_restore --exit-on-error \
  --no-owner --no-privileges -L /tmp/recovery-metadata.toc \
  -U postgres -d postgres /tmp/database.dump >/dev/null

# Compare all first-party policies, indexes, noninternal triggers and functions
# and RLS-enabled table counts against the unchanged hosted source. Totals
# reveal no personal records, descriptions, secret material or user IDs.
cat > "$OUT/app-schema-inventory.sql" <<'SQL'
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
docker run --rm --user "$(id -u):$(id -g)" \
  --env SUPABASE_DB_URL --env PGSSLMODE=require \
  --volume "$OUT:/out" postgres:17-alpine sh -euc '
  psql --no-psqlrc --tuples-only --no-align --dbname="$SUPABASE_DB_URL" \
    --file=/out/app-schema-inventory.sql > /out/live-app-metadata.txt
'
docker cp "$OUT/app-schema-inventory.sql" "$CONTAINER:/tmp/app-schema-inventory.sql" >/dev/null
docker exec -u root "$CONTAINER" chmod 644 /tmp/app-schema-inventory.sql
docker exec -u postgres "$CONTAINER" psql -X -v ON_ERROR_STOP=1 -U postgres -d postgres \
 --tuples-only --no-align --file=/tmp/app-schema-inventory.sql > "$OUT/restored-app-metadata.txt"
LIVE_METADATA=$(tr -d '[:space:]' < "$OUT/live-app-metadata.txt")
RESTORED_METADATA=$(tr -d '[:space:]' < "$OUT/restored-app-metadata.txt")
if [[ "$LIVE_METADATA" != "$RESTORED_METADATA" ]]; then
  echo "::error::First-party schema metadata mismatch: live=$LIVE_METADATA restored=$RESTORED_METADATA"
  exit 1
fi
echo "PASS: Application RLS, policies, indexes, triggers, functions and signup trigger match the live metadata counts ($LIVE_METADATA)."

# ROW_FINGERPRINT_CONTENT_RESTORE_CHECK
# Row counts alone do not establish payload fidelity. Compare canonicalized
# per-row JSON fingerprints for every public/private table and core Auth pair.
# Hash files stay in runner-private scratch space and are deleted on exit;
# neither the private data nor the fingerprints are uploaded or printed.
cat > "$OUT/row-fingerprint-generator.sql" <<'SQL'
select format(
  'select %L, md5(coalesce(string_agg(md5(to_jsonb(t)::text), %L order by md5(to_jsonb(t)::text)), %L)) from %I.%I t;',
  schemaname || '.' || tablename, '', '', schemaname, tablename)
from (
 select schemaname,tablename from pg_tables where schemaname in ('public','private')
 union all
 select 'auth'::text, 'users'::text
 union all
 select 'auth'::text, 'identities'::text
) inventory
order by schemaname,tablename;
SQL
docker run --rm --user "$(id -u):$(id -g)" \
  --env SUPABASE_DB_URL --env PGSSLMODE=require \
  --volume "$OUT:/out" postgres:17-alpine sh -euc '
  psql --no-psqlrc --tuples-only --no-align --dbname="$SUPABASE_DB_URL" \
    --file=/out/row-fingerprint-generator.sql > /out/table-row-fingerprints.sql
  psql --no-psqlrc --tuples-only --no-align --dbname="$SUPABASE_DB_URL" \
    --file=/out/table-row-fingerprints.sql > /out/source-row-fingerprints.tsv
'
if [[ "$(wc -l < "$OUT/source-row-fingerprints.tsv")" -ne $((SOURCE_TABLE_COUNT+2)) ]]; then
  echo "::error::Expected every first-party and core Auth table in row fingerprint verification"; exit 1
fi
docker cp "$OUT/table-row-fingerprints.sql" "$CONTAINER:/tmp/table-row-fingerprints.sql" >/dev/null
docker exec -u root "$CONTAINER" chmod 644 /tmp/table-row-fingerprints.sql
docker exec -u postgres "$CONTAINER" psql -X -v ON_ERROR_STOP=1 -U postgres -d postgres \
  --tuples-only --no-align --file=/tmp/table-row-fingerprints.sql \
  > "$OUT/restored-row-fingerprints.tsv"
if ! cmp -s "$OUT/source-row-fingerprints.tsv" "$OUT/restored-row-fingerprints.tsv"; then
  echo "::error::Restored first-party/Auth row content fingerprints disagree with source"; exit 1
fi
echo "PASS: All first-party/Auth table row payload fingerprints match live source without exposing user data."
RESTORED_ARCHIVE_COUNT=$(docker exec -u postgres "$CONTAINER" psql -X -v ON_ERROR_STOP=1 \
  -U postgres -d postgres --tuples-only --no-align \
  --command="select count(*) from private.import_batches")
RESTORED_LEGACY_SHOTS=$(docker exec -u postgres "$CONTAINER" psql -X -v ON_ERROR_STOP=1 \
  -U postgres -d postgres --tuples-only --no-align \
  --command="select count(*) from public.shots where legacy_import")
if [[ "$RESTORED_ARCHIVE_COUNT" -gt 0 && "$RESTORED_LEGACY_SHOTS" -gt 0 ]]; then
  echo "PASS: Nonzero imported historical shots and private original-source archive restored."
fi

echo "PASS: All $RESTORED_TABLE_COUNT first-party application/private tables were restored with data."
echo "PASS: All first-party table row counts and core Auth counts agree with source."
echo "LIMIT: First-party application schema and core Auth data only; hosted Supabase services, provider-managed settings, and external secrets are not restored."
echo "INFO: No plaintext uploaded; disposable PostgreSQL and local dump deleted."
