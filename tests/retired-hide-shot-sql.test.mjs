import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('../supabase/migrations/20261022041530_dic_retire_hide_shot_action.sql',import.meta.url),'utf8');
test('retired hide action is rejected before existing owner and receipt routing',()=>{
 assert.match(source,/create or replace function public\.dic_apply_client_change/);
 assert.match(source,/if action='hide_shot' then/);
 assert.match(source,/errcode='22023'/);
 assert.ok(source.indexOf("if action='hide_shot' then")<source.indexOf('if expected_owner is null'));
 assert.match(source,/private\.mutate_workspace\(mutation_id,action,payload\)/);
 assert.match(source,/private\.rename_setup\(mutation_id,payload\)/);
 assert.match(source,/private\.dic_submit_coffee_auto\(mutation_id,payload\)/);
 assert.match(source,/private\.dic_confirm_coffee_existing\(mutation_id,payload\)/);
 assert.doesNotMatch(source,/update public\.shots|delete from public\.shots|drop column|truncate/i);
});
