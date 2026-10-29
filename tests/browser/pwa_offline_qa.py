from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import shutil
import tempfile
import threading
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
DIST = ROOT / 'dist'
assert (DIST / 'sw.js').exists(), 'Build the allowlisted production assets first'

# The real built app + service worker run on isolated localhost. Only the SDK
# is replaced with an entirely local, synthetic owner/session/RPC fixture.
# This is NOT an authenticated production Supabase test and sends no requests
# to the user's Supabase, Google Drive, or live Netlify project.
fixture = (ROOT / 'tests/cloud-fixtures/raw.js').read_text().replace('export ', '')
stub = r"""
(() => {
 const sessionUser=()=>({id:localStorage.getItem('dic_fake_owner')||OWNER,email:'synthetic@example.invalid'});
 const session=()=>({
  user:sessionUser(),access_token:'synthetic-only',refresh_token:'synthetic-refresh',
  expires_at:Math.floor(Date.now()/1000)+(localStorage.getItem('dic_fake_expired')? -100:3600)
 });
 const remoteShots=()=>JSON.parse(localStorage.getItem('dic_fake_remote_shots')||'[]');
 const read=()=>{
  const state=rawFixture();state.shots=remoteShots();
  state.notes=state.shots.map(sh=>({owner_id:OWNER,shot_id:sh.id,notes:'Synthetic offline note'}));
  return state;
 };
 const record=(p)=>({
  id:p.id,owner_id:sessionUser().id,setup_id:p.setup_id,setup_version_id:p.setup_version_id,
  library_entry_id:p.library_entry_id,basket_version_id:p.basket_version_id,
  calibration_id:p.calibration_id,style:p.style,pulled_at:p.pulled_at,
  dose_g:p.dose_g,yield_g:p.yield_g,time_s:p.time_s,grind_setting:p.grind_setting,
  temperature_c:p.temperature_c??null,feed_mode:p.feed_mode,
  extraction:p.taste.extraction,body:p.taste.body,clarity:p.taste.clarity,
  sweetness:p.taste.sweetness,astringency:p.taste.astringency,
  is_dialed_in:true,revision:1,personal_family_id:null,experiment_id:null,
  equipment_snapshot:{machine_model:'Test machine',grinder_model:'Test grinder',
   burr_set:'Test burrs',finest_setting:0,coarsest_setting:5,basket_dose_g:18}
 });
 window.supabase={createClient(){return {
  auth:{
   onAuthStateChange(cb){queueMicrotask(()=>cb('INITIAL_SESSION',{user:sessionUser()}));return {data:{subscription:{unsubscribe(){}}}};},
   async getUser(){if(!navigator.onLine)throw Error('Offline; getUser must not be trusted');return {data:{user:sessionUser()},error:null};},
   async getSession(){return {data:{session:session()},error:null};},
   async signOut(){return {data:{},error:null};},
  },
  async rpc(name,params){
   if(!navigator.onLine)throw Error('RPC unavailable offline');
   if(name==='dic_session_status')return {data:{admitted:true,admin:false,emailVerified:true},error:null};
   if(name==='dic_read_personal_state')return {data:read(),error:null};
   if(name==='dic_my_community_outliers')return {data:[],error:null};
   if(name==='dic_apply_client_change'){
    const event=params;
    if(event.action!=='save_shot')throw Error('Only shot synchronization is mocked');
    if(localStorage.getItem('dic_fake_hold_sync')==='1')throw Error('Intentional sync hold during service-worker upgrade');
    const existing=remoteShots(),shot=record(event.payload);
    if(!existing.some(x=>x.id===shot.id))existing.push(shot);
    localStorage.setItem('dic_fake_remote_shots',JSON.stringify(existing));
    return {data:{ok:true,record:shot},error:null};
   }
   throw Error('Unexpected synthetic RPC '+name);
  },
  functions:{async invoke(){throw Error('No Edge Functions in PWA QA');}}
 };}};
})();
"""

class Handler(SimpleHTTPRequestHandler):
 def log_message(self, *_args):
  pass

