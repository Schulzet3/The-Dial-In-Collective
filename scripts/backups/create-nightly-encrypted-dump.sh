#!/usr/bin/env bash
# GitHub-hosted runner: create ciphertext-only backup for private Drive courier.
set -Eeuo pipefail
umask 077
: "${SUPABASE_DB_URL:=}"
: "${BACKUP_AGE_RECIPIENT:=}"
: "${SUPABASE_PROJECT_REF:=}"
if [[ -z "$SUPABASE_DB_URL" || -z "$BACKUP_AGE_RECIPIENT" || -z "$SUPABASE_PROJECT_REF" ]]; then
  echo "::error::Missing required backup configuration."
  exit 1
fi
case "$SUPABASE_DB_URL" in
  *"$SUPABASE_PROJECT_REF"*) ;;
  *) echo "::error::Database URL does not reference the approved Supabase project."; exit 1 ;;
esac
# Dedicated SSH Ed25519 public keys are supported by age too. MacOS can
# generate these locally using ssh-keygen without installing extra software.
# The corresponding SSH private key NEVER goes on the runner.
if ! [[ "$BACKUP_AGE_RECIPIENT" =~ ^age1[a-z0-9]{20,}$ || "$BACKUP_AGE_RECIPIENT" =~ ^ssh-ed25519[[:space:]][A-Za-z0-9+/]+={0,2}$ ]]; then
  echo "::error::Expected an age X25519 or SSH Ed25519 public recipient."
  exit 1
fi

OUT="$RUNNER_TEMP/dic-nightly-$GITHUB_RUN_ID"
mkdir -p "$OUT/plain" "$OUT/encrypted"
trap 'rm -rf "$OUT/plain" "$OUT/bundle.tar.gz"' EXIT

# PostgreSQL 17 matches the live project. Use caller's uid for readability.
# Require TLS in transit to the Supabase session pooler; never silently fall back to cleartext.
# Capture a conservative lower bound before pg_dump can open its snapshot.
# Completion alone cannot prove that writes made during export were included.
SNAPSHOT_STARTED_AT_UTC="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "DIC_BACKUP_SNAPSHOT_STARTED_AT_UTC=$SNAPSHOT_STARTED_AT_UTC"
docker run --rm --user "$(id -u):$(id -g)" --env SUPABASE_DB_URL --env PGSSLMODE=require \
  --volume "$OUT/plain:/out" postgres:17-alpine sh -euc '
    pg_dump --dbname="$SUPABASE_DB_URL" --format=custom \
      --no-owner --no-privileges --file=/out/database.dump
    pg_restore --list /out/database.dump > /out/toc.txt
    psql --no-psqlrc --dbname="$SUPABASE_DB_URL" --tuples-only --no-align \
      --command="select count(*) from storage.objects" > /out/storage-object-count.txt
    # Counts are observed immediately after the logical snapshot, and included
    # inside the ciphertext as a sanity inventory (not a substitute for restore).
    psql --no-psqlrc --dbname="$SUPABASE_DB_URL" --tuples-only --no-align       --field-separator="|"       --command="select (select count(*) from auth.users), (select count(*) from public.shots), (select count(*) from public.coffees where verification_state = chr(118)||chr(101)||chr(114)||chr(105)||chr(102)||chr(105)||chr(101)||chr(100)), (select count(*) from public.library_entries), (select count(*) from public.coffee_submissions where status = chr(97)||chr(112)||chr(112)||chr(114)||chr(111)||chr(118)||chr(101)||chr(100));" > /out/observed-counts.txt
  '

for table in "TABLE DATA auth users" "TABLE DATA public shots" \
  "TABLE DATA public library_entries" "TABLE DATA storage objects"; do
  if ! grep -Fq "$table" "$OUT/plain/toc.txt"; then
    echo "::error::Required database tables are missing from backup."
    exit 1
  fi
done
OBJECT_COUNT="$(tr -d '[:space:]' < "$OUT/plain/storage-object-count.txt")"
if ! [[ "$OBJECT_COUNT" =~ ^[0-9]+$ ]]; then
  echo "::error::Unable to verify Storage object inventory."
  exit 1
fi
if [[ "$OBJECT_COUNT" != 0 ]]; then
  echo "::error::Supabase Storage contains file objects; database-only recovery is incomplete."
  exit 1
