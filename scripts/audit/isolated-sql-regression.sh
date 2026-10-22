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
  # Historical suites run at the schema boundary they were written to protect.
  # Later migrations intentionally replace some of those permissions/gates.
  case "$migration" in
    *20261012015655_dic_internal_function_access.sql)
      run_sql supabase/tests/security_foundation.sql ;;
    *20261012183845_dic_import_qualified_validation.sql)
      run_sql supabase/tests/native_import.sql ;;
    *20261014152014_dic_owner_only_import_exception.sql)
      run_sql supabase/tests/owner_only_import_exception.sql ;;
    *20261014200634_dic_setup_rename_feed_memory.sql)
      run_sql supabase/tests/setup_rename_feed_memory.sql ;;
  esac
done
# Formal CLI-generated release migration is applied ONCE by the loop above.
# No second draft application: privacy and identity regressions use final schema.
run_sql tests/sql/owner-fixture.sql
for regression in coffee_identity_matching coffee_automated_approval admin_read_only_dashboard admin_coffee_review admin_content_review admin_shot_coffee_group_identity coffee_duplicate_first_auto_approval admin_invitation_controls url_preview_release universal_url_preview seven_roast_levels community_quality_integrity pre_release_cross_account source_worker_auth_and_admission first_style_prompt fast_flow_hybrid_style preview_two_phase_cache; do
  echo "Running $regression"
  run_sql "supabase/tests/$regression.sql"
done
echo 'PASS: all checked-in migrations and SQL suites, including staged import/setup, cross-account and source-worker authorization and first-style owner isolation regressions; no hosted connection.'
