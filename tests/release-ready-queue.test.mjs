import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {classifyMigrationDiff} from '../scripts/release/migration-risk.mjs';
const files=['20261022220000_dic_admin_server_search.sql','20261022220100_dic_community_server_search.sql','20261022220200_dic_preview_two_phase_cache.sql'];
test('ready batch migration risk is classified conservatively',()=>{
 const diff=files.map(f=>'A\tsupabase/migrations/'+f).join('\n');
 const observed=classifyMigrationDiff(diff,path=>readFileSync(new URL('../'+path,import.meta.url),'utf8'));
 assert.equal(observed.risk,'potentially_destructive');
});
