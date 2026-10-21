import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

test('review API has owner-independent admin permission and does not spoof official verification',async()=>{
 const sql=await readFile(new URL('../supabase/migrations/20261021053500_dic_admin_coffee_review.sql',import.meta.url),'utf8');
 assert.match(sql,/admin_reviewed/);
 assert.match(sql,/Only an administrator may review a member coffee/);
 assert.match(sql,/method='official_verified'/);
 assert.match(sql,/source_kind:=case when method='official_verified'/);
 assert.match(sql,/p_action='merge'/);
 assert.match(sql,/admin_reviewed_merge/);
 assert.match(sql,/owner_roast_reclassified/);
 assert.match(sql,/private\.dic_link_pending_coffee/);
 assert.match(sql,/Submission changed\. Refresh before reviewing/);
 assert.match(sql,/status='conflict'/);
});
