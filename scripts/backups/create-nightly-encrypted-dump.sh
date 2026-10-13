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
docker run --rm --user "$(id -u):$(id -g)" --env SUPABASE_DB_URL --env PGSSLMODE=require \
  --volume "$OUT/plain:/out" postgres:17-alpine sh -euc '
    pg_dump --dbname="$SUPABASE_DB_URL" --format=custom \
      --no-owner --no-privileges --file=/out/database.dump
    pg_restore --list /out/database.dump > /out/toc.txt
    psql --no-psqlrc --dbname="$SUPABASE_DB_URL" --tuples-only --no-align \
      --command="select count(*) from storage.objects" > /out/storage-object-count.txt
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

# The second checkout is the current reviewed application development source.
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
cat > "$OUT/plain/manifest.json" <<EOF
{"format":"dic-age-postgres-v1","project_ref":"$SUPABASE_PROJECT_REF","created_utc":"$(date -u +%Y-%m-%dT%H:%M:%SZ)","commit":"$GITHUB_SHA","postgres_client_major":17,"storage_object_count":0,"dump_sha256":"$DUMP_SHA256","app_source_commit":"$SOURCE_COMMIT","app_source_sha256":"$SOURCE_SHA256","restore_notice":"Auth and application tables are backed up. Separate external configuration and isolated restore testing remain required."}
EOF

tar -czf "$OUT/bundle.tar.gz" -C "$OUT/plain" database.dump manifest.json toc.txt storage-object-count.txt app-source.tar.gz
age --encrypt --recipient "$BACKUP_AGE_RECIPIENT" \
  --output "$OUT/encrypted/backup.age" "$OUT/bundle.tar.gz"
test -s "$OUT/encrypted/backup.age"
echo 'Encrypted archive created; no plaintext artifact will be uploaded.'
