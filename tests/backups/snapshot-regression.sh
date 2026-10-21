#!/bin/sh
# Run only against the synthetic Unix-socket database created by the isolated
# CI runner (or a fresh local PostgreSQL 17 cluster). Never accept a hosted URL.
set -eu
umask 077
if [ -n "${SUPABASE_DB_URL:-}" ]; then
  echo 'FAIL: Snapshot regression refuses an existing Supabase connection.' >&2
  exit 1
fi
DIC_TEST_ROOT=${1:?Missing repository root}
DIC_TEST_SOCKET_DIR=${DIC_TEST_SOCKET_DIR:-/var/run/postgresql}
case "$DIC_TEST_SOCKET_DIR" in
  /*) ;;
  *) echo 'FAIL: A local PostgreSQL socket directory is required.' >&2; exit 1 ;;
esac
case "$DIC_TEST_SOCKET_DIR" in
  *[!a-zA-Z0-9_./-]*) echo 'FAIL: Invalid local socket path.' >&2; exit 1 ;;
esac
test -d "$DIC_TEST_SOCKET_DIR"
unset PGHOSTADDR PGSERVICE PGPASSFILE PGPASSWORD
export PGHOST="$DIC_TEST_SOCKET_DIR" PGUSER=postgres PGDATABASE=dic_snapshot_ci PGSSLMODE=disable
DIC_TEST_OUT=$(mktemp -d /tmp/dic-backup-snapshot.XXXXXX)
trap 'rm -rf "$DIC_TEST_OUT"' EXIT
psql -X -q -v ON_ERROR_STOP=1 --file="$DIC_TEST_ROOT/tests/backups/snapshot-fixture.sql"
SUPABASE_DB_URL="host=$DIC_TEST_SOCKET_DIR user=postgres dbname=dic_snapshot_ci"
export SUPABASE_DB_URL
DIC_TEST_REAL_PG_DUMP=$(command -v pg_dump)
export DIC_TEST_REAL_PG_DUMP
mkdir "$DIC_TEST_OUT/bin" "$DIC_TEST_OUT/good" "$DIC_TEST_OUT/unsynchronized" \
  "$DIC_TEST_OUT/dump-failure" "$DIC_TEST_OUT/query-failure"

# Intercept only pg_dump in this disposable test process. The production
# collector is unchanged: the second connection writes AFTER export and BEFORE
# pg_dump reads, which deterministically reproduced the old comparison race.
cat > "$DIC_TEST_OUT/bin/pg_dump" <<'SH'
#!/bin/sh
set -eu
case "${DIC_TEST_DUMP_MODE:?}" in
  fail) echo 'Synthetic dump failure.' >&2; exit 37 ;;
  concurrent|without-snapshot)
    psql -X -q -v ON_ERROR_STOP=1 --dbname="$SUPABASE_DB_URL" <<'SQL'
update public.coffees set fixture_label='synthetic-concurrent-write' where id=1;
insert into public.coffees
select max(id)+1, 'synthetic-new-row', 'verified' from public.coffees;
SQL
    ;;
  plain) ;;
  *) exit 38 ;;
esac
if [ "$DIC_TEST_DUMP_MODE" = without-snapshot ]; then
  # Mutation control: intentionally remove the production synchronization flag.
  # Preserve each original argument, including the space-bearing libpq URL.
  dic_arg_count=$#
  while [ "$dic_arg_count" -gt 0 ]; do
    dic_arg=$1
    shift
    dic_arg_count=$((dic_arg_count-1))
    case "$dic_arg" in --snapshot=*) ;; *) set -- "$@" "$dic_arg" ;; esac
  done
fi
exec "$DIC_TEST_REAL_PG_DUMP" "$@"
SH
chmod 700 "$DIC_TEST_OUT/bin/pg_dump"
export PATH="$DIC_TEST_OUT/bin:$PATH"

capture() {
  DIC_TEST_DUMP_MODE=$1 sh "$DIC_TEST_ROOT/scripts/backups/capture-recovery-snapshot.sh" "$2"
}
read_restored_inventory() {
  dic_capture=$1
  psql -X -qAt -v ON_ERROR_STOP=1 -d dic_snapshot_restore_ci \
    --file="$dic_capture/core-counts.sql" > "$dic_capture/restored-core-counts.txt"
  psql -X -qAt -v ON_ERROR_STOP=1 -d dic_snapshot_restore_ci \
    --file="$dic_capture/table-count-selects.sql" > "$dic_capture/restored-all-counts.tsv"
  psql -X -qAt -v ON_ERROR_STOP=1 -d dic_snapshot_restore_ci \
    --file="$dic_capture/app-schema-inventory.sql" > "$dic_capture/restored-app-metadata.txt"
  psql -X -qAt -v ON_ERROR_STOP=1 -d dic_snapshot_restore_ci \
    --file="$dic_capture/table-row-fingerprints.sql" > "$dic_capture/restored-row-fingerprints.tsv"
}
assert_inventory() {
  sh "$DIC_TEST_ROOT/scripts/backups/assert-recovery-inventory.sh" \
    "$1/$2" "$1/$3" "$4"
}
assert_no_exporter() {
  dic_exporter_count=$(psql -X -qAt -v ON_ERROR_STOP=1 -c \
    "select count(*) from pg_stat_activity where application_name='dic-recovery-snapshot' and pid<>pg_backend_pid()")
  test "$dic_exporter_count" = 0 || {
    echo 'FAIL: Snapshot exporter remained connected after capture.' >&2; exit 1;
  }
}

capture concurrent "$DIC_TEST_OUT/good"
assert_no_exporter
# Prove the intervening write committed. The archived snapshot must still
# contain the original value and one coffee, not the newer two-row state.
test "$(psql -X -qAt -v ON_ERROR_STOP=1 -c \
  "select count(*)=2 and bool_or(id=1 and fixture_label='synthetic-concurrent-write') from public.coffees")" = t
createdb dic_snapshot_restore_ci
pg_restore --exit-on-error --no-owner --no-privileges \
  -d dic_snapshot_restore_ci "$DIC_TEST_OUT/good/database.dump"
test "$(psql -X -qAt -v ON_ERROR_STOP=1 -d dic_snapshot_restore_ci -c \
  "select count(*)=1 and bool_and(fixture_label='synthetic-original') from public.coffees")" = t
read_restored_inventory "$DIC_TEST_OUT/good"
cmp -s "$DIC_TEST_OUT/good/expected-counts.txt" "$DIC_TEST_OUT/good/restored-core-counts.txt"
cmp -s "$DIC_TEST_OUT/good/live-app-metadata.txt" "$DIC_TEST_OUT/good/restored-app-metadata.txt"
assert_inventory "$DIC_TEST_OUT/good" expected-all-counts.tsv restored-all-counts.tsv row-counts
assert_inventory "$DIC_TEST_OUT/good" source-row-fingerprints.tsv restored-row-fingerprints.tsv row-fingerprints
echo 'PASS: Concurrent committed write preserves all snapshot counts, schema metadata and original row payloads.'

# A payload-only corruption leaves every row count unchanged. The same
# comparison helper used by the operational drill must nevertheless reject it.
psql -X -q -v ON_ERROR_STOP=1 -d dic_snapshot_restore_ci -c \
  "update public.coffees set fixture_label='synthetic-corruption' where id=1"
read_restored_inventory "$DIC_TEST_OUT/good"
assert_inventory "$DIC_TEST_OUT/good" expected-all-counts.tsv restored-all-counts.tsv row-counts
if assert_inventory "$DIC_TEST_OUT/good" source-row-fingerprints.tsv restored-row-fingerprints.tsv row-fingerprints \
  > "$DIC_TEST_OUT/mismatch.log" 2>&1; then
  echo 'FAIL: Same-count payload corruption was accepted.' >&2; exit 1
fi
echo 'PASS: Same-count payload corruption still fails the operational comparison.'

capture without-snapshot "$DIC_TEST_OUT/unsynchronized"
dropdb dic_snapshot_restore_ci
createdb dic_snapshot_restore_ci
pg_restore --exit-on-error --no-owner --no-privileges \
  -d dic_snapshot_restore_ci "$DIC_TEST_OUT/unsynchronized/database.dump"
read_restored_inventory "$DIC_TEST_OUT/unsynchronized"
if assert_inventory "$DIC_TEST_OUT/unsynchronized" expected-all-counts.tsv restored-all-counts.tsv row-counts \
  > "$DIC_TEST_OUT/unsynchronized.log" 2>&1; then
  echo 'FAIL: Test did not detect removal of the shared snapshot.' >&2; exit 1
fi
echo 'PASS: Removing --snapshot reproduces the concurrent-write mismatch and is rejected.'

if capture fail "$DIC_TEST_OUT/dump-failure" > "$DIC_TEST_OUT/dump-failure.log" 2>&1; then
  echo 'FAIL: pg_dump exit 37 was reported as a successful capture.' >&2; exit 1
fi
assert_no_exporter
echo 'PASS: pg_dump failure stops capture and closes its exporting transaction.'

psql -X -q -v ON_ERROR_STOP=1 -c 'alter table public.shots rename to synthetic_missing_shots'
if capture plain "$DIC_TEST_OUT/query-failure" > "$DIC_TEST_OUT/query-failure.log" 2>&1; then
  echo 'FAIL: A source inventory SQL failure was accepted.' >&2; exit 1
fi
assert_no_exporter
echo 'PASS: Inventory query failure stops capture and closes its exporting transaction.'

: > "$DIC_TEST_OUT/empty-expected"
: > "$DIC_TEST_OUT/empty-restored"
if sh "$DIC_TEST_ROOT/scripts/backups/assert-recovery-inventory.sh" \
  "$DIC_TEST_OUT/empty-expected" "$DIC_TEST_OUT/empty-restored" row-fingerprints \
  > "$DIC_TEST_OUT/empty.log" 2>&1; then
  echo 'FAIL: Two empty inventory files were accepted.' >&2; exit 1
fi
echo 'PASS: Empty inventory cannot become a matching recovery receipt.'
