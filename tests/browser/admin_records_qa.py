"""Real Chromium Admin records UI regression using exclusively synthetic data and fake auth.
This is NOT a signed-in Supabase/GoTrue production session or a real member edit.
"""
from pathlib import Path
import re
import shutil
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
SITE = ROOT / "site"
OUT = ROOT / "qa_artifacts" / "cloud"
OUT.mkdir(parents=True, exist_ok=True)

def strip_imports(source):
    return re.sub(r"^import .*?;\s*$", "", source, flags=re.M)

client = re.sub(r"\bexport\s+", "", (SITE / "cloud" / "client.js").read_text())
client = "const {isAccessDenied}=(()=>{\n" + client + "\nreturn {isAccessDenied};\n})();\n"
records = re.sub(r"\bexport\s+", "", strip_imports((SITE / "admin" / "records.js").read_text()))
view = re.sub(r"\bexport\s+", "", strip_imports((SITE / "admin" / "view.js").read_text()))
main = strip_imports((SITE / "admin" / "main.js").read_text())
css = (SITE / "styles.css").read_text() + "\n" + (SITE / "admin" / "styles.css").read_text()

mock = r"""
const ADMIN='10000000-0000-4000-8000-000000000001';
const MEMBER='20000000-0000-4000-8000-000000000001';
const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
const CLOUD_CONFIG={enabled:true,supabaseUrl:'https://synthetic.invalid',publishableKey:'TEST_ONLY'};
const readAppearance=()=> 'system';
const applyAppearance=()=>{};
const secureOrigin=()=>{};
const e=value=>String(value??'').replace(/[&<>"']/g, ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
window.__allowed=true;
window.__calls=[];
window.__audits=[];
window.__confirmText='';
window.confirm=text=>{window.__confirmText=String(text);return false;};
window.__data={
 approved:Array.from({length:55},(_,i)=>({
  id:id(i+1),revision:2,name:'Fixture Coffee '+(i+1),roaster:'Fixture Roaster',
  origin:'Synthetic origin',source_url:'https://synthetic.invalid/coffee',process:'Washed',
  creator_email:'member@synthetic.invalid',created_at:'2026-10-29T00:00:00Z'
 })),
 shots:Array.from({length:51},(_,i)=>({
  id:id(i+101),revision:2,coffee_name:'Fixture Espresso',coffee_roaster:'Fixture Roaster',
  library_entry_id:id(900),creator_email:'member@synthetic.invalid',
  style:'Traditional',dose_g:18,yield_g:36,time_s:26,grind_setting:2.5,
  temperature_c:93,notes:'PRIVATE SYNTHETIC NOTE '+(i+1),
  pulled_at:'2026-10-29T00:00:00Z'
 })),
 pending:[],conflicts:[],accounts:[],invites:[]
};
window.__sdk={
 auth:{
  onAuthStateChange(fn){window.__authChange=fn;return {data:{subscription:{unsubscribe(){}}}};},
  async getUser(){return {data:{user:{id:ADMIN}}};}
 },
 from(){return {select(){return {eq(){return {async maybeSingle(){return {data:{theme:'system'}};}};}};}};},
 async rpc(name,args){
  window.__calls.push({name,args:args?structuredClone(args):null});
  if(name==='dic_session_status')return {data:{authenticated:true,admitted:true,admin:window.__allowed}};
  if(!window.__allowed)return {data:null,error:{message:'Administrator access revoked',code:'42501'}};
  if(name==='dic_admin_dashboard')return {data:{
   counts:{pending_coffees:0,conflicts:0,verified_coffees:window.__data.approved.length,
    shot_records:window.__data.shots.length,active_accounts:0},queue:[],queue_total:0
  }};
  if(name==='dic_admin_access_overview')return {data:{members:[],members_total:0,invites:[],invites_total:0}};
  if(name==='dic_admin_records'||name==='dic_admin_search_records'){
   const source=window.__data[args.p_kind]||[];
   const term=String(args.p_query||'').toLowerCase();
   const filtered=term?source.filter(row=>JSON.stringify(row).toLowerCase().includes(term)):source;
   return {data:{items:structuredClone(filtered.slice(args.p_offset,args.p_offset+args.p_limit)),
    offset:args.p_offset,total:filtered.length}};
  }
  if(name==='dic_admin_edit_coffee'||name==='dic_admin_edit_shot'){
   const kind=name==='dic_admin_edit_shot'?'shots':'approved';
   const row=window.__data[kind].find(x=>x.id===args.p_record_id);
   if(!row||row.revision!==args.p_expected_revision)
    return {data:null,error:{message:'Stale revision: refresh this record before editing.',code:'40001'}};
   const before=structuredClone(row);
   if(kind==='shots'){
    row.notes=String(args.p_details.notes);
    for(const key of ['dose_g','yield_g','time_s','grind_setting','temperature_c'])
     if(args.p_details[key]!==undefined&&args.p_details[key]!=='')
      row[key]=Number(args.p_details[key]);
   }else{
    for(const key of ['name','roaster','origin','process','source_url'])
     if(args.p_details[key]!==undefined)row[key]=String(args.p_details[key]);
   }
   row.revision++;
   window.__audits.push({kind,recordId:row.id,before,after:structuredClone(row)});
   return {data:{ok:true,revision:row.revision}};
  }
  if(name==='dic_admin_delete_preview'){
   const kind=args.p_kind==='shot'?'shots':'approved';
   const row=window.__data[kind].find(x=>x.id===args.p_record_id);
   return {data:{revision:row.revision,library_entries:1,shots:1,shot_notes:1,
    linked_submissions:0,community_shots:0,source_records:0,blocked:false}};
  }
  throw Error('Unexpected or prohibited synthetic RPC '+name);
 }
};
window.supabase={createClient(){return window.__sdk;}};
"""
HTML = '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>' + css + '</style></head><body><main id="admin-root" class="admin-shell"></main></body></html>'