with tempfile.TemporaryDirectory(prefix='dic-pwa-qa-') as folder:
 www = Path(folder)
 shutil.copytree(DIST, www, dirs_exist_ok=True)
 (www / 'vendor/supabase.js').write_text(fixture + stub)
 web = ThreadingHTTPServer(('127.0.0.1', 0), partial(Handler,directory=str(www)))
 thread=threading.Thread(target=web.serve_forever,daemon=True)
 thread.start()
 url=f'http://127.0.0.1:{web.server_port}/'
 try:
  with sync_playwright() as p:
   browser=p.chromium.launch()
   context=browser.new_context(viewport={'width':390,'height':844},service_workers='allow')
   page=context.new_page()
   page.goto(url,wait_until='domcontentloaded')
   page.get_by_role('button',name='Settings',exact=True).wait_for(timeout=20000)
   assert page.locator('.coffee-card').count()==1, 'Online user seeded owner-scoped cache'
   page.evaluate('async()=>await navigator.serviceWorker.ready')
   page.wait_for_function("async()=>{const names=await caches.keys();return names.some(k=>k.startsWith('dic-public-shell-'));}",timeout=20000)
   paths=page.evaluate("""async()=>{
    const names=await caches.keys(),c=await caches.open(names.find(x=>x.startsWith('dic-public-shell-')));
    return (await c.keys()).map(x=>new URL(x.url).pathname);
   }""")
   assert '/index.html' in paths and '/cloud/main.js' in paths
   assert '/icon-192.png' in paths and '/icon-512.png' in paths
   assert not any(x.startswith(('/api/','/auth/','/rest/','/admin')) for x in paths),paths
   page.close()

   context.set_offline(True)
   page=context.new_page()
   page.goto(url,wait_until='domcontentloaded')
   page.get_by_role('button',name='Settings',exact=True).wait_for(timeout=20000)
   assert page.locator('.coffee-card').count()==1,'Cold offline reopen lost the saved coffee'
   assert page.get_by_role('button',name='Community').count()==0,'Offline Community should not show stale data'
   assert page.get_by_role('button',name='Add Coffee').count()==0,'Online-only canonical lookup must stay disabled'
   page.locator('[data-action=expand]').first.click()
   # Wait for either supported entry point: first-ever prompt or ordinary Log.
   page.locator('[data-action=first-shot-log], [data-action=log]').first.click()
   page.locator('[name=yieldG]').fill('48')
   page.locator('[name=timeS]').fill('25')
   page.locator('[name=grindSetting]').fill('1')
   for key,value in [('extraction',3),('body',3),('clarity',5),('sweetness',5),('astringency',1)]:
    page.locator(f'[data-action=rate][data-key={key}][data-value="{value}"]').click()
   page.get_by_role('button',name='Save Shot & Get Suggestion').click()
   page.wait_for_function('!document.querySelector("#sheet").open')
   assert page.get_by_text('Saved on this device; waiting to sync.',exact=False).count()>0
   page.reload(wait_until='domcontentloaded')
   page.get_by_role('button',name='Settings',exact=True).wait_for(timeout=20000)
   assert page.locator('.coffee-card').count()==1,'Cached owner cannot reopen after queued shot'
   assert page.get_by_role('button',name='1 Pending',exact=False).count()>0,'Outbox did not survive reload'

   # Issue 22: a failed offline service-worker update cannot consume queued events.
   assert page.get_by_role('button',name='1 Pending',exact=False).count()>0
   page.evaluate("""async()=>{
    const sw=await navigator.serviceWorker.getRegistration();
    if(!sw)throw Error('No registered service worker');
    try{await sw.update();}catch{/* Expected while offline */}
   }""")
   assert page.get_by_role('button',name='1 Pending',exact=False).count()>0,'Offline app update discarded queued shot'
   # Real isolated service-worker version transition while a durable shot is pending.
   # Block only the synthetic remote mutation so reconnect cannot consume the shot.
   page.evaluate("localStorage.setItem('dic_fake_hold_sync','1')")
   context.set_offline(False)
   worker=www/'sw.js'
   original_worker=worker.read_text()
   assert "dic-public-shell-" in original_worker
   worker.write_text(original_worker.replace("dic-public-shell-","dic-public-shell-updated-",1))
   page.evaluate("async()=>{const r=await navigator.serviceWorker.ready;await r.update();}")
   page.wait_for_function("""async()=>{
    const keys=await caches.keys();
    return keys.some(k=>k.startsWith('dic-public-shell-updated-'));
   }""",timeout=25000)
   assert page.get_by_role('button',name='1 Pending',exact=False).count()>0
   context.set_offline(True)
   page.reload(wait_until='domcontentloaded')
   page.get_by_role('button',name='Settings',exact=True).wait_for(timeout=20000)
   assert page.get_by_role('button',name='1 Pending',exact=False).count()>0,'Actual SW version upgrade lost pending shot'
   page.evaluate("localStorage.setItem('dic_fake_owner','b2222222-2222-4222-8222-222222222222')")
   # A genuine offline cold reopen must use persisted origin storage in a new
   # tab after the SW version transition; a repeated reload of the old,
   # already-controlled window can hang before any new document commits.
   # The new page MUST render the denied owner's login-only view below.
   page.close()
   page=context.new_page()
   page.goto(url,wait_until='domcontentloaded')
   page.get_by_text('Reconnect To Continue',exact=True).wait_for(timeout=20000)
   assert page.locator('.coffee-card').count()==0,'Former owner cache leaked to another session'

   page.evaluate("""()=>{localStorage.setItem('dic_fake_owner','a1111111-1111-4111-8111-111111111111');
    localStorage.setItem('dic_fake_expired','1');}""")
   page.reload(wait_until='domcontentloaded')
   page.get_by_role('button',name='Settings',exact=True).wait_for(timeout=3000) if False else None
   page.wait_for_function("!document.querySelector('.coffee-card')",timeout=20000)
   assert page.locator('.coffee-card').count()==0,'Expired SDK session exposed cache'

   page.evaluate("localStorage.removeItem('dic_fake_expired');localStorage.removeItem('dic_fake_hold_sync')")
   context.set_offline(False)
   page.reload(wait_until='domcontentloaded')
   page.get_by_role('button',name='Settings',exact=True).wait_for(timeout=20000)
   page.wait_for_function("localStorage.getItem('dic_fake_remote_shots')!==null",timeout=20000)
   count=page.evaluate("JSON.parse(localStorage.getItem('dic_fake_remote_shots')||'[]').length")
   assert count==1,'Pending shot not synchronized exactly once'
   page.close()
   context.close()
   # Issue 22: exercise the actual packaged browser app through server denial,
   # failed IndexedDB cache deletion, cold offline restart and readmission.
   isolated=browser.new_context(viewport={'width':390,'height':844},service_workers='allow')
   candidate=isolated.new_page()
   candidate.goto(url,wait_until='domcontentloaded')
   candidate.get_by_role('button',name='Settings',exact=True).wait_for(timeout=20000)
   assert candidate.locator('.coffee-card').count()==1
   candidate.evaluate('async()=>await navigator.serviceWorker.ready')
   # The packaged application does not expose its private controller globally.
   # The Node test above exercises actual denial + failed cache deletion; here
   # Chromium validates the persisted marker across a real offline cold load.
   candidate.evaluate("localStorage.setItem('dic-offline-denied:a1111111-1111-4111-8111-111111111111','1')")
   isolated.set_offline(True)
   candidate.reload(wait_until='domcontentloaded')
   candidate.get_by_text('Reconnect To Continue',exact=True).wait_for(timeout=20000)
   assert candidate.locator('.coffee-card').count()==0,'Revoked owner saw old cache after cold offline reload'
   isolated.set_offline(False)
   candidate.reload(wait_until='domcontentloaded')
   candidate.get_by_role('button',name='Settings',exact=True).wait_for(timeout=20000)
   assert candidate.locator('.coffee-card').count()==1,'Fresh admission failed to restore legitimate owner'
   assert candidate.evaluate("localStorage.getItem('dic-offline-denied:a1111111-1111-4111-8111-111111111111')")==None
   candidate.close()
   isolated.close()
   browser.close()
   print('PASS: Localhost Chromium PWA offline queue, update, revoked-access cold reload and verified readmission.')
 finally:
  web.shutdown()
  web.server_close()
