import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyMigrationDiff,releaseReadinessMarkdown} from '../scripts/release/migration-risk.mjs';
const add='supabase/migrations/20261022010101_add_safe_field.sql';
test('no SQL changes does not require an extra backup',()=>{assert.equal(classifyMigrationDiff('',()=>{throw Error('should not read');}).risk,'none');});
test('additive SQL avoids needless pre-release extra dump',()=>{
 const x=classifyMigrationDiff('A\t'+add+'\n',()=> 'CREATE TABLE IF NOT EXISTS public.extra (id uuid primary key); ALTER TABLE public.extra ADD COLUMN name text;');
 assert.equal(x.risk,'non_destructive');
});
test('data writes, destructive DDL, renamed old migrations, dynamic blocks fail conservative',()=>{
 for(const sql of ['DELETE FROM public.shots','UPDATE public.coffees SET name = null',
 'DROP TABLE public.shots','ALTER TABLE public.shots DROP COLUMN age',
 'ALTER TABLE public.shots ALTER COLUMN age TYPE integer','DO $$ BEGIN EXECUTE x; END $$;']){
  assert.equal(classifyMigrationDiff('A\t'+add+'\n',()=>sql).risk,'potentially_destructive',sql);
 }
 assert.equal(classifyMigrationDiff('M\t'+add,()=>'' ).risk,'potentially_destructive');
 assert.equal(classifyMigrationDiff('A\tunexpected.txt',()=>'' ).risk,'potentially_destructive');
 assert.equal(classifyMigrationDiff('A\t'+add,()=>{throw Error('missing');}).risk,'potentially_destructive');
});
test('specific authenticated function execution privilege is non-destructive but broad/dynamic execution remains risky',()=>{
 const grant='REVOKE ALL ON FUNCTION private.dic_admin_review_candidates(uuid) FROM PUBLIC, anon;\\n'+
   'GRANT EXECUTE ON FUNCTION private.dic_admin_review_candidates(uuid) TO authenticated;';
 assert.equal(classifyMigrationDiff('A\\t'+add+'\\n',()=>grant).risk,'non_destructive');
 const dangerous=[
  'GRANT EXECUTE ON FUNCTION public.any(uuid) TO anon;',
  'GRANT EXECUTE ON FUNCTION public.any(uuid) TO PUBLIC;',
  'GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;',
  'EXECUTE x;',
  'GRANT EXECUTE ON FUNCTION private.safe(uuid) TO authenticated; DELETE FROM public.shots;',
  'GRANT EXECUTE ON FUNCTION private.safe(uuid) TO authenticated; DO $ BEGIN EXECUTE x; END $;'
 ];
 for(const sql of dangerous)assert.equal(classifyMigrationDiff('A\\t'+add+'\\n',()=>sql).risk,'potentially_destructive',sql);
});

test('readiness report never misstates publication or owner-device acceptance',()=>{
 const s=releaseReadinessMarkdown({id:'DIC-20261022-EXAMPLE1',sha:'a'.repeat(40),releaseHead:'b'.repeat(40),ci:Object.fromEntries(['approval','validate','cloud-tests','mobile-browser-qa','sql'].map(k=>[k,'success'])),migrationRisk:{risk:'none',reason:'NO_MIGRATION_CHANGES'},request:{backup_evidence:{artifact_id:123,snapshot_started_at_utc:'2026-10-22T01:00:00Z',verified_at_utc:'2026-10-22T01:30:00Z'}}});
 assert.match(s,/NOT YET VERIFIED AS PUBLISHED/);assert.match(s,/NOT REQUIRED/);assert.match(s,/Extra encrypted backup required:\*\* NO/);
 assert.match(s,/Owner-managed/);assert.doesNotMatch(s,/observed credit count|minimum credit|snapshot credit/i);
});
