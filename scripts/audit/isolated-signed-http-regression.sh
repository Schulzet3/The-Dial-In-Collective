#!/usr/bin/env bash
set -euo pipefail
# No hosted credentials, no public ingress, no account/shot/provider modifications.
# Isolated CI-only network; internal-only bridge prevented host loopback port forwarding.
# This runs only on disposable GitHub Actions runners; no deployment.
test "$GITHUB_ACTIONS" = true
NET="dic-ci-http-$GITHUB_RUN_ID-$GITHUB_RUN_ATTEMPT"
PG="dic-ci-pg-$GITHUB_RUN_ID-$GITHUB_RUN_ATTEMPT"
API="dic-ci-api-$GITHUB_RUN_ID-$GITHUB_RUN_ATTEMPT"
cleanup() {
 docker rm -f "$API" "$PG" >/dev/null 2>&1 || true
 docker network rm "$NET" >/dev/null 2>&1 || true
}
trap cleanup EXIT
# The disposable bridge permits runner-loopback HTTP to PostgREST while
# PostgreSQL has NO host-published port. No credential/project URL is present.
docker network create "$NET" >/dev/null
docker run -d --rm --name "$PG" --network "$NET" \
 -e POSTGRES_DB=dic_ci -e POSTGRES_HOST_AUTH_METHOD=trust postgres:17.11 >/dev/null
ready=false
for attempt in {1..60};do
 if docker exec "$PG" pg_isready -h 127.0.0.1 -U postgres -d dic_ci >/dev/null 2>&1;then ready=true;break;fi
 sleep 1
done
test "$ready" = true
run_sql() { docker exec -i "$PG" psql -X -v ON_ERROR_STOP=1 -U postgres -d dic_ci < "$1" >/dev/null; }
run_sql tests/sql/bootstrap.sql
for migration in supabase/migrations/*.sql; do
 echo "Applying isolated migration $(basename "$migration")"
 run_sql "$migration"
done
run_sql tests/sql/owner-fixture.sql
run_sql tests/sql/signed-http-fixture.sql
# Entirely generated per-run key; no production Auth keys/secrets anywhere in CI.
DIC_CI_JWT_SECRET="$(openssl rand -hex 32)"
docker run -d --rm --name "$API" --network "$NET" \
 -p 127.0.0.1:8762:3000 \
 -e PGRST_DB_URI="postgres://authenticator@$PG:5432/dic_ci" \
 -e PGRST_DB_SCHEMAS=public -e PGRST_DB_ANON_ROLE=anon \
 -e PGRST_JWT_SECRET="$DIC_CI_JWT_SECRET" \
 -e PGRST_DB_CHANNEL_ENABLED=false \
 postgrest/postgrest@sha256:5f4ce744539bbba786b4e24dbbd95bdb2a956dcf568c5374995a0ff4a68f5bd2 >/dev/null
ready=false
for attempt in {1..60};do
 if curl --silent --fail --output /dev/null "http://127.0.0.1:8762/";then ready=true;break;fi
 sleep 1
done
if [ "$ready" != true ];then
 echo 'Isolated HTTP server failed health check; diagnostic tail:'
 docker logs --tail 15 "$API" 2>&1 | sed -E 's/[[:alnum:]_+\/=-]{48,}/[REDACTED]/g'
 exit 1
fi
export DIC_CI_HTTP_URL=http://127.0.0.1:8762
export DIC_CI_SQL_CONTAINER="$PG"
export DIC_CI_JWT_SECRET
node tests/qa/signed-http-acceptance.mjs
echo "PASS: isolated signed bearer HTTP authorization and held lifecycle; Docker network/containers destroyed on exit."