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
awk '
/^[0-9]+;/ {
  if ($0 ~ / (TABLE|TABLE DATA) auth (users|identities) / ||
      $0 ~ / (TABLE|TABLE DATA) private (beta_members|import_control) / ||
      $0 ~ / (TABLE|TABLE DATA) public (account_preferences|coffees|setups|library_entries|shots) /)
    print $0
}' "$OUT/contents.toc" > "$OUT/recovery.toc"
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
ready=0
for i in $(seq 1 35); do
  if docker exec -u postgres "$CONTAINER" pg_isready -U postgres -q; then ready=1; break; fi
  sleep 1
done
[[ "$ready" == 1 ]] || { echo "::error::Isolated Postgres failed to start"; exit 1; }
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
echo "PASS: Isolated PostgreSQL 17 restored nine Auth/application tables and their data."
echo "PASS: Recovered row counts match source snapshot."
echo "LIMIT: Core-data test only, not full managed Supabase configuration recovery."
echo "INFO: No plaintext uploaded; disposable PostgreSQL and local dump deleted."
