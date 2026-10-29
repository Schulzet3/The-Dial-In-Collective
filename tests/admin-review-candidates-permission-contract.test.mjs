import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const migration=readFileSync(new URL('../supabase/migrations/20261029193000_dic_admin_review_candidates_grant.sql',import.meta.url),'utf8');
const original=readFileSync(new URL('../supabase/migrations/20261023225600_dic_admin_safe_delete.sql',import.meta.url),'utf8');

test('Admin comparison repair grants only authenticated execution of existing private function',()=>{
 const executable=migration.replace(/--[^\n]*/g,'').trim().split(/;\s*/).map(s=>s.trim()).filter(Boolean);
 assert.deepEqual(executable,[
  'REVOKE ALL ON FUNCTION private.dic_admin_review_candidates(uuid) FROM PUBLIC, anon',
  'GRANT EXECUTE ON FUNCTION private.dic_admin_review_candidates(uuid) TO authenticated'
 ]);
 assert.doesNotMatch(migration,/\b(?:DROP|TRUNCATE|DELETE|UPDATE|ALTER\s+ROLE|CREATE\s+USER)\b/i);
});

test('grant-only repair keeps existing server-enforced admission and Admin checks',()=>{
 const body=original.split('CREATE OR REPLACE FUNCTION private.dic_admin_review_candidates(p_submission_id uuid)')[1];
 assert.ok(body,'original protected private function exists');
 assert.match(body,/PERFORM private\.require_member\(\)/);
 assert.match(body,/auth\.uid\(\) IS NULL OR NOT private\.is_admin\(\)/);
 assert.match(original,/REVOKE ALL ON FUNCTION private\.dic_admin_review_candidates\(uuid\) FROM PUBLIC,anon,authenticated/);
});
