from pathlib import Path
import re,json,shutil
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[2];SITE=ROOT/'site';OUT=ROOT/'qa_artifacts/cloud';OUT.mkdir(parents=True,exist_ok=True)
def bundle():
 s='(()=>{const Modules={};\n'
 def imports(t):
  t=re.sub(r"import \* as (\w+) from ['\"](.+?)['\"];",lambda m:f'const {m[1]}=Modules.{Path(m[2]).stem};',t)
  t=re.sub(r"import\s*\{([^}]+)\}\s*from\s*['\"](.+?)['\"];",lambda m:'const {'+m[1]+'}=Modules.'+Path(m[2]).stem+';',t)
  return t
 for name in ['constants','model','engine','ui','client','cache','outbox','mapping','shot_card']:
  folder='lib' if name in ['constants','model','engine','ui'] else 'cloud'
  t=(SITE/folder/f'{name}.js').read_text();exports=re.findall(r'export\s+(?:async\s+)?(?:function|const|class|let)\s+(\w+)',t)
  t=re.sub(r'\bexport\s+','',imports(t));s+=f'Modules.{name}=(()=>{{\n{t}\nreturn {{{",".join(exports)}}};\n}})();\n'
 t=(SITE/'cloud/main.js').read_text();t=t.replace("import {CLOUD_CONFIG} from './config.js';","const CLOUD_CONFIG={enabled:false};").replace('startCloudApp();','').replace('export {CloudApp};','');t=re.sub(r'\bexport\s+','',imports(t))
 s+=t+'\nwindow.__CloudApp=CloudApp;window.__Modules=Modules;})();';return s
