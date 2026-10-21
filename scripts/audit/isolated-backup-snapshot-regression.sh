#!/usr/bin/env bash
# No secrets, provider connections, published ports, backup uploads or grants.
set -Eeuo pipefail
ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
CONTAINER="dic-backup-snapshot-${GITHUB_RUN_ID:-local}-$$"
cleanup() { docker rm -f "$CONTAINER" >/dev/null 2>&1 || true; }
trap cleanup EXIT
if [[ -n "${SUPABASE_DB_URL:-}" ]]; then
  echo '::error::Synthetic backup regression refuses a Supabase connection'; exit 1
fi
docker run -d --rm --name "$CONTAINER" --network none \
  --env POSTGRES_HOST_AUTH_METHOD=trust --env POSTGRES_DB=dic_snapshot_ci \
  postgres:17.11-alpine >/dev/null
ready=0
for i in $(seq 1 50); do
  if docker exec -u postgres "$CONTAINER" pg_isready -h 127.0.0.1 -U postgres -q; then ready=1; break; fi
  sleep 1
done
[[ "$ready" == 1 ]] || { echo '::error::Isolated snapshot test database did not become ready'; exit 1; }
docker exec -u root "$CONTAINER" mkdir -p /tmp/dic-snapshot-test/scripts /tmp/dic-snapshot-test/tests
docker cp "$ROOT/scripts/backups" "$CONTAINER:/tmp/dic-snapshot-test/scripts/backups" >/dev/null
docker cp "$ROOT/tests/backups" "$CONTAINER:/tmp/dic-snapshot-test/tests/backups" >/dev/null
# Only checked-in synthetic SQL and scripts enter this container. The complete
# PostgreSQL instance and all transient dumps disappear under the EXIT trap.
docker exec -u root "$CONTAINER" chmod -R a+rX /tmp/dic-snapshot-test
docker exec -u postgres "$CONTAINER" \
  sh /tmp/dic-snapshot-test/tests/backups/snapshot-regression.sh /tmp/dic-snapshot-test
