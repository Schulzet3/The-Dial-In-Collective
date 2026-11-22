import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {chmodSync,mkdirSync,mkdtempSync,readFileSync,readdirSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {delimiter,join} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('../',import.meta.url));
const files=dir=>readdirSync(join(root,dir)).filter(name=>name.endsWith('.sql')).sort().map(name=>dir+'/'+name);
const digest=path=>createHash('sha256').update(readFileSync(join(root,path))).digest('hex');

test('actual SQL runner dispatches every applicable suite once at its required schema boundary',()=>{
 const temp=mkdtempSync(join(tmpdir(),'dic-sql-dispatch-'));
 try{
  const bin=join(temp,'bin'),trace=join(temp,'trace');
  mkdirSync(bin);
  // This command records SQL bytes without a database, network or credentials.
  // Actual SQL behavior is tested separately in the disconnected CI container.
  writeFileSync(join(bin,'docker'),`#!/bin/sh
set -eu
case "$1" in
 run) printf 'fake-isolated-container\\n'; exit 0 ;;
 rm) exit 0 ;;
 exec)
  for arg in "$@"; do
   case "$arg" in
    pg_isready) exit 0 ;;
    psql) sha256sum >> "$DIC_SQL_DISPATCH_TRACE"; exit 0 ;;
   esac
  done ;;
esac
exit 99
`);
  chmodSync(join(bin,'docker'),0o700);
  const output=execFileSync('bash',['scripts/audit/isolated-sql-regression.sh'],{
   cwd:root,encoding:'utf8',timeout:20_000,
   env:{PATH:bin+delimiter+(process.env.PATH||''),
    GITHUB_RUN_ID:'dispatch-test',GITHUB_RUN_ATTEMPT:'1',DIC_SQL_DISPATCH_TRACE:trace}
  });
  const migrations=files('supabase/migrations'),allSuites=files('supabase/tests');
  // SQL regressions are applicable only if the exact paired migration was
  // staged. A NOT_APPLICABLE record is NOT PASS and must be explicit.
  const migrationBoundSuites={
   'supabase/tests/recommendation_context_null_controls.sql':[
    '20261114115000_dic_recommendation_context_null_control_guard.sql','recommendation_context_null_controls'],
   'supabase/tests/pending_coffee_null_guards.sql':[
    '20261114135500_dic_promote_pending_coffee_null_flags.sql','pending_coffee_null_guards'],
   'supabase/tests/member_approval_finish_null_receipts.sql':[
    '20261114195000_dic_member_approval_finish_null_receipts.sql','member_approval_finish_null_receipts'],
   'supabase/tests/pending_canonical_name_response.sql':[
    '20261116151600_dic_pending_canonical_name_response.sql','pending_canonical_name_response'],
   'supabase/tests/import_additional_credential_keys.sql':[
    '20261116210000_dic_import_additional_credential_keys.sql','import_additional_credential_keys'],
   'supabase/tests/coffee_confirm_null_name_guard.sql':[
    '20261118113500_dic_confirm_coffee_null_name_guard.sql','coffee_confirm_null_name_guard'],
   'supabase/tests/coffee_first_entry_no_self_alias.sql':[
    '20261118114600_dic_first_entry_no_self_alias.sql','coffee_first_entry_no_self_alias'],
   'supabase/tests/coffee_historical_alias_suggestion_confirm.sql':[
    '20261118140000_dic_coffee_alias_suggestion_confirm.sql','historical alias'],
   'supabase/tests/legacy_private_hide_shot_retirement.sql':[
    '20261118164500_dic_remove_legacy_private_hide_shot_handler.sql','legacy internal Hide Shot retirement'],
   'supabase/tests/recommendation_unique_controls.sql':[
    '20261118180000_dic_recommendation_unique_controls.sql','recommendation unique-controls'],
   'supabase/tests/community_outlier_null_revision.sql':[
    '20261118181500_dic_community_outlier_null_revision_guard.sql','outlier NULL revision'],
   'supabase/tests/admin_edit_normalized_identity_guard.sql':[
    '20261118214500_dic_admin_edit_normalized_identity_guard.sql','admin normalized identity guard'],
   'supabase/tests/admin_account_delete_completed_receipt.sql':[
    '20261119175000_dic_admin_delete_completed_retry_count.sql','completed account deletion count']
  };
  const applicable=path=>!Object.hasOwn(migrationBoundSuites,path)||
    migrations.includes('supabase/migrations/'+migrationBoundSuites[path][0]);
  // R360 streams the literal migration between two rollback-only fixture
  // halves as ONE psql transaction. These halves must not be executed alone.
  const reconcileMigration='supabase/migrations/20261119120000_dic_reconcile_stale_personal_family_stats.sql';
  const reconcileParts=[
   'supabase/tests/family_statistics_historical_reconcile_pre.sql',
   reconcileMigration,
   'supabase/tests/family_statistics_historical_reconcile_post.sql'
  ];
  const stagedReconcile=migrations.includes(reconcileMigration);
  const completeMigration='supabase/migrations/20261119122000_dic_reconcile_all_personal_family_derived_stats.sql';
  const completeParts=[reconcileParts[0],completeMigration,
    'supabase/tests/family_statistics_complete_reconcile_post.sql'];
  const stagedComplete=migrations.includes(completeMigration);
  const singlePassMigration='supabase/migrations/20261119133000_dic_classify_family_refresh_single_pass.sql';
  const singlePassParts=[reconcileParts[0],'supabase/tests/personal_family_refresh_single_pass_post.sql'];
  const stagedSinglePass=migrations.includes(singlePassMigration);
  const standaloneParts=new Set([reconcileParts[0],reconcileParts[2],completeParts[2],singlePassParts[1]]);
  const suites=allSuites.filter(path=>!standaloneParts.has(path)).filter(applicable);
  for(const [suite,[migration,skipLabel]] of Object.entries(migrationBoundSuites)){
   const exists=migrations.includes('supabase/migrations/'+migration);
   assert.equal(output.includes('NOT_APPLICABLE: #509 '+skipLabel+'; migration excluded'),!exists,
    suite+' must be NOT_APPLICABLE iff its exact schema migration is absent');
  }
  const expected=['tests/sql/bootstrap.sql',...migrations,'tests/sql/owner-fixture.sql',...suites];
  const byHash=new Map(expected.map(path=>[digest(path),path]));
  const streamToken='R360_SYNTHETIC_STALE_RECONCILIATION_TRANSACTION';
  if(stagedReconcile){
   const bytes=Buffer.concat(reconcileParts.map(path=>readFileSync(join(root,path))));
   byHash.set(createHash('sha256').update(bytes).digest('hex'),streamToken);
  }
  const completeToken='R361_COMPLETE_DERIVED_STATISTICS_TRANSACTION';
  if(stagedComplete){
   const bytes=Buffer.concat(completeParts.map(path=>readFileSync(join(root,path))));
   byHash.set(createHash('sha256').update(bytes).digest('hex'),completeToken);
  }
  const singlePassToken='R362_PERSONAL_FAMILY_REFRESH_SINGLE_PASS_TRANSACTION';
  if(stagedSinglePass){
   const bytes=Buffer.concat(singlePassParts.map(path=>readFileSync(join(root,path))));
   byHash.set(createHash('sha256').update(bytes).digest('hex'),singlePassToken);
  }
  assert.equal(byHash.size,expected.length+(stagedReconcile?1:0)+(stagedComplete?1:0)+(stagedSinglePass?1:0),
   'SQL fixtures and bundled R360/R361/R362 transactions must have distinct traceable content');
  const observed=readFileSync(trace,'utf8').trim().split('\n').map(line=>{
   const hash=line.split(/\s+/)[0];
   assert.ok(byHash.has(hash),'runner dispatched an unexpected SQL file');
   return byHash.get(hash);
  });
  assert.deepEqual(observed.filter(path=>path!==streamToken&&path!==completeToken&&path!==singlePassToken).slice().sort(),expected.slice().sort(),
   'every migration and standalone regression must be dispatched exactly once');
  assert.equal(observed.filter(path=>path===streamToken).length,stagedReconcile?1:0,
   'the exact R360 migration+rollback fixture must run once iff staged');
  if(stagedReconcile){
   const i=observed.indexOf(reconcileMigration);
   assert.ok(i>0,'R360 must be applied after historical migrations');
   assert.equal(observed[i-1],streamToken,
    'the literal migration must be tested in its rollback fixture immediately before application');
  }
  assert.equal(observed.filter(path=>path===completeToken).length,stagedComplete?1:0,
   'the exact R361 full-derived migration+rollback fixture must run once iff staged');
  if(stagedComplete){
   const i=observed.indexOf(completeMigration);
   assert.ok(i>observed.indexOf(reconcileMigration),'R361 must apply after R360');
   assert.equal(observed[i-1],completeToken,
    'the literal R361 migration must be tested in rollback immediately before application');
  }
  assert.equal(observed.filter(path=>path===singlePassToken).length,stagedSinglePass?1:0,
   'the R362 source-bounded single-refresh regression must run once iff staged');
  if(stagedSinglePass){
   const i=observed.indexOf(singlePassMigration);
   assert.equal(observed[i+1],singlePassToken,'R362 fixture must run after its replacement migration');
  }
  assert.equal(observed[0],'tests/sql/bootstrap.sql');
  for(let index=1;index<migrations.length;index++)
   assert.ok(observed.indexOf(migrations[index-1])<observed.indexOf(migrations[index]),
    'migrations must preserve ordered history');
  const historical={
   security_foundation:'20261012015655_dic_internal_function_access',
   native_import:'20261012183845_dic_import_qualified_validation',
   owner_only_import_exception:'20261014152014_dic_owner_only_import_exception',
   setup_rename_feed_memory:'20261014200634_dic_setup_rename_feed_memory'
  };
  for(const [suite,migration] of Object.entries(historical))
   assert.equal(observed.indexOf('supabase/tests/'+suite+'.sql'),
    observed.indexOf('supabase/migrations/'+migration+'.sql')+1,suite+' ran at the wrong schema boundary');
  const fixture=observed.indexOf('tests/sql/owner-fixture.sql');
  assert.ok(fixture>observed.indexOf(migrations.at(-1)));
  for(const suite of suites.filter(path=>!Object.hasOwn(historical,path.split('/').at(-1).slice(0,-4))))
   assert.ok(observed.indexOf(suite)>fixture,suite+' must exercise the final schema');
 }finally{rmSync(temp,{recursive:true,force:true});}
});
