"""Offline-only Chromium admin invitation UI acceptance. All identities and codes fake."""
from pathlib import Path
import re, shutil
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
SITE = ROOT / "site"
OUT = ROOT / "qa_artifacts" / "cloud"
OUT.mkdir(parents=True, exist_ok=True)

view=(SITE / "admin" / "view.js").read_text()
view=re.sub(r"^import .*?;\s*$", "", view, flags=re.M)
view=re.sub(r"\bexport\s+", "", view)
main=(SITE / "admin" / "main.js").read_text()
main=re.sub(r"^import .*?;\s*$", "", main, flags=re.M)
css=(SITE / "styles.css").read_text() + "\n" + (SITE / "admin" / "styles.css").read_text()

mock=r"""
const ADMIN='10000000-0000-4000-8000-000000000001';
const MEMBER='20000000-0000-4000-8000-000000000001';
const INVITE='30000000-0000-4000-8000-000000000001';
const SECRET='dic-'+'d'.repeat(64);
const CLOUD_CONFIG={enabled:true,supabaseUrl:'https://fake.invalid',publishableKey:'TEST_ONLY'};
const readAppearance=()=> 'system';
const applyAppearance=()=>{};
const secureOrigin=()=>{};
const e=value=>String(value??'').replace(/[&<>"']/g, ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
window.__calls=[];
window.__access={
 invites:[],invites_total:0,
 members:[{id:ADMIN,email:'operator@synthetic.invalid',admin:true,enabled:true},
 {id:MEMBER,email:'tester@synthetic.invalid',admin:false,enabled:true}],
 members_total:2
};
window.__sdk={
 auth:{
  onAuthStateChange(fn){window.__emit=fn;return {data:{subscription:{unsubscribe(){}}}};},
  async getUser(){return {data:{user:{id:ADMIN}}};}
 },
 from(){return {select(){return {eq(){return {async maybeSingle(){return {data:{theme:'system'}};}};}};}};},
 async rpc(name,args){
  window.__calls.push({name,args});
  if(name==='dic_session_status')return {data:{authenticated:true,admitted:true,admin:true}};
  if(name==='dic_admin_dashboard')return {data:{counts:{active_accounts:2,pending_coffees:0},queue:[],queue_total:0}};
  if(name==='dic_admin_access_overview')return {data:structuredClone(window.__access)};
  if(name==='dic_admin_issue_invite'){
   const m={id:INVITE,label:args.p_label,created_at:'2026-10-18',
      status:'active',uses:0,max_uses:args.p_max_uses,expires_at:null};
   window.__access.invites=[m];window.__access.invites_total=1;
   return {data:{ok:true,id:INVITE,invite_code:SECRET}};
  }
  if(name==='dic_admin_revoke_invite'){
   window.__access.invites[0].status='revoked';
   return {data:{ok:true,revoked:true}};
  }
  if(name==='dic_admin_set_member_access'){
   const member=window.__access.members.find(m=>m.id===args.p_member_id);
   if(member.admin)return {data:null,error:{message:'Administrator protected'}};
   member.enabled=args.p_enabled;return {data:{ok:true,enabled:member.enabled}};
  }
  throw Error('Unexpected RPC '+name);
 }
};
window.supabase={createClient(){return window.__sdk;}};
window.confirm=()=>true;
"""
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=shutil.which("chromium") or shutil.which("chromium-browser") or None, headless=True,args=["--no-sandbox"])
 page=browser.new_page(viewport={"width":390,"height":844})
 page.set_default_timeout(10000)
 errors=[]
 page.on("pageerror",lambda err: errors.append(str(err)))
 page.set_content('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>'+css+'</style></head><body><main id="admin-root" class="admin-shell"></main></body></html>')
 page.add_script_tag(content=mock+"\n"+view+"\n"+main)
 page.get_by_role("heading",name="Beta Invitations").wait_for()
 assert page.get_by_text("operator@synthetic.invalid").count()==1
 assert page.get_by_text("tester@synthetic.invalid").count()==1
 assert page.get_by_text("Protected",exact=True).count()==1
 assert page.locator('[data-id="'+ '10000000-0000-4000-8000-000000000001' +'"]').count()==0
 assert page.locator('#admin-invite-form').count()==1
 page.screenshot(path=str(OUT/"admin_invitations_empty_mobile.png"),full_page=True)

 page.locator("#admin-invite-label").fill("Small user group")
 page.locator("#admin-invite-uses").select_option("unlimited")
 page.get_by_role("button",name="Generate Code").click()
 page.locator("#admin-new-code").wait_for()
 code=page.locator("#admin-new-code").inner_text()
 assert code=="dic-"+("d"*64)
 assert page.get_by_text("Never expires").count()==1
 assert page.get_by_text("Reusable until revoked").count()==1
 assert page.evaluate("window.__calls.find(x=>x.name==='dic_admin_issue_invite').args.p_max_uses") is None
 page.screenshot(path=str(OUT/"admin_invitation_generated_mobile.png"),full_page=True)

 page.get_by_role("button",name="Refresh",exact=True).click()
 page.locator("#admin-new-code").wait_for(state="detached")
 assert code not in page.locator("body").inner_text()
 assert page.get_by_text("Existing Codes").count()==1 or "Existing Codes" in page.locator("body").inner_text()

 page.get_by_role("button",name="Remove Access").click()
 page.get_by_role("button",name="Restore Access").wait_for()
 assert "Personal history retained" in page.locator("body").inner_text()
 page.get_by_role("button",name="Restore Access").click()
 page.get_by_role("button",name="Remove Access").wait_for()
 page.get_by_role("button",name="Revoke Code").click()
 page.get_by_role("button",name="Revoke Code").wait_for(state="detached")
 assert "revoked" in page.locator("body").inner_text()
 assert page.evaluate("window.__calls.filter(x=>x.name==='dic_admin_set_member_access').length")==2
 page.screenshot(path=str(OUT/"admin_invitation_revoked_mobile.png"),full_page=True)

 page.evaluate("window.__emit('SIGNED_OUT',null)")
 page.get_by_role("heading",name="Admin Access Unavailable").wait_for()
 assert code not in page.locator("body").inner_text()
 assert not errors, errors
 print("PASS: isolated Chromium 390px admin invitation create, no-expiry reusable code, code-once privacy, revoke, member access remove/restore, protected administrator, sign-out redaction. All identities and codes synthetic.")
 browser.close()
