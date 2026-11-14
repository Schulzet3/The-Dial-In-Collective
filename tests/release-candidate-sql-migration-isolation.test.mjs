import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const script=readFileSync(new URL('../scripts/audit/isolated-sql-regression.sh',import.meta.url),'utf8');
test('release SQL still applies every present migration and runs all base regressions',()=>{
 assert.match(script,/for migration in supabase\/migrations\/\*\.sql; do/);
 assert.match(script,/run_sql "\$migration"/);
 assert.match(script,/for regression in coffee_identity_matching[^\n]*import_credential_key_separators; do/);
 assert.match(script,/run_sql "supabase\/tests\/\$regression\.sql"/);
});
for(const [name,migration] of [
 ['recommendation_context_null_controls','20261114115000_dic_recommendation_context_null_control_guard.sql'],
 ['pending_coffee_null_guards','20261114135500_dic_promote_pending_coffee_null_flags.sql']
]){
 test('#509 '+name+' requires its exact included migration, otherwise records NOT_APPLICABLE',()=>{
  const escaped=migration.replace(/\./g,'\\.');
  assert.match(script,new RegExp('if \\[\\[ -f supabase/migrations/'+escaped+' \\]\\]; then'));
  assert.match(script,new RegExp('run_sql supabase/tests/'+name+'\\.sql'));
  assert.match(script,new RegExp('NOT_APPLICABLE: #509 '+name+'; migration excluded'));
  assert.equal(script.match(new RegExp('run_sql supabase/tests/'+name+'\\.sql','g')).length,1);
 });
}
