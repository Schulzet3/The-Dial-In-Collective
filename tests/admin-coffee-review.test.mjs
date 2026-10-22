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

test('new admin source retains distinct-approval audit and identity guards with no double prompt',async()=>{
 const sql=await readFile(new URL('../supabase/migrations/20261022024000_dic_admin_fast_review_and_identity_edits.sql',import.meta.url),'utf8');
 const js=await readFile(new URL('../site/admin/main.js',import.meta.url),'utf8');
 assert.match(sql,/p_action='approve' and reason_text is null/);
 assert.match(sql,/Administrator approved distinct coffee/);
 assert.match(sql,/admin_reviews\(submission_id,reviewer_id,action,reason,evidence\)/);
 assert.match(sql,/private\.dic_promote_pending_coffee/);
 assert.match(sql,/Possible duplicate or conflicting coffee release/);
 assert.match(sql,/oldcoffee\.revision<>p_expected_revision/);
 assert.doesNotMatch(js,/if\(decision!=='approve'\)/);
 assert.match(sql,/Administrator resolved duplicate coffee/);
 assert.match(sql,/Administrator held coffee for review/);
 assert.match(js,/const reason=''/);
 assert.match(js,/p_reason:reason,p_canonical_id:selected\|\|null/);
});
