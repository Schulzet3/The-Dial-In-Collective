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
for regression in coffee_identity_matching coffee_automated_approval admin_read_only_dashboard admin_coffee_review admin_content_review admin_shot_coffee_group_identity coffee_duplicate_first_auto_approval admin_invitation_controls url_preview_release universal_url_preview seven_roast_levels community_quality_integrity pre_release_cross_account source_worker_auth_and_admission first_style_prompt fast_flow_hybrid_style admin_server_search community_server_search preview_two_phase_cache ready_queue_release admin_safe_delete admin_member_deletion recipe_family_lifecycle security_surface_inventory retired_experiments retired_bag_history decaffeination_method import_credential_key_separators; do
  echo "Running $regression"
  run_sql "supabase/tests/$regression.sql"
done
# These #509 regressions require their exact source migration. Release-candidates
# omit unfinished SQL migrations; those specific tests are NOT_APPLICABLE there.
# The normal development branch still runs both and fails closed on bad SQL.
if [[ -f supabase/migrations/20261114115000_dic_recommendation_context_null_control_guard.sql ]]; then
  echo "Running recommendation_context_null_controls"
  run_sql supabase/tests/recommendation_context_null_controls.sql
else
  echo "NOT_APPLICABLE: #509 recommendation_context_null_controls; migration excluded from tested source"
fi
if [[ -f supabase/migrations/20261114135500_dic_promote_pending_coffee_null_flags.sql ]]; then
  echo "Running pending_coffee_null_guards"
  run_sql supabase/tests/pending_coffee_null_guards.sql
else
  echo "NOT_APPLICABLE: #509 pending_coffee_null_guards; migration excluded from tested source"
fi
if [[ -f supabase/migrations/20261114195000_dic_member_approval_finish_null_receipts.sql ]]; then
  echo "Running member_approval_finish_null_receipts"
  run_sql supabase/tests/member_approval_finish_null_receipts.sql
else
  echo "NOT_APPLICABLE: #509 member_approval_finish_null_receipts; migration excluded from tested source"
fi
if [[ -f supabase/migrations/20261116151600_dic_pending_canonical_name_response.sql ]]; then
  echo "Running pending_canonical_name_response"
  run_sql supabase/tests/pending_canonical_name_response.sql
else
  echo "NOT_APPLICABLE: #509 pending_canonical_name_response; migration excluded from source"
fi
if [[ -f supabase/migrations/20261116210000_dic_import_additional_credential_keys.sql ]]; then
  echo "Running import_additional_credential_keys"
  run_sql supabase/tests/import_additional_credential_keys.sql
else
  echo "NOT_APPLICABLE: #509 import_additional_credential_keys; migration excluded from source"
fi
if [[ -f supabase/migrations/20261118113500_dic_confirm_coffee_null_name_guard.sql ]]; then
  echo "Running coffee_confirm_null_name_guard"
  run_sql supabase/tests/coffee_confirm_null_name_guard.sql
else
  echo "NOT_APPLICABLE: #509 coffee_confirm_null_name_guard; migration excluded from tested source"
fi
if [[ -f supabase/migrations/20261118114600_dic_first_entry_no_self_alias.sql ]]; then
  echo "Running coffee_first_entry_no_self_alias"
  run_sql supabase/tests/coffee_first_entry_no_self_alias.sql
else
  echo "NOT_APPLICABLE: #509 coffee_first_entry_no_self_alias; migration excluded from tested source"
fi
echo 'PASS: all checked-in migrations and SQL suites, including staged import/setup, cross-account and source-worker authorization and first-style owner isolation regressions; no hosted connection.'
