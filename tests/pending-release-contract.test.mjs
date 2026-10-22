import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const file=(path)=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const worker=file('supabase/migrations/20261021221455_dic_source_worker_auth_and_admission.sql');
const admin=file('supabase/migrations/20261021224447_dic_admin_content_review.sql');
const edge=file('supabase/functions/dic-verify-coffee/index.ts');
const ledger=JSON.parse(file('docs/DECISION_LEDGER.json'));
const coverage=JSON.parse(file('docs/APPROVAL_COVERAGE_MATRIX.json'));

test('pending worker migration retains service-only RPC access, admission and revision checks',()=>{
 for(const name of ['dic_source_check_target','dic_source_claim']){
  assert.match(worker,new RegExp('revoke all on function public\\.'+name+'\\(uuid\\) from public,anon,authenticated;', 'i'));
  assert.match(worker,new RegExp('grant execute on function public\\.'+name+'\\(uuid\\) to service_role;', 'i'));
 }
 assert.match(worker,/grant execute on function public\.dic_trusted_source_verify\(uuid,jsonb\) to service_role;/i);
 assert.match(worker,/submission_revision/);
 assert.match(worker,/from private\.beta_members where owner_id=.*enabled for share/);
});

test('new admin-only controls retain private audit storage and guarded record access',()=>{
 assert.match(admin,/create table private\.admin_content_edits\(/i);
 assert.match(admin,/alter table private\.admin_content_edits enable row level security;/i);
 assert.match(admin,/create policy no_direct_user_content_edits/i);
 assert.match(admin,/if auth\.uid\(\) is null or not private\.is_admin\(\) then/i);
 assert.match(admin,/create function public\.dic_admin_edit_shot\(/i);
 assert.match(admin,/create function public\.dic_admin_edit_coffee\(/i);
 assert.doesNotMatch(admin,/grant all on private\.admin_content_edits to authenticated;/i);
});

test('new verification worker requires signed-in admitted owner before privileged source operations',()=>{
 assert.match(edge,/global:\{headers:\{Authorization:'Bearer '\+token\}\}/);
 assert.match(edge,/userClient\.auth\.getUser\(token\)/);
 assert.match(edge,/status\?\.admitted!==true/);
 assert.match(edge,/row\.owner_id!==userResult\.user\.id/);
 assert.match(edge,/privileged\.rpc\('dic_source_check_target'/);
 assert.match(edge,/privileged\.rpc\('dic_trusted_source_verify'/);
 const userPosition=edge.indexOf('userClient.auth.getUser(token)');
 const privilegedPosition=edge.indexOf("const privileged=createClient(base,secret");
 assert.ok(userPosition>=0&&privilegedPosition>userPosition);
});

test('owner-approved universal deployment policy is classified by both canonical ledger and coverage',()=>{
 const key='current_owner_universal_deployment_consent_20261021';
 assert.equal(ledger[key]?.decision_id,'OPS-UNIVERSAL-DEPLOYMENT-CONSENT-20261021');
 assert.ok(coverage.owner_decision_key_inventory.includes(key));
 assert.equal(ledger[key]?.current_release_scope?.named_sql_order?.length,2);
 assert.deepEqual(ledger[key]?.current_release_scope?.edge_functions,['dic-verify-coffee']);
});
