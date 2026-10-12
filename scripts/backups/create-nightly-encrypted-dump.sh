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
docker run --rm --user "$(id -u):$(id -g)" --env SUPABASE_DB_URL \
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

DUMP_SHA256="$(sha256sum "$OUT/plain/database.dump" | awk '{print $1}')"
cat > "$OUT/plain/manifest.json" <<EOF
{"format":"dic-age-postgres-v1","project_ref":"$SUPABASE_PROJECT_REF","created_utc":"$(date -u +%Y-%m-%dT%H:%M:%SZ)","commit":"$GITHUB_SHA","postgres_client_major":17,"storage_object_count":0,"dump_sha256":"$DUMP_SHA256","restore_notice":"Auth and application tables are backed up. Separate external configuration and isolated restore testing remain required."}
EOF

tar -czf "$OUT/bundle.tar.gz" -C "$OUT/plain" database.dump manifest.json toc.txt storage-object-count.txt
age --encrypt --recipient "$BACKUP_AGE_RECIPIENT" \
  --output "$OUT/encrypted/backup.age" "$OUT/bundle.tar.gz"
test -s "$OUT/encrypted/backup.age"
echo 'Encrypted archive created; no plaintext artifact will be uploaded.'
