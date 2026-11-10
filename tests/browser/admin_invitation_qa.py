"""Isolated Chromium 390px Admin approval/attention QA. All identities synthetic."""
from pathlib import Path
import re, shutil
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[2]
SITE=ROOT/"site"
OUT=ROOT/"qa_artifacts"/"cloud"
OUT.mkdir(parents=True,exist_ok=True)
client=(SITE/"cloud"/"client.js").read_text()
client=re.sub(r"\bexport\s+","",client)
client="const {isAccessDenied}=(()=>{\n"+client+"\nreturn {isAccessDenied};\n})();\n"
records=(SITE/"admin"/"records.js").read_text()
records=re.sub(r"^import .*?;\s*$","",records,flags=re.M)
records=re.sub(r"\bexport\s+","",records)
view=(SITE/"admin"/"view.js").read_text()
view=re.sub(r"^import .*?;\s*$","",view,flags=re.M)
view=re.sub(r"\bexport\s+","",view)
main=(SITE/"admin"/"main.js").read_text()
main=re.sub(r"^import .*?;\s*$","",main,flags=re.M)
css=(SITE/"styles.css").read_text()+"\n"+(SITE/"admin"/"styles.css").read_text()

mock=r"""
const ADMIN='10000000-0000-4000-8000-000000000001';
const MEMBER='20000000-0000-4000-8000-000000000001';
const VERIFIED='30000000-0000-4000-8000-000000000001';
const UNVERIFIED='30000000-0000-4000-8000-000000000002';
const CLOUD_CONFIG={enabled:true,supabaseUrl:'https://fixture.invalid',publishableKey:'SYNTHETIC'};
const readAppearance=()=> 'system';
const applyAppearance=()=>{};
const secureOrigin=()=>{};
const e=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
window.__calls=[];
window.__pending=[
 {id:VERIFIED,email:'new@synthetic.invalid',email_verified:true,created_at:'2026-11-09T18:00:00Z',review_state:'pending'},
 {id:UNVERIFIED,email:'unverified@synthetic.invalid',email_verified:false,created_at:'2026-11-09T19:00:00Z',review_state:'pending'}
];
window.__members=[{id:ADMIN,email:'operator@synthetic.invalid',admin:true,enabled:true},
 {id:MEMBER,email:'tester@synthetic.invalid',admin:false,enabled:true}];
window.__sdk={auth:{
 onAuthStateChange(fn){window.__emit=fn;return {data:{subscription:{unsubscribe(){}}}};},
 async getUser(){return {data:{user:{id:ADMIN}}};}
},from(){return {select(){return {eq(){return {async maybeSingle(){return {data:{theme:'system'}};}};}};}};},
async rpc(name,args){
 window.__calls.push({name,args});
 if(name==='dic_session_status')return {data:{authenticated:true,admitted:true,admin:true}};
 if(name==='dic_admin_dashboard')return {data:{counts:{active_accounts:2,pending_accounts:window.__pending.length,pending_coffees:1,conflicts:1,unfinished_account_deletions:0,verified_coffees:1,shot_records:2},queue:[],queue_total:0}};
 if(name==='dic_admin_signup_requests')return {data:{items:structuredClone(window.__pending),total:window.__pending.length,offset:args.p_offset}};
 if(name==='dic_admin_access_overview')return {data:{members:structuredClone(window.__members),members_total:2,pending_deletions:[]}};
 if(name==='dic_admin_records'||name==='dic_admin_search_records'){
  const items=args.p_kind==='accounts'?window.__members:[];
  const term=String(args.p_query||'').toLowerCase();
  const filtered=items.filter(row=>!term||JSON.stringify(row).toLowerCase().includes(term));
  return {data:{items:structuredClone(filtered),total:filtered.length,offset:args.p_offset}};
 }
 if(name==='dic_admin_review_signup'){
  const target=window.__pending.find(x=>x.id===args.p_member_id);
  if(!target)return {data:{ok:false,code:'stale_review'}};
  if(args.p_action==='approve'&&!target.email_verified)return {data:{ok:false,code:'verify_email_first'}};
  window.__pending=window.__pending.filter(x=>x.id!==target.id);
  return {data:{ok:true,decision:args.p_action}};
 }
 if(name==='dic_admin_set_member_access'){
  const member=window.__members.find(x=>x.id===args.p_member_id);
  if(member?.admin)return {error:{message:'Administrator protected'}};
  member.enabled=args.p_enabled;return {data:{ok:true,enabled:member.enabled}};
 }
 throw Error('Unexpected RPC '+name);
}};
window.supabase={createClient(){return window.__sdk;}};
window.confirm=()=>true;
"""
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=shutil.which("chromium") or shutil.which("chromium-browser") or None,headless=True,args=["--no-sandbox"])
 page=browser.new_page(viewport={"width":390,"height":844})
 page.set_default_timeout(10000)
 errors=[]
 page.on("pageerror",lambda error: errors.append(str(error)))
 page.set_content('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>'+css+'</style></head><body><main id="admin-root" class="admin-shell"></main></body></html>')
 page.add_script_tag(content=mock+"\n"+client+"\n"+records+"\n"+view+"\n"+main)
 page.get_by_role("heading",name="New Account Requests").wait_for()
 assert page.get_by_role("heading",name="Requires Your Attention").count()==1
 assert page.locator(".admin-attention-count").inner_text()=="4"
 assert page.get_by_text("new@synthetic.invalid").count()==1
 assert page.get_by_text("unverified@synthetic.invalid").count()==1
 assert page.locator('[data-action="approve-signup"][data-id="30000000-0000-4000-8000-000000000002"]').is_disabled()
 assert page.locator('[data-action="approve-signup"][data-id="30000000-0000-4000-8000-000000000001"]').is_enabled()
 assert page.get_by_text("Beta Invitations").count()==0
 assert page.locator('#admin-invite-form').count()==0
 assert page.evaluate("window.__calls.filter(x=>/invite/i.test(x.name)).length")==0
 assert page.evaluate("window.__calls.filter(x=>x.name==='dic_admin_records').length")==0
 page.screenshot(path=str(OUT/"admin_signup_pending_mobile.png"),full_page=True)
 page.locator('[data-action="approve-signup"][data-id="30000000-0000-4000-8000-000000000001"]').click()
 page.wait_for_function("window.__pending.length===1")
 assert page.evaluate("window.__calls.some(x=>x.name==='dic_admin_review_signup'&&x.args.p_action==='approve')")
 page.locator('[data-action="reject-signup"][data-id="30000000-0000-4000-8000-000000000002"]').click()
 page.wait_for_function("window.__pending.length===0")
 assert page.get_by_text("No pending account requests.").count()==1
 assert page.evaluate("window.__calls.some(x=>x.name==='dic_admin_review_signup'&&x.args.p_action==='reject')")
 page.screenshot(path=str(OUT/"admin_signup_reviewed_mobile.png"),full_page=True)
 page.locator('#admin-accounts summary.admin-disclosure-summary').click()
 page.get_by_text("tester@synthetic.invalid").wait_for()
 assert page.get_by_text("Protected",exact=True).count()==1
 assert page.locator('[data-action="remove-member"][data-id="20000000-0000-4000-8000-000000000001"]').count()==1
 page.get_by_role("button",name="Remove Access").click()
 page.get_by_role("button",name="Restore Access").wait_for()
 page.get_by_role("button",name="Restore Access").click()
 page.get_by_role("button",name="Remove Access").wait_for()
 assert page.evaluate("window.__calls.filter(x=>x.name==='dic_admin_set_member_access').length")==2
 page.evaluate("window.__emit('SIGNED_OUT',null)")
 page.get_by_role("heading",name="Admin Access Unavailable").wait_for()
 assert "new@synthetic.invalid" not in page.locator("body").inner_text()
 assert not errors,errors
 print("PASS: isolated 390px Chromium new signup pending/verifications, protected Admin Approve/Reject, attention badge, code-free UI, existing accounts, signed-out redaction; all identities synthetic")
 browser.close()
