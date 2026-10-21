import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const load=path=>readFile(new URL('../'+path,import.meta.url),'utf8');
test('member Pending retry is admitted, user-owned, backend-enforced and preserves source truth',async()=>{
 const [sql,client,ui]=await Promise.all([
  load('supabase/migrations/20261021062000_dic_duplicate_first_auto_approval.sql'),
  load('site/cloud/client.js'),load('site/cloud/main.js')]);
 assert.match(sql,/member_auto_approved/);
 assert.match(sql,/member_supplied_unverified/);
 assert.match(sql,/source_kind:=case when method='official_verified' then 'roaster_page'/);
 assert.match(sql,/auth.uid\(\) is distinct from s.owner_id/);
 assert.match(sql,/private\.require_member\(\)/);
 assert.match(sql,/not private\.is_member\(\)/);
 assert.match(sql,/s\.revision is distinct from p_expected_revision/);
 assert.match(sql,/confirmed_distinct never bypasses server duplicate gates/i);
 assert.match(sql,/grant execute on function public\.dic_member_retry_pending_approval/);
 assert.match(client,/async memberRetryPendingApproval\(submissionId,expectedRevision\)/);
 assert.match(ui,/Retry Automatic Approval/);
 assert.match(ui,/this\.client\.memberRetryPendingApproval\(submission\.id,Number\(submission\.revision\)\)/);
});
test('admin approval distinct permits exact audited manual override of ambiguous duplicate, not bypass for ordinary member',async()=>{
 const [admin,sql]=await Promise.all([
 load('site/admin/main.js'),load('supabase/migrations/20261021053500_dic_admin_coffee_review.sql')]);
 assert.match(sql,/method='admin_reviewed'/);
 assert.match(sql,/\'verification_method\',\'manual_administrator\'\),true\)/);
 assert.match(sql,/not private\.is_admin\(\)/);
 assert.match(admin,/data-action/);
 assert.match(admin,/dic_admin_review_coffee/);
});
test('coffee status UX differentiates catalog approval from independently verified source',async()=>{
 const ui=await load('site/cloud/main.js');
 assert.match(ui,/\?'Approved coffee':'Pending: possible duplicate needs review\.'/);
 assert.doesNotMatch(ui,/\?'Verified coffee record'/);
 assert.match(ui,/Coffee automatically approved and added to the shared catalog\./);
});