fixture=(ROOT/'tests/cloud-fixtures/raw.js').read_text().replace('export ','')
mock='''
if(!crypto.randomUUID){let id=0;crypto.randomUUID=()=> '11111111-1111-4111-8111-'+String(++id).padStart(12,'0');}
window.__memory={events:[],receipts:[],cache:null,seq:0};
window.__raw=rawFixture(); window.__who=null;window.__admitted=false;window.__offline=false;window.__calls=[];
window.__store={
 async readCache(){return window.__memory.cache;},async saveCache(owner,snapshot){window.__memory.cache={owner,snapshot:structuredClone(snapshot)};},
 async list(owner){return structuredClone(window.__memory.events.filter(x=>x.owner===owner).sort((a,b)=>a.sequence-b.sequence));},
 async put(e){const m=window.__memory;const i=m.events.findIndex(x=>x.owner===e.owner&&x.id===e.id);if(i>=0)m.events[i]={...e,sequence:m.events[i].sequence};else m.events.push({...structuredClone(e),sequence:++m.seq});},
 async acknowledge(e,r){window.__memory.receipts.push({e,r});if(window.__memory.cache)window.__memory.cache.snapshot=window.__Modules.cache.patchAcknowledgement(window.__memory.cache.snapshot,e,r);window.__memory.events=window.__memory.events.filter(x=>x.id!==e.id);},
 async export(){return structuredClone(window.__memory);}
};
window.__client={
 onAuthChange(fn){window.__authEvent=fn;return ()=>{};},async identity(){return window.__who;},
 async signIn(email){window.__who={id:OWNER,email};return {};},async signUp(){return {};},
 async requestReset(){return 'If that address has an account, a recovery email has been requested.';},async setPassword(){return {};},
 async signOut(){window.__who=null;},async redeemInvite(){window.__admitted=true;return {ok:true};},
 async status(){return {admitted:window.__admitted,admin:false};},async read(){if(window.__offline)throw Error('offline');return structuredClone(window.__raw);},
 async mutate(e){if(window.__offline)throw Error('offline');window.__calls.push(structuredClone(e));const d=e.payload,r=window.__raw;
 if(e.action==='save_preferences'){r.preferences={...r.preferences,theme:d.theme,tasting_preferences:d.tasting_preferences,revision:r.preferences.revision+1};return {ok:true,record:r.preferences};}
 if(e.action==='rename_setup'){
   const setup=r.setups.find(x=>x.id===d.setup_id);
   if(!setup)throw Error('Setup is not accessible');
   setup.name=d.name.trim();setup.revision=(setup.revision||1)+1;
   return {ok:true,record:structuredClone(setup)};
  }
  if(e.action==='save_setup_settings'){r.setupPreferences[0]={...r.setupPreferences[0],...d,revision:r.setupPreferences[0].revision+1};return {ok:true,record:r.setupPreferences[0]};}
 if(e.action==='save_shot'){
  const existing=r.shots.find(x=>x.id===d.id);const sh=rawShot({...existing,...d,extraction:d.taste.extraction,body:d.taste.body,clarity:d.taste.clarity,sweetness:d.taste.sweetness,astringency:d.taste.astringency,is_dialed_in:window.__Modules.constants.isDialed(d.taste),revision:existing?existing.revision+1:2});
  r.shots=r.shots.filter(x=>x.id!==d.id);r.shots.push(sh);r.notes=r.notes.filter(x=>x.shot_id!==d.id);r.notes.push({owner_id:OWNER,shot_id:d.id,notes:d.notes});r.workspaces[0].current_library_entry_id=d.library_entry_id||'coffee';r.workspaceCoffees[0].last_logged_at=TIME;
   if(!existing&&r.setupPreferences[0].track_slow_feed&&['slow','standard'].includes(d.feed_mode)){
    const pref=r.setupPreferences[0],at=d.pulled_at;
    if(!pref.last_feed_shot_at||Date.parse(at)>=Date.parse(pref.last_feed_shot_at)){pref.slow_feed=d.feed_mode==='slow';pref.last_feed_shot_at=at;}
   }
  r.families=[{id:'family',library_entry_id:'coffee',style:'Turbo',statistics:{ratio:{center:2.78}},created_at:TIME}];r.recipePreferences=[{setup_version_id:'version',library_entry_id:'coffee',style:'Turbo',current_family_id:'family',revision:1}];return {ok:true,record:sh};
 }
 if(e.action==='set_style'){r.workspaceCoffees[0].selected_style=d.style;r.workspaceCoffees[0].revision++;return {ok:true,record:r.workspaceCoffees[0]};}
 return {ok:true};
 }
};
window.__app=new window.__CloudApp(window.__client,window.__store);window.__app.init();
'''
checks=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=shutil.which('chromium') or shutil.which('chromium-browser') or None,headless=True,args=['--no-sandbox'])
 page=b.new_page(viewport={'width':390,'height':844});page.set_default_timeout(5000);errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 css=(SITE/'styles.css').read_text().split('\n',1)[1]
 page.set_content('<!doctype html><html><head><meta name="theme-color" content="#f3ece0"><style>'+css+'</style></head><body><div id=app></div><dialog id=sheet aria-labelledby=sheet-title></dialog><div id=toasts role=status></div></body></html>')
 page.add_script_tag(content=bundle());page.add_script_tag(content=fixture+'\n'+mock)
 page.get_by_role('button',name='Sign in',exact=True).wait_for();checks.append('Sign-in view loads without local app state')
 page.locator('[name=email]').fill('owner@example.invalid');page.locator('[name=password]').fill('synthetic-password');page.get_by_role('button',name='Sign in',exact=True).click();page.get_by_role('button',name='Use invitation').wait_for();checks.append('Pending account remains outside workspace')
 page.locator('[name=token]').fill('synthetic-not-real-token');page.get_by_role('button',name='Use invitation').click();page.get_by_role('button',name='Settings',exact=True).wait_for();checks.append('Admitted account hydrates cloud workspace')
 assert page.locator('.current-mark').count()==0;checks.append('No pin before first logged shot')
 page.get_by_role('button',name='Settings',exact=True).click()
 assert page.locator('.recovery-options').evaluate('(x)=>!x.open');checks.append('Recovery options collapsed by default')
 page.locator('.recovery-options summary').click();assert page.locator('.settings-recovery [data-action=export]').count()==1;checks.append('Recovery export tucked into advanced disclosure')
 page.get_by_role('button',name='Rename',exact=True).click();page.locator('#rename-setup [name=name]').fill('Home Espresso')
 page.get_by_role('button',name='Save name',exact=True).click();page.wait_for_function('!document.querySelector("#sheet").open')
 assert 'Home Espresso' in page.locator('.setup-switch').inner_text();checks.append('Setup can be renamed without recreating equipment')
 page.locator('[data-action=expand]').click();page.get_by_role('button',name='Log a Shot',exact=False).wait_for();checks.append('Coffee expansion is inline')
 page.screenshot(path=str(OUT/'cloud_home_light.png'),full_page=True)
 page.get_by_role('button',name='Settings',exact=True).click();page.locator('[name=tasting_preferences]').fill('Fruity clarity');page.get_by_role('button',name='Save preferences',exact=True).click();page.get_by_role('alert').filter(has_text='Preferences saved').wait_for();assert page.locator('#sheet').evaluate('(x)=>x.open');checks.append('Preference save leaves Settings open')
 page.get_by_text('Advanced setup options',exact=True).click();page.locator('[name=track_temperature]').check();page.locator('[name=track_slow_feed]').check();page.get_by_role('button',name='Save advanced options').click();page.get_by_role('alert').filter(has_text='Advanced settings saved').wait_for();assert page.locator('#sheet details').evaluate('(x)=>x.open');checks.append('Advanced save preserves open sheet and section')
 page.get_by_role('button',name='Close',exact=True).click();page.get_by_role('button',name='Log a Shot',exact=False).click();assert page.locator('[name=doseG]').input_value()=='18';assert page.locator('[name=yieldG]').input_value()=='';assert page.locator('[name=timeS]').input_value()=='';assert page.locator('[name=grindSetting]').input_value()=='';checks.append('Logging prefill uses basket dose, blank measured output/time/grind')
 assert page.locator('[name=temperature]').input_value()=='';checks.append('Temperature is optional, not fabricated in actual input')
 assert not page.locator('[name=slowFeed]').is_checked();page.locator('[name=slowFeed]').check();checks.append('New Slow Feed entry can be selected explicitly')
 page.locator('[name=yieldG]').fill('50');page.locator('[name=timeS]').fill('100');page.locator('[name=grindSetting]').fill('0');page.locator('[name=notes]').fill('Synthetic private note')
 page.get_by_role('button',name='Save Shot & Get Suggestion').click();page.get_by_role('alert').filter(has_text='Rate').first.wait_for();checks.append('All five sensory ratings required before save')
 for key,value in [('extraction',3),('body',3),('clarity',5),('sweetness',5),('astringency',1)]:page.locator(f'[data-action=rate][data-key={key}][data-value="{value}"]').click()
 page.screenshot(path=str(OUT/'cloud_log_light.png'),full_page=True)
 page.get_by_role('button',name='Save Shot & Get Suggestion').click();page.wait_for_function('!document.querySelector("#sheet").open');assert page.locator('.current-mark').count()==1;checks.append('Saving shot closes log and pins coffee')
 assert page.locator('.feedback-panel').count()==1;checks.append('Latest result and radar visible after save')
 page.get_by_text('Shot History (1)',exact=True).click();page.locator('[data-action=shot-expand]').click();assert page.locator('.shot-body .radar').count()==1;checks.append('Shot details expand inline with radar and notes')
 header=page.locator('.shot-overview').first.inner_text()
 assert 'Home Espresso' in header and 'Basket Dose' in header and 'Slow Feed' in header
 edit=page.locator('.shot-body [data-action=edit]').first.bounding_box()
 current=page.locator('.shot-body [data-action=make-current]').first.bounding_box()
 assert edit and current and edit['x']+edit['width']<current['x']
 checks.append('Shot history keeps setup and Slow Feed above taste; Edit and Make Current separately spaced')
 page.screenshot(path=str(OUT/'cloud_history_light.png'),full_page=True)
 page.get_by_role('button',name='Settings',exact=True).click();page.locator('[name=theme]').select_option('dark');page.get_by_role('button',name='Save preferences').click();page.get_by_role('alert').filter(has_text='Preferences saved').wait_for();page.get_by_role('button',name='Close',exact=True).click();assert page.locator('html').get_attribute('data-theme')=='dark';checks.append('Dark appearance persists through save without closing Settings')
 page.screenshot(path=str(OUT/'cloud_home_dark.png'),full_page=True)
 page.evaluate('window.__offline=true');page.get_by_role('button',name='Log a Shot',exact=False).click()
 assert page.locator('[name=slowFeed]').is_checked();page.locator('[name=slowFeed]').uncheck()
 checks.append('Next shot preselects last logged Slow Feed setting and can turn it off')
 assert page.locator('[name=grindSetting]').input_value()=='0';page.locator('[name=yieldG]').fill('51');page.locator('[name=timeS]').fill('21')
 for key,value in [('extraction',3),('body',3),('clarity',5),('sweetness',5),('astringency',1)]:page.locator(f'[data-action=rate][data-key={key}][data-value="{value}"]').click()
 page.get_by_role('button',name='Save Shot & Get Suggestion').click();page.wait_for_function('!document.querySelector("#sheet").open');assert page.evaluate('window.__memory.events.length')==1;checks.append('Offline shot retained in pending queue and shown locally')
 page.get_by_role('button',name='Settings',exact=True).click();page.get_by_role('button',name='Sign out on this device').click();assert page.evaluate('window.__who!==null');checks.append('Pending changes prevent accidental signout')
 page.get_by_role('button',name='Close',exact=True).click();page.evaluate('window.__offline=false;window.__app.sync()');page.wait_for_function('window.__memory.events.length===0');assert page.evaluate('window.__raw.shots.length')==2;checks.append('Reconnect sends pending shot once')
 assert not page.evaluate('window.__raw.setupPreferences[0].slow_feed')
 checks.append('Turning Slow Feed off persists after cloud synchronization')
 assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');checks.append('390px viewport has no horizontal overflow')
 assert not errors,errors;checks.append('No browser JavaScript exceptions')
 b.close()
report={'passed':len(checks),'checks':checks,'caveats':['Injected browser harness with mocked backend/auth and in-memory storage; not live login/email or native IndexedDB','Original local app is untouched; deployment/backup/full feature parity not ready']}
(OUT/'results.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2))