def boot(page, allowed=True):
    page.set_default_timeout(15000)
    page.set_content(HTML)
    source = mock + ("\nwindow.__allowed=false;\n" if not allowed else "") + client + records + view + main
    page.add_script_tag(content=source)

with sync_playwright() as p:
    browser=p.chromium.launch(
        executable_path=shutil.which("chromium") or shutil.which("chromium-browser") or None,
        headless=True,args=["--no-sandbox"])
    page=browser.new_page(viewport={"width":390,"height":844})
    errors=[]
    page.on("pageerror",lambda err: errors.append(str(err)))
    boot(page)
    page.locator('#admin-refresh').wait_for()
    assert page.locator('details.admin-disclosure:not([open])').count()==6
    assert page.evaluate("window.__calls.filter(c=>c.name==='dic_admin_records').length")==0, "Collapsed records loaded unexpectedly"

    # Actual keyboard-open disclosure and real click-driven server pagination.
    approved=page.locator('#admin-approved')
    approved.locator('summary').focus()
    page.keyboard.press("Enter")
    page.wait_for_function("document.querySelector('#admin-approved .admin-pagination')?.textContent.includes('1–50 of 55')")
    assert approved.locator('.admin-record').count()==50
    assert page.evaluate("window.__calls.filter(x=>x.name==='dic_admin_records').map(x=>x.args.p_kind).join(',')")=='approved'
    approved.locator('button[data-action="record-page"][data-offset="50"]').click()
    page.wait_for_function("document.querySelector('#admin-approved .admin-pagination')?.textContent.includes('51–55 of 55')")
    assert approved.locator('.admin-record').count()==5
    assert approved.get_by_text("Fixture Coffee 55",exact=True).count()==1
    assert approved.get_by_text("Fixture Coffee 1",exact=True).count()==0

    last=approved.locator('.admin-record').last
    assert last.locator('[data-record-form]').count()==1
    last.get_by_role('button',name='Edit Details',exact=True).click()
    last.locator('[data-record-form] [name="name"]').fill('Updated Fixture Coffee 55')
    last.locator('[data-record-form] button[type="submit"]').click()
    page.get_by_text("Audited correction saved.",exact=True).wait_for()
    assert page.locator('#admin-action-notice').inner_text().strip()=='Audited correction saved.'
    assert page.locator('#admin-refresh').count()==1,'saving a correction must not replace the dashboard'
    last=page.locator('#admin-approved .admin-record').last
    assert last.locator('h3').inner_text().strip()=='Updated Fixture Coffee 55',last.locator('h3').inner_text()
    audit=page.evaluate("window.__audits")
    assert len(audit)==1 and audit[0]["kind"]=="approved"
    assert audit[0]["before"]["name"]=="Fixture Coffee 55"
    assert audit[0]["after"]["name"]=="Updated Fixture Coffee 55"
    assert audit[0]["after"]["origin"]=="Synthetic origin"
    assert audit[0]["after"]["id"]==audit[0]["before"]["id"]
    assert audit[0]["after"]["revision"]==3

    # Provoke a real front-end stale-revision rejection against the fake server.
    page.evaluate("window.__data.approved[54].revision=4")
    last.get_by_role('button',name='Edit Details',exact=True).click()
    last.locator('[data-record-form] [name="name"]').fill('UNSAVED STALE CHANGE')
    last.locator('[data-record-form] button[type="submit"]').click()
    page.get_by_text("Stale revision: refresh this record before editing.",exact=False).wait_for()
    assert page.evaluate("window.__audits.length")==1
    assert page.evaluate("window.__data.approved[54].name")=="Updated Fixture Coffee 55"
    page.get_by_role('button',name='Refresh',exact=True).click()
    page.wait_for_function("document.querySelector('#admin-approved [data-record-form]')?.getAttribute('data-revision')==='2' || Array.from(document.querySelectorAll('#admin-approved [data-record-form]')).some(e=>e.getAttribute('data-revision')==='4')")
    assert page.get_by_text("UNSAVED STALE CHANGE",exact=True).count()==0

    # Independently paged shot history, private notes and preservation of measurements.
    shots=page.locator('#admin-shots')
    shots.locator('summary.admin-disclosure-summary').click()
    page.wait_for_function("document.querySelector('#admin-shots .admin-pagination')?.textContent.includes('1–50 of 51')")
    shots.locator('button[data-action="record-page"][data-offset="50"]').click()
    page.wait_for_function("document.querySelector('#admin-shots .admin-pagination')?.textContent.includes('51–51 of 51')")
    shots.locator('.admin-coffee-group summary').click()
    lastShot=shots.locator('.admin-record').last
    assert 'PRIVATE SYNTHETIC NOTE 51' in lastShot.locator('.admin-record-note').inner_text()
    lastShot.get_by_role('button',name='Edit Details',exact=True).click()
    lastShot.locator('[data-record-form] [name="notes"]').fill('Amended synthetic private note')
    lastShot.locator('[data-record-form] button[type="submit"]').click()
    page.get_by_text("Audited correction saved.",exact=True).wait_for()
    audit=page.evaluate("window.__audits")
    assert len(audit)==2 and audit[-1]["kind"]=="shots"
    assert audit[-1]["after"]["notes"]=="Amended synthetic private note"
    for key in ["dose_g","yield_g","time_s","grind_setting","temperature_c","library_entry_id","id"]:
        assert audit[-1]["after"][key]==audit[-1]["before"][key],key

    # Deletion is previewed but intentionally cancelled. Never simulate a real destructive write.
    shots=page.locator('#admin-shots')
    if not shots.locator('.admin-coffee-group').last.evaluate("(el) => el.open"):
        shots.locator('.admin-coffee-group summary').click()
    shots.locator('.admin-record').last.locator('[data-action="admin-delete-record"]').click()
    page.wait_for_function("window.__calls.some(c=>c.name==='dic_admin_delete_preview')")
    assert "Associated records:" in page.evaluate("window.__confirmText")
    assert not page.evaluate("window.__calls.some(c=>c.name==='dic_admin_delete_record')")
    assert page.evaluate("window.__data.shots.length")==51

    # Server-side filter must reset both independent page offsets and avoid leaking hidden records.
    page.locator('#admin-search-query').fill("Updated Fixture Coffee 55")
    page.get_by_role("button",name="Search",exact=True).click()
    page.wait_for_function("document.querySelector('#admin-approved .admin-record')?.textContent.includes('Updated Fixture Coffee 55')")
    assert page.locator('#admin-approved .admin-record').count()==1
    assert page.locator('#admin-shots .admin-record').count()==0
    page.get_by_role("button",name="Clear",exact=True).click()
    page.wait_for_function("document.querySelector('#admin-approved .admin-pagination')?.textContent.includes('1–50 of 55')")

    assert page.evaluate("document.documentElement.scrollWidth <= window.innerWidth + 8"),"Admin UI overflows mobile viewport"
    page.screenshot(path=str(OUT/"admin_records_page2_mobile.png"),full_page=True)
    page.set_viewport_size({"width":1280,"height":800})
    page.screenshot(path=str(OUT/"admin_records_page2_desktop.png"),full_page=True)

    # Revoking a live session must remove the private document, not merely disable buttons.
    page.evaluate("window.__allowed=false")
    page.get_by_role("button",name="Refresh",exact=True).click()
    page.get_by_role("heading",name="Admin Access Unavailable").wait_for()
    assert "Updated Fixture Coffee 55" not in page.locator('body').inner_text()
    assert "Amended synthetic private note" not in page.locator('body').inner_text()
    assert not errors,errors

    # Denied at initial admission: never fetch detailed records or invite metadata.
    denied=browser.new_page(viewport={"width":390,"height":844})
    denied_errors=[]
    denied.on("pageerror",lambda err: denied_errors.append(str(err)))
    boot(denied,allowed=False)
    denied.get_by_role("heading",name="Admin Access Unavailable").wait_for()
    assert denied.evaluate("window.__calls.map(x=>x.name)") == ["dic_session_status"]
    assert not denied_errors,denied_errors
    print("PASS: real 390px/1280px Chromium on synthetic admin role: keyboard expansion, page 2 of 55 coffees / 51 shots, audited edits, stale rejection, private notes, safe cancel, search/paging resets, immediate access denial. No real auth or member writes.")
    browser.close()