fi

# The second checkout is pinned to the independently verified live application commit.
# Only tracked repository source is present; do not include .git, credentials, or exports.
SOURCE_DIR="$GITHUB_WORKSPACE/backup-app-source"
if [[ ! -f "$SOURCE_DIR/package.json" || ! -d "$SOURCE_DIR/supabase/migrations" || ! -f "$SOURCE_DIR/netlify.toml" ]]; then
  echo "::error::Application source checkout is missing or incomplete."
  exit 1
fi
SOURCE_COMMIT="$(git -C "$SOURCE_DIR" rev-parse HEAD)"
tar -czf "$OUT/plain/app-source.tar.gz" --exclude=.git --exclude=node_modules \
  --exclude=dist -C "$SOURCE_DIR" .
test -s "$OUT/plain/app-source.tar.gz"
SOURCE_SHA256="$(sha256sum "$OUT/plain/app-source.tar.gz" | awk '{print $1}')"

DUMP_SHA256="$(sha256sum "$OUT/plain/database.dump" | awk '{print $1}')"
COUNTS="$(tr -d '[:space:]' < "$OUT/plain/observed-counts.txt")"
if ! [[ "$COUNTS" =~ ^[0-9]+\|[0-9]+\|[0-9]+\|[0-9]+\|[0-9]+$ ]]; then
  echo "::error::Backup row-count inventory is invalid."
  exit 1
fi
IFS='|' read -r USERS SHOTS VERIFIED_COFFEES LIBRARY_ENTRIES APPROVED_SUBMISSIONS <<< "$COUNTS"
echo "Snapshot sanity inventory (observed after export): users=$USERS shots=$SHOTS verified_coffees=$VERIFIED_COFFEES library_entries=$LIBRARY_ENTRIES approved_submissions=$APPROVED_SUBMISSIONS"
cat > "$OUT/plain/manifest.json" <<EOF
{"format":"dic-age-postgres-v1","project_ref":"$SUPABASE_PROJECT_REF","snapshot_started_at_utc":"$SNAPSHOT_STARTED_AT_UTC","created_utc":"$(date -u +%Y-%m-%dT%H:%M:%SZ)","commit":"$GITHUB_SHA","postgres_client_major":17,"storage_object_count":0,"dump_sha256":"$DUMP_SHA256","app_source_commit":"$SOURCE_COMMIT","app_source_sha256":"$SOURCE_SHA256","observed_after_export":{"auth_users":$USERS,"shots":$SHOTS,"verified_coffees":$VERIFIED_COFFEES,"library_entries":$LIBRARY_ENTRIES,"approved_submissions":$APPROVED_SUBMISSIONS},"restore_notice":"Auth and application tables are backed up. Separate external configuration and isolated restore testing remain required."}
EOF

tar -czf "$OUT/bundle.tar.gz" -C "$OUT/plain" database.dump manifest.json toc.txt storage-object-count.txt observed-counts.txt app-source.tar.gz
# Verify the compressed archive is readable before destroying its plaintext
# and uploading only its age-encrypted counterpart.
tar -tzf "$OUT/bundle.tar.gz" > /dev/null
AGE_RECIPIENT_ARGS=(--recipient "$BACKUP_AGE_RECIPIENT")
if [[ -n "${BACKUP_AGE_SECOND_RECIPIENT:-}" ]]; then
  if ! [[ "$BACKUP_AGE_SECOND_RECIPIENT" =~ ^age1[a-z0-9]{20,}$ || "$BACKUP_AGE_SECOND_RECIPIENT" =~ ^ssh-ed25519[[:space:]][A-Za-z0-9+/]+={0,2}$ ]]; then
    echo "::error::Invalid automation-only public recovery recipient."
    exit 1
  fi
  AGE_RECIPIENT_ARGS+=(--recipient "$BACKUP_AGE_SECOND_RECIPIENT")
fi
age --encrypt "${AGE_RECIPIENT_ARGS[@]}" \
  --output "$OUT/encrypted/backup.age" "$OUT/bundle.tar.gz"
test -s "$OUT/encrypted/backup.age"
echo 'Encrypted archive created; no plaintext artifact will be uploaded.'

