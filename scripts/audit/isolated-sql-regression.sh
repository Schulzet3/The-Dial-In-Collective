#!/usr/bin/env bash
set -euo pipefail
# No Supabase credentials, production connections, ports, or production data.
DIC_SQL_CONTAINER="dic-sql-${GITHUB_RUN_ID:-local}-${GITHUB_RUN_ATTEMPT:-1}"
trap 'docker rm -f "$DIC_SQL_CONTAINER" >/dev/null 2>&1 || true' EXIT
docker run -d --rm --network none --name "$DIC_SQL_CONTAINER" \
  -e POSTGRES_DB=dic_ci -e POSTGRES_HOST_AUTH_METHOD=trust postgres:17.11 >/dev/null
ready=false
for attempt in {1..60}; do
  # Initialization uses a temporary socket-only server. Wait for final TCP readiness.
  if docker exec "$DIC_SQL_CONTAINER" pg_isready -h 127.0.0.1 -U postgres -d dic_ci >/dev/null 2>&1; then ready=true; break; fi
  sleep 1
done
test "$ready" = true
run_sql() { docker exec -i "$DIC_SQL_CONTAINER" psql -X -v ON_ERROR_STOP=1 -U postgres -d dic_ci < "$1"; }
run_sql tests/sql/bootstrap.sql
for migration in supabase/migrations/*.sql; do
  echo "Applying $migration to isolated PostgreSQL"
  run_sql "$migration"
  # The foundation suite tests original direct-column grants, intentionally
  # replaced by revision-checked APIs in subsequent migrations.
  if [[ "$migration" == *20261012015655_dic_internal_function_access.sql ]]; then
    run_sql supabase/tests/security_foundation.sql
  fi
done
# Formal CLI-generated release migration is applied ONCE by the loop above.
# No second draft application: privacy and identity regressions use final schema.
run_sql tests/sql/owner-fixture.sql
for regression in coffee_identity_matching coffee_automated_approval admin_read_only_dashboard admin_coffee_review admin_invitation_controls url_preview_release universal_url_preview seven_roast_levels community_quality_integrity; do
  echo "Running $regression"
  run_sql "supabase/tests/$regression.sql"
done
echo 'PASS: all checked-in migrations plus SQL security, identity, approval, admin, preview and multi-account Community quality regressions; no hosted connection.'
