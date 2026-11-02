#!/usr/bin/env bash
# Isolated, archived-ciphertext recovery test. NEVER connects to production.
set -Eeuo pipefail
umask 077

if [[ $# != 1 || ! -s "$1" ]]; then
  echo '::error::Expected one existing nonempty backup.age file'; exit 2
fi
: "${DIC_ARCHIVE_AGE_IDENTITY:=}"
: "${DIC_ARCHIVE_PROJECT_REF:=azviqqejypsefzilgonr}"
if [[ -z "$DIC_ARCHIVE_AGE_IDENTITY" ]]; then
  echo '::error::BLOCKED: dedicated automation-only age identity is not provisioned'; exit 2
fi
for command in age docker python3; do
  if ! command -v "$command" >/dev/null; then
    echo "::error::Missing runtime tool: $command"; exit 2
  fi
done

root=$(mktemp -d "${RUNNER_TEMP:-/tmp}/dic-archived-restore.XXXXXXXX")
container="dic-archive-restore-${GITHUB_RUN_ID:-local}-$$"
cleanup() {
  docker rm -f "$container" >/dev/null 2>&1 || true
  rm -rf -- "$root"
}
trap cleanup EXIT
printf '%s\n' "$DIC_ARCHIVE_AGE_IDENTITY" > "$root/identity"
chmod 600 "$root/identity"
python3 - "$1" <<'PY'
import pathlib,sys
p=pathlib.Path(sys.argv[1])
if p.stat().st_size < 128 or p.stat().st_size > 1024*1024*1024:
    raise SystemExit('Invalid encrypted archive size')
with p.open('rb') as f:
    if f.readline() != b'age-encryption.org/v1\n':
        raise SystemExit('Invalid age ciphertext header')
PY
# Plaintext only in runner-local, private temporary storage.
age --decrypt -i "$root/identity" -o "$root/bundle.tgz" "$1" >/dev/null
mkdir -m 700 "$root/plain"
python3 - "$root/bundle.tgz" "$root/plain" "$DIC_ARCHIVE_PROJECT_REF" <<'PY'
import hashlib,json,pathlib,re,shutil,sys,tarfile
bundle,destination,project=sys.argv[1:]
needed={'database.dump','manifest.json','toc.txt','storage-object-count.txt',
        'observed-counts.txt','app-source.tar.gz'}
with tarfile.open(bundle,'r:gz') as archive:
    entries=archive.getmembers()
    if {m.name for m in entries}!=needed or any(not m.isfile() for m in entries):
        raise SystemExit('Unexpected members, links, or paths in recovery bundle')
    if any(m.size<=0 or m.size>1024*1024*1024 for m in entries):
        raise SystemExit('Unexpected recovery member size')
    for member in entries:
        with archive.extractfile(member) as src, open(pathlib.Path(destination)/member.name,'wb') as out:
            shutil.copyfileobj(src,out)
manifest=json.loads((pathlib.Path(destination)/'manifest.json').read_text())
if manifest.get('format')!='dic-age-postgres-v1' or manifest.get('project_ref')!=project:
    raise SystemExit('Unexpected project or archive manifest format')
for filename,field in [('database.dump','dump_sha256'),('app-source.tar.gz','app_source_sha256')]:
    expected=manifest.get(field,'')
    if not isinstance(expected,str) or not re.fullmatch(r'[0-9a-f]{64}',expected):
        raise SystemExit('Invalid manifest checksum')
    actual=hashlib.sha256((pathlib.Path(destination)/filename).read_bytes()).hexdigest()
    if actual!=expected:
        raise SystemExit('Archived recovery member checksum mismatch')
if manifest.get('storage_object_count')!=0:
    raise SystemExit('Archive includes Storage objects not restorable by database-only drill')
if not re.fullmatch(r'[0-9]{1,9}',(pathlib.Path(destination)/'storage-object-count.txt').read_text().strip()):
    raise SystemExit('Invalid Storage object inventory')
if int((pathlib.Path(destination)/'storage-object-count.txt').read_text().strip())!=0:
    raise SystemExit('Storage objects present: database-only recovery is incomplete')
print('PASS: Decrypted saved archive; correct project, manifest, payload hashes, and private bundle layout.')
PY

# Target has NO network; the source database URL is never provided to it.
docker run --rm -d --name "$container" --network none \
  --env POSTGRES_HOST_AUTH_METHOD=trust postgres:17-alpine >/dev/null
ready=0
for _ in $(seq 1 50); do
  if docker exec -u postgres "$container" pg_isready -h 127.0.0.1 -U postgres -q; then
    ready=1; break
  fi
  sleep 1
done
if [[ "$ready" != 1 ]]; then
  echo '::error::Isolated PostgreSQL never became ready'; exit 1
fi
docker cp "$root/plain/database.dump" "$container:/tmp/database.dump" >/dev/null
docker exec -u root "$container" chmod 644 /tmp/database.dump
docker exec -u postgres "$container" pg_restore --list /tmp/database.dump > "$root/contents.toc"
awk '/^[0-9]+;/ {
  if ($0 ~ / (TABLE|TABLE DATA) auth (users|identities) / ||
      $0 ~ / (TABLE|TABLE DATA) (public|private) [A-Za-z_0-9]+ /) print
}' "$root/contents.toc" > "$root/tables.toc"
count=$(grep -Ec ' TABLE DATA (public|private) [A-Za-z_0-9]+ ' "$root/tables.toc" || true)
if (( count < 30 )); then
  echo '::error::Saved database contains too few first-party tables'; exit 1
fi
for target in 'auth users' 'auth identities' 'public shots' 'public coffees' 'public library_entries'; do
  if ! grep -Fq " TABLE DATA $target " "$root/tables.toc"; then
    echo "::error::Required saved table missing: $target"; exit 1
  fi
done
docker exec -u postgres "$container" psql -X -v ON_ERROR_STOP=1 -U postgres -d postgres \
  -c 'CREATE SCHEMA auth; CREATE SCHEMA private; CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT NULL::uuid $$;' >/dev/null
docker cp "$root/tables.toc" "$container:/tmp/tables.toc" >/dev/null
docker exec -u root "$container" chmod 644 /tmp/tables.toc
docker exec -u postgres "$container" pg_restore --exit-on-error --no-owner --no-privileges \
  -L /tmp/tables.toc -U postgres -d postgres /tmp/database.dump >/dev/null
# Restore core managed Auth keys before app-owned foreign keys.
awk '/^[0-9]+;/ && / (CONSTRAINT|INDEX) auth (users|identities) / {print}' \
  "$root/contents.toc" > "$root/auth-keys.toc"
if [[ ! -s "$root/auth-keys.toc" ]]; then
  echo '::error::Archived Auth primary-key metadata missing'; exit 1
fi
docker cp "$root/auth-keys.toc" "$container:/tmp/auth-keys.toc" >/dev/null
docker exec -u root "$container" chmod 644 /tmp/auth-keys.toc
docker exec -u postgres "$container" pg_restore --exit-on-error --no-owner --no-privileges \
  -L /tmp/auth-keys.toc -U postgres -d postgres /tmp/database.dump >/dev/null
# Offline inert role stubs support first-party policies, never start Supabase services.
docker exec -u postgres "$container" psql -X -v ON_ERROR_STOP=1 -U postgres -d postgres \
  -c 'CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN;' >/dev/null
awk '/^[0-9]+;/ && / (FUNCTION|PROCEDURE|AGGREGATE|SEQUENCE|SEQUENCE OWNED BY|DEFAULT|CONSTRAINT|FK CONSTRAINT|INDEX|TRIGGER|ROW SECURITY|POLICY|VIEW|MATERIALIZED VIEW|TYPE|DOMAIN) (public|private) / {print}
/^[0-9]+;/ && / TRIGGER auth users dic_auth_user_created / {print}' \
  "$root/contents.toc" > "$root/metadata.toc"
if [[ ! -s "$root/metadata.toc" ]] ||
   ! grep -Fq ' TRIGGER auth users dic_auth_user_created ' "$root/metadata.toc"; then
  echo '::error::First-party RLS/metadata or provisioning trigger missing'; exit 1
fi
docker cp "$root/metadata.toc" "$container:/tmp/metadata.toc" >/dev/null
docker exec -u root "$container" chmod 644 /tmp/metadata.toc
docker exec -u postgres "$container" pg_restore --exit-on-error --no-owner --no-privileges \
  -L /tmp/metadata.toc -U postgres -d postgres /tmp/database.dump >/dev/null
# Validate restored real rows without exposing their contents or identifiers.
docker exec -u postgres "$container" psql -X -v ON_ERROR_STOP=1 -U postgres -d postgres \
  --tuples-only --no-align --command="select (select count(*) from auth.users),
    (select count(*) from auth.identities),
    (select count(*) from public.shots),
    (select count(*) from public.coffees),
    (select count(*) from public.library_entries)" > "$root/actual-counts"
if ! grep -Eq '^[[:space:]]*[0-9]+\|[0-9]+\|[0-9]+\|[0-9]+\|[0-9]+[[:space:]]*$' "$root/actual-counts"; then
  echo '::error::Restored counts were not numeric'; exit 1
fi
restored=$(docker exec -u postgres "$container" psql -X -v ON_ERROR_STOP=1 -U postgres -d postgres \
  --tuples-only --no-align --command="select count(*) from information_schema.tables where table_schema in ('public','private') and table_type='BASE TABLE'")
restored=$(printf '%s' "$restored" | tr -d '[:space:]')
if [[ "$restored" != "$count" ]]; then
  echo '::error::Not all first-party tables restored'; exit 1
fi
printf 'PASS: Offline restore of %s first-party tables, Auth identities, and first-party metadata.\n' "$restored"
echo 'LIMIT: Hosted Supabase services, external credentials and Storage file bytes not restored.'
echo 'PASS: Temporary plaintext and disconnected PostgreSQL removed by exit trap.'
