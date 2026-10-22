from pathlib import Path
import re,json,shutil
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[2];SITE=ROOT/'site';OUT=ROOT/'qa_artifacts/cloud';OUT.mkdir(parents=True,exist_ok=True)
def bundle():
 s='(()=>{const Modules={};\n'
 def imports(t):
  t=re.sub(r"import \* as (\w+) from ['\"](.+?)['\"];",lambda m:f'const {m[1]}=Modules.{Path(m[2]).stem.replace('-','_')};',t)
  t=re.sub(r"import\s*\{([^}]+)\}\s*from\s*['\"](.+?)['\"];",lambda m:'const {'+m[1]+'}=Modules.'+Path(m[2]).stem.replace('-','_')+';',t)
  return t
 for name in ['constants','model','engine','ui','appearance','client','cache','outbox','mapping','confirmation','shot_card','community','coffee-match-ui','coffee-url-autofill']:
  folder='lib' if name in ['constants','model','engine','ui'] else 'cloud'
  t=(SITE/folder/f'{name}.js').read_text();exports=re.findall(r'export\s+(?:async\s+)?(?:function|const|class|let)\s+(\w+)',t)
  t=re.sub(r'\bexport\s+','',imports(t));s+=f'Modules.{name.replace("-","_")}=(()=>{{\n{t}\nreturn {{{",".join(exports)}}};\n}})();\n'
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
 async listCommunityReviews(){return window.__reviews||[];},async confirmCommunityOutlier(){window.__reviews=[];return {ok:true,state:'eligible'};},
 async browseCommunityShots(){return {shots:window.__communityShots||[],total:(window.__communityShots||[]).length};},

 async editCoffeeDetails(entryId,expected,data,url){
  const r=window.__raw,l=r.library.find(x=>x.id===entryId);
  if(!l)throw Error('Coffee entry not found');
  if(l.submission_id&&!l.coffee_id){
   const sub=r.submissions.find(x=>x.id===l.submission_id);
   if(sub.revision!==expected)return {ok:false,code:'conflict'};
   sub.proposed_data={...sub.proposed_data,...data};sub.source_url=url;
   sub.revision++;return {ok:true,kind:'updated_pending'};
  }
  const canon=r.coffees.find(x=>x.id===l.coffee_id);
  let correction=r.submissions.find(x=>x.canonical_coffee_id===canon.id&&x.status==='pending');
  if(correction){
   if(correction.revision!==expected)return {ok:false,code:'conflict'};
   correction.proposed_data={...data};correction.source_url=url;correction.revision++;
  }else{
   if(canon.revision!==expected)return {ok:false,code:'conflict'};
   correction={id:'12345678-1234-4123-8123-000000000222',owner_id:OWNER,
    canonical_coffee_id:canon.id,base_coffee_revision:canon.revision,
    status:'pending',proposed_data:{...data},source_url:url,revision:1,updated_at:TIME};
   r.submissions.push(correction);
  }
  return {ok:true,kind:'correction_requested'};
 },

 async status(){return {admitted:window.__admitted,admin:false};},async findCoffeeMatches(){return window.__matchResponse||{classification:'new_pending',roaster:{recognized:false}};},async previewCoffeeUrl(){return {ok:false,reason:'unrecognized_official_roaster'};},async verifyCoffeeSource(){return {ok:false,status:'pending',reason:'no_verified_roaster_source'};},async read(){if(window.__offline)throw Error('offline');return structuredClone(window.__raw);},
 async mutate(e){if(window.__offline)throw Error('offline');window.__calls.push(structuredClone(e));const d=e.payload,r=window.__raw;
 if(e.action==='submit_coffee'){
  const submission='11111111-1111-4111-8111-000000000099';
  r.submissions.push({id:submission,owner_id:OWNER,status:'pending',proposed_data:d.proposed_data,source_url:d.source_url,revision:1,created_at:TIME});
  r.library.push({id:d.library_entry_id,owner_id:OWNER,submission_id:submission,coffee_id:null,created_at:TIME});
  return {ok:true,library_entry_id:d.library_entry_id,submission_id:submission};
 }
 if(e.action==='add_verified_coffee'){
  let entry=r.library.find(x=>x.coffee_id===d.coffee_id);
  if(!entry){entry={id:d.library_entry_id,owner_id:OWNER,coffee_id:d.coffee_id,submission_id:null,created_at:TIME};r.library.push(entry);}
  return {ok:true,library_entry_id:entry.id};
 }
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
 if(e.action==='make_current'){
  const sh=r.shots.find(x=>x.id===d.shot_id);
  const pref=sh?r.recipePreferences.find(x=>x.library_entry_id===sh.library_entry_id&&
   x.setup_version_id===sh.setup_version_id&&x.style===sh.style):null;
  if(!sh||!sh.is_dialed_in||sh.hidden_at||!pref||pref.revision!==d.expected_revision)
   return {ok:false,code:'conflict'};
  pref.current_family_id=sh.personal_family_id;pref.favorite_shot_id=sh.id;pref.revision++;
  return {ok:true,record:structuredClone(pref)};
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
 css=(SITE/'styles.css').read_text().split('\n',1)[1]+'\n'+(SITE/'visual.css').read_text()
 page.set_content('<!doctype html><html><head><meta name="theme-color" content="#f3ece0"><style>'+css+'</style></head><body><div id=app></div><dialog id=sheet aria-labelledby=sheet-title></dialog><div id=toasts role=status></div></body></html>')
 page.add_script_tag(content=bundle());page.add_script_tag(content=fixture+'\n'+mock)
 try:
  page.get_by_role('button',name='Sign In',exact=True).wait_for()
 except Exception:
  print('BOOT BODY:',page.locator('body').inner_text()[:1800])
  print('BOOT PAGE ERRORS:',errors)
  print('BUNDLE START:',bundle()[:1000])
  raise
 checks.append('Sign-in view loads without local app state')
 page.locator('[name=email]').fill('owner@example.invalid');page.locator('[name=password]').fill('synthetic-password');page.get_by_role('button',name='Sign In',exact=True).click();page.get_by_role('button',name='Use Invitation').wait_for();checks.append('Pending account remains outside workspace')
 page.locator('[name=token]').fill('synthetic-not-real-token');page.get_by_role('button',name='Use Invitation').click();page.get_by_role('button',name='Settings',exact=True).wait_for();checks.append('Admitted account hydrates cloud workspace')
 assert page.locator('.current-mark').count()==0;checks.append('No pin before first logged shot')
 page.get_by_role('button',name='Settings',exact=True).click()
 assert page.locator('.recovery-options').count()==0;checks.append('Routine Recovery section removed as approved')
 assert page.locator('.settings-signout').count()==1;checks.append('Sign Out follows Cloud Sync in Settings')
 assert page.locator('#claude-key-options').count()==0;checks.append('Removed AI settings stay absent on mobile')
 # Regression for the real approved New Setup control. Source-string checks
 # alone previously said this was "done" without opening it on a phone.
 page.get_by_role('button',name='Add Another Setup').click()
 assert page.locator('#sheet-title').inner_text()=='New Setup'
 assert page.locator('#new-setup #grinder-range-heading').inner_text()=='Grinder Espresso Range'
 info=page.locator('#new-setup [data-action="grinder-range-info"]')
 assert info.count()==1 and info.is_visible()
 assert info.get_attribute('aria-expanded')=='false'
 assert page.locator('#grinder-range-description').is_hidden()
 assert page.locator('#new-setup [name="finest_setting"]').count()==1
 assert page.locator('#new-setup [name="coarsest_setting"]').count()==1
 assert page.locator('#new-setup [name="basket_dose_g"]').count()==1
 info.click()
 assert info.get_attribute('aria-expanded')=='true'
 assert page.locator('#grinder-range-description').is_visible()
 assert page.locator('#grinder-range-description').inner_text()=="Enter the range of grind settings you would normally use for espresso, not the grinder's entire adjustment range."
 page.screenshot(path=str(OUT/'cloud_new_setup_info_open_390px.png'),full_page=True)
 info.click()
 assert info.get_attribute('aria-expanded')=='false'
 assert page.locator('#grinder-range-description').is_hidden()
 assert page.locator('#new-setup [name="finest_setting"]').input_value()==''
 assert page.locator('#new-setup [name="coarsest_setting"]').input_value()==''
 page.locator('#sheet [data-action="close"]').click()
 page.get_by_role('button',name='Settings',exact=True).click()
 checks.append('Real 390px New Setup grinder i opens and closes exact help, preserves inputs; no setup created')
 page.get_by_role('button',name='Rename',exact=True).click();page.locator('#rename-setup [name=name]').fill('Home Espresso')
 page.get_by_role('button',name='Save Name',exact=True).click();page.wait_for_function('!document.querySelector("#sheet").open')
 assert 'Home Espresso' in page.locator('.setup-switch').inner_text();checks.append('Setup can be renamed without recreating equipment')
 page.locator('[data-action=expand]').click();page.get_by_role('button',name='Log A Shot',exact=False).wait_for();checks.append('Coffee expansion is inline')
 page.screenshot(path=str(OUT/'cloud_home_light.png'),full_page=True)
 page.get_by_role('button',name='Settings',exact=True).click();page.locator('[name=tasting_preferences]').fill('Fruity clarity');page.get_by_role('button',name='Save Preferences',exact=True).click();page.get_by_role('alert').filter(has_text='Preferences saved').wait_for();assert page.locator('#sheet').evaluate('(x)=>x.open');checks.append('Preference save leaves Settings open')
 page.get_by_text('Advanced Setup Options',exact=True).click();page.locator('[name=track_temperature]').check();page.locator('[name=track_slow_feed]').check();page.get_by_role('button',name='Save Advanced Options').click();page.get_by_role('alert').filter(has_text='Advanced settings saved').wait_for();assert page.locator('#sheet details.advanced:has(summary:text-is("Advanced Setup Options"))').evaluate('(x)=>x.open');checks.append('Advanced save preserves open sheet and section')
 page.get_by_role('button',name='Close',exact=True).click();page.get_by_role('button',name='Log A Shot',exact=False).click();assert page.locator('[name=doseG]').input_value()=='18';assert page.locator('[name=yieldG]').input_value()=='';assert page.locator('[name=timeS]').input_value()=='';assert page.locator('[name=grindSetting]').input_value()=='';checks.append('Logging prefill uses basket dose, blank measured output/time/grind')
 assert page.locator('[name=temperature]').input_value()=='';checks.append('Temperature is optional, not fabricated in actual input')
 assert not page.locator('[name=slowFeed]').is_checked();page.locator('[name=slowFeed]').check();checks.append('New Slow Feed entry can be selected explicitly')
 page.locator('[name=yieldG]').fill('50');page.locator('[name=timeS]').fill('100');page.locator('[name=grindSetting]').fill('0');page.locator('[name=notes]').fill('Synthetic private note')
 page.get_by_role('button',name='Save Shot & Get Suggestion').click();page.get_by_role('alert').filter(has_text='Rate').first.wait_for();checks.append('All five sensory ratings required before save')
 for key,value in [('extraction',3),('body',3),('clarity',5),('sweetness',5),('astringency',1)]:page.locator(f'[data-action=rate][data-key={key}][data-value="{value}"]').click()
 page.screenshot(path=str(OUT/'cloud_log_light.png'),full_page=True)
 page.get_by_role('button',name='Save Shot & Get Suggestion').click();page.wait_for_function('!document.querySelector("#sheet").open');assert page.locator('.current-mark').count()==1;checks.append('Saving shot closes log and pins coffee')
 assert page.locator('.feedback-panel').count()==1;checks.append('Latest result and radar visible after save')
 page.get_by_text('Shot History (1)',exact=True).click();page.locator('[data-action=shot-expand]').click();assert page.locator('.shot-body .radar').count()==1;checks.append('Shot details expand inline with radar and notes')
 assert page.locator('.shot-body [data-action=hide-shot]').count()==0 and page.get_by_role('button',name='Hide Shot',exact=True).count()==0
 checks.append('Shot History retains Edit/Make Current but has no Hide Shot control')
 header=page.locator('.shot-overview').first.inner_text()
 assert 'Home Espresso' not in header and 'Basket Dose' not in header and 'Slow Feed' not in header
 assert page.locator('.shot-record-context').get_by_text('Home Espresso',exact=True).count()==1
 assert page.locator('.shot-record-context').get_by_text('Slow Feed',exact=True).count()==1
 assert page.locator('.shot-record-context').get_by_text('Basket Dose',exact=True).count()==1
 edit=page.locator('.shot-body [data-action=edit]').first.bounding_box()
 current=page.locator('.shot-body [data-action=make-current]').first.bounding_box()
 assert edit and current and edit['x']+edit['width']<current['x'] and abs(edit['y']-current['y'])<5
 checks.append('Shot history keeps compact bottom-row Edit and Make Current buttons and equipment context')
 page.screenshot(path=str(OUT/'cloud_history_light.png'),full_page=True)
 page.get_by_role('button',name='Settings',exact=True).click();page.locator('[name=theme]').select_option('dark');page.get_by_role('button',name='Save Preferences').click();page.get_by_role('alert').filter(has_text='Preferences saved').wait_for();page.get_by_role('button',name='Close',exact=True).click();assert page.locator('html').get_attribute('data-theme')=='dark';checks.append('Dark appearance persists through save without closing Settings')
 page.screenshot(path=str(OUT/'cloud_home_dark.png'),full_page=True)
 page.evaluate('window.__offline=true');page.get_by_role('button',name='Log A Shot',exact=False).click()
 assert page.locator('[name=slowFeed]').is_checked();page.locator('[name=slowFeed]').uncheck()
 checks.append('Next shot preselects last logged Slow Feed setting and can turn it off')
 assert page.locator('[name=grindSetting]').input_value()=='0';page.locator('[name=yieldG]').fill('51');page.locator('[name=timeS]').fill('21')
 for key,value in [('extraction',3),('body',3),('clarity',5),('sweetness',5),('astringency',1)]:page.locator(f'[data-action=rate][data-key={key}][data-value="{value}"]').click()
 page.get_by_role('button',name='Save Shot & Get Suggestion').click();page.wait_for_function('!document.querySelector("#sheet").open');assert page.evaluate('window.__memory.events.length')==1;checks.append('Offline shot retained in pending queue and shown locally')
 page.get_by_role('button',name='Settings',exact=True).click();page.get_by_role('button',name='Sign Out On This Device').click();assert page.evaluate('window.__who!==null');checks.append('Pending changes prevent accidental signout')
 page.get_by_role('button',name='Close',exact=True).click();page.evaluate('window.__offline=false;window.__app.sync()');page.wait_for_function('window.__memory.events.length===0');assert page.evaluate('window.__raw.shots.length')==2;checks.append('Reconnect sends pending shot once')
 assert not page.evaluate('window.__raw.setupPreferences[0].slow_feed')
 checks.append('Turning Slow Feed off persists after cloud synchronization')
 page.evaluate("""window.__matchResponse={
    classification:'needs_confirmation',exact_id:null,
    roaster:{recognized:true,canonical_name:'Sweet Bloom'},
    candidates:[{id:'12345678-1234-4123-8123-123456789abc',name:'Wuri',roaster:'Sweet Bloom',release_label:'2026 harvest',origin:'Gedeb'}]
  }""")
 page.get_by_role('button',name='Add Coffee',exact=False).click()
 page.locator('#new-coffee [name=name]').fill('Wuri')
 page.locator('#new-coffee [name=roaster]').fill('Sweet-Bloom')
 page.locator('#new-coffee [name=release_label]').fill('2027 harvest')
 old_submission_count=page.evaluate('window.__raw.submissions.length')
 page.locator('#new-coffee').get_by_role('button',name='Add Coffee',exact=True).click()
 assert page.locator('#sheet-title').inner_text()=='Check For An Existing Coffee'
 assert page.evaluate('window.__raw.submissions.length')==old_submission_count
 assert page.locator('[data-action=choose-coffee-match]').count()==1
 checks.append('A likely duplicate prompts confirmation rather than writing or merging')
 page.get_by_role('button',name='This Is A Different Coffee').click()
 page.wait_for_function('!document.querySelector("#sheet").open')
 assert page.evaluate('window.__raw.submissions.length')==old_submission_count+1
 assert page.evaluate('window.__raw.submissions.at(-1).proposed_data.roaster')=='Sweet Bloom'
 assert page.evaluate('window.__raw.submissions.at(-1).proposed_data.release_label')=='2027 harvest'
 checks.append('Different release stays Pending under the recognized canonical roaster')
 # Pending coffee details edit saves to this member's original submission only.
 pending_lid=page.evaluate('window.__raw.library.at(-1).id')
 pending_sel=f'[data-retain="facts-{pending_lid}"]'
 page.locator(f'[data-action=expand][data-id="{pending_lid}"][aria-expanded=false]').count() and page.locator(f'[data-action=expand][data-id="{pending_lid}"]').click()
 page.locator(pending_sel+' summary').click()
 page.locator(f'[data-action=edit-coffee][data-id="{pending_lid}"]').click()
 assert page.locator('#sheet-title').inner_text()=='Edit Coffee Details'
 page.locator('#edit-coffee [name=producer]').fill('Edited Producer')
 page.locator('#edit-coffee').get_by_role('button',name='Save Coffee Details').click()
 page.wait_for_function('!document.querySelector("#sheet").open')
 assert page.evaluate('window.__raw.submissions.find(x=>x.id===window.__raw.library.at(-1).submission_id).proposed_data.producer')=='Edited Producer'
 checks.append('Edit Coffee updates original Pending owner submission and preserves entry identity')

 page.evaluate("""window.__raw.coffees.push({id:'12345678-1234-4123-8123-123456789abc',name:'Wuri',roaster:'Sweet Bloom',origin:'Gedeb',verification_state:'verified',revision:1});window.__matchResponse={classification:'exact_verified',exact_id:'12345678-1234-4123-8123-123456789abc',roaster:{recognized:true,canonical_name:'Sweet Bloom'},candidates:[]};""")
 page.get_by_role('button',name='Add Coffee',exact=False).click()
 page.locator('#new-coffee [name=name]').fill('Wuri')
 page.locator('#new-coffee [name=roaster]').fill('Sweet Bloom Coffee Roasters')
 page.locator('#new-coffee').get_by_role('button',name='Add Coffee',exact=True).click()
 page.wait_for_function('!document.querySelector("#sheet").open')
 assert page.evaluate('window.__raw.submissions.length')==old_submission_count+1
 assert page.evaluate('window.__raw.library.some(x=>x.coffee_id==="12345678-1234-4123-8123-123456789abc")')
 checks.append('Exact verified coffee reuses canonical ID without new Pending submission')
 # A verified coffee is editable through a source-review correction request,
 # never a silent overwrite of the canonical catalog shared by everyone.
 verified_lid=page.evaluate("""window.__raw.library.find(x=>x.coffee_id==='12345678-1234-4123-8123-123456789abc').id""")
 page.locator(f'[data-action=expand][data-id="{verified_lid}"][aria-expanded=false]').count() and page.locator(f'[data-action=expand][data-id="{verified_lid}"]').click()
 page.locator(f'[data-retain="facts-{verified_lid}"] summary').click()
 page.locator(f'[data-action=edit-coffee][data-id="{verified_lid}"]').click()
 actual_title=page.locator('#sheet-title').inner_text()
 assert actual_title=='Suggest Coffee Corrections',{'title':actual_title,'verified_lid':verified_lid,'raw_coffee':page.evaluate("window.__raw.library.find(x=>x.id==="+repr(verified_lid)+")"),'app_coffee':page.evaluate("window.__app.raw?.library?.find(x=>x.id==="+repr(verified_lid)+")")}
 page.locator('#edit-coffee [name=producer]').fill('Correction Producer')
 page.locator('#edit-coffee').get_by_role('button',name='Submit Correction For Review').click()
 page.wait_for_function('!document.querySelector("#sheet").open')
 assert page.evaluate("""window.__raw.coffees.find(x=>x.id==='12345678-1234-4123-8123-123456789abc').producer""")!= 'Correction Producer'
 assert page.evaluate("""window.__raw.submissions.some(x=>x.canonical_coffee_id==='12345678-1234-4123-8123-123456789abc'&&x.status==='pending'&&x.proposed_data.producer==='Correction Producer')""")
 checks.append('Verified coffee correction requests preserve canonical facts and shot history')


 # Community uses one card per coffee; opening it reveals compact anonymous
 # shot rows, each with independent native inline rating/evidence expansion.
 page.evaluate("""async () => {
   window.__communityShots=[
    {
     coffee_name:'Yirgacheffe',roaster:'Orinoco Coffee & Tea',style:'Turbo',
     release_key:'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
     release_label:'2025 Harvest',release_origin:'Ethiopia',release_process:'Washed',
     observed_on:'2026-10-17',dose_g:18,yield_g:50.1,time_s:21.8,ratio:2.783,
     extraction:3,body:3,clarity:5,sweetness:5,astringency:1,
     shot_count:2,contributor_count:1,owner_id:'SECRET-OWNER',notes:'SECRET-PRIVATE-NOTE'
    },
    {
     coffee_name:'Yirgacheffe',roaster:'Orinoco Coffee & Tea',style:'Turbo',
     release_key:'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
     release_label:'2026 Harvest',release_origin:'Ethiopia',release_process:'Natural',
     observed_on:'2026-10-16',dose_g:18,yield_g:49.8,time_s:21.1,ratio:2.7667,
     extraction:3,body:3,clarity:5,sweetness:5,astringency:1,
     shot_count:2,contributor_count:1
    },
    {
     coffee_name:'Other',roaster:'Example Roaster',style:'Traditional',
     observed_on:'2026-10-15',dose_g:18,yield_g:38,time_s:28,ratio:2.111,
     extraction:3,body:3,clarity:5,sweetness:5,astringency:1,
     shot_count:1,contributor_count:1
    }
   ];
   await window.__app.sync();
 }""")
 private_shots_open_before=page.evaluate('window.__app.shotExpanded.size')
 page.locator('[data-action=community]').click()
 page.locator('details.community-coffee-card').first.wait_for()
 assert page.locator('details.community-coffee-card').count()==2
 assert page.locator('details.community-shot').count()==3
 assert page.locator('details.community-coffee-card[open]').count()==0
 assert page.locator('details.community-shot[open]').count()==0
 assert page.locator('details.community-shot:visible').count()==0
 checks.append('Community starts with one collapsed coffee card per verified coffee')
 coffee=page.locator('details.community-coffee-card').filter(has_text='Yirgacheffe')
 assert coffee.count()==1 and '2 shots' in coffee.inner_text()
 coffee.locator(':scope > summary').click()
 assert coffee.evaluate('(el)=>el.open')
 assert coffee.locator('details.community-shot:visible').count()==2
 assert coffee.locator('section.community-release').count()==2
 assert '2025 Harvest' in coffee.locator('section.community-release').first.inner_text()
 assert '2026 Harvest' in coffee.locator('section.community-release').nth(1).inner_text()
 assert coffee.locator('section.community-release').first.locator('details.community-shot').count()==1
 assert coffee.locator('section.community-release').nth(1).locator('details.community-shot').count()==1
 assert coffee.locator('details.community-shot[open]').count()==0
 checks.append('One tap reveals two release-specific sections and both compact shot rows; ratings remain closed')
 page.screenshot(path=str(OUT/'community_coffee_compact_mobile.png'),full_page=True)
 first=coffee.locator('details.community-shot').first
 second=coffee.locator('details.community-shot').nth(1)
 first.locator(':scope > summary').click()
 assert first.evaluate('(el)=>el.open')
 assert first.locator('.community-rating-grid').is_visible()
 assert '2 qualifying shots' in first.inner_text()
 assert not second.evaluate('(el)=>el.open')
 second.locator(':scope > summary').click()
 assert first.evaluate('(el)=>el.open') and second.evaluate('(el)=>el.open')
 checks.append('Each Community shot expands separately and two shot details can stay open')
 # Existing app render preservation applies to Community native disclosures.
 page.evaluate('window.__app.render()')
 coffee=page.locator('details.community-coffee-card').filter(has_text='Yirgacheffe')
 assert coffee.evaluate('(el)=>el.open')
 assert coffee.locator('details.community-shot[open]').count()==2
 checks.append('Grouped coffee and individually expanded shots survive ordinary rerenders')
 assert 'SECRET-OWNER' not in page.locator('.community-page').inner_text()
 assert 'SECRET-PRIVATE-NOTE' not in page.locator('.community-page').inner_text()
 checks.append('Community cards omit private member IDs and notes even if added to an untrusted fixture')
 page.screenshot(path=str(OUT/'community_eligible_mobile.png'),full_page=True)
 # Native details are keyboard-toggleable; Coffee filter still scopes the groups.
 coffee.locator(':scope > summary').focus()
 page.keyboard.press('Enter')
 assert not coffee.evaluate('(el)=>el.open')
 page.keyboard.press('Enter')
 assert coffee.evaluate('(el)=>el.open')
 checks.append('Community coffee group is keyboard-operable without custom click handlers')
 page.locator('#community-style').select_option('Traditional')
 assert page.locator('details.community-coffee-card').count()==1
 assert 'Other' in page.locator('details.community-coffee-card').inner_text()
 page.locator('#community-style').select_option('all')
 page.locator('#community-coffee').select_option(label='Orinoco Coffee & Tea · Yirgacheffe')
 assert page.locator('details.community-coffee-card').count()==1
 assert page.locator('details.community-shot').count()==2
 page.locator('#community-coffee').select_option('all')
 checks.append('Style and coffee filters keep shots grouped under their exact public coffee')
 assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
 page.locator('[data-action=home]').click()
 assert page.evaluate('window.__app.shotExpanded.size')==private_shots_open_before
 checks.append('Personal Coffee shot expansion state remains unchanged by Community browsing')

 page.evaluate("""async () => {
   const sh=window.__raw.shots[0];
   window.__reviews=[{shot_id:sh.id,revision:sh.revision,
    coffee_name:'Yirgacheffe',roaster:'Orinoco Coffee & Tea',
    style:'Turbo',dose_g:18,yield_g:49.8,time_s:62}];
   await window.__app.sync();
 }""")
 page.locator('.community-review-prompt').wait_for()
 assert page.locator('#community-required-review').evaluate('(d)=>d.open')
 assert page.locator('#community-required-review [data-action=community-dismiss-outlier]').count()==0
 checks.append('Held shot opens mandatory modal without Later and cannot dismiss it')
 assert page.locator('[data-action=community-confirm-outlier]').count()==1
 assert page.locator('[data-action=community-correct-outlier]').count()==1
 checks.append('Member sees nonblocking outlier confirmation/correction prompt')
 page.screenshot(path=str(OUT/'community_review_mobile.png'),full_page=True)
 # Correction uses the existing revision-checked shot form; merely opening it
 # cannot mutate any shot or publish anything.
 original_time=page.evaluate("window.__raw.shots[0].time_s")
 page.locator('[data-action=community-correct-outlier]').click()
 page.locator('#shot [name=timeS]').wait_for()
 assert page.locator('#sheet-title').inner_text()=='Edit Shot'
 assert abs(float(page.locator('#shot [name=timeS]').input_value())-original_time)<0.01
 assert page.evaluate("window.__raw.shots[0].time_s")==original_time
 page.locator('#sheet [data-action=close]').click()
 page.wait_for_function('!document.querySelector("#sheet").open')
 page.locator('.community-review-prompt').wait_for()
 checks.append('Correct Shot opens original revision-checked form without changing data before Save')
 assert page.locator('#community-required-review').evaluate('(d)=>d.open'), 'Closing Edit returns to mandatory review'
 # A network error must never disable Confirm indefinitely or route its
 # message to a stale, closed Edit Shot form behind the mandatory dialog.
 page.evaluate("""window.__confirmOriginal=window.__client.confirmCommunityOutlier;
  window.__client.confirmCommunityOutlier=async()=>{throw Error('Temporary review outage');};
  true;""")
 page.locator('#community-required-review [data-action=community-confirm-outlier]').click()
 page.locator('#community-required-review [role=alert]').filter(has_text='Temporary review outage').wait_for()
 assert page.locator('#community-required-review [data-action=community-confirm-outlier]').is_enabled()
 assert page.locator('#community-required-review').evaluate('(d)=>d.open')
 checks.append('Required review reports transient failure visibly and allows a safe retry')
 page.evaluate("window.__client.confirmCommunityOutlier=window.__confirmOriginal; true")
 page.locator('[data-action=community-confirm-outlier]').click()
 page.wait_for_function('!document.querySelector(".community-review-prompt")')
 checks.append('Confirmed member outlier resolves inline prompt without changing ordinary shot flow')

 # One visible recipe despite distinct internal successful families. The
 # first auto-Current is not an explicit favorite; changing stated preferences
 # changes automatic selection without mutating any production-style records.
 page.evaluate("""() => {
  const r=rawFixture();r.preferences.tasting_preferences='bright citrus clarity';
  r.families=[
   {id:'family-short',library_entry_id:'coffee',style:'Turbo',statistics:{ratio:{center:2.0}},created_at:TIME},
   {id:'family-long',library_entry_id:'coffee',style:'Turbo',statistics:{ratio:{center:2.8}},created_at:TIME}
  ];
  r.recipePreferences=[{setup_id:'setup',setup_version_id:'version',
   library_entry_id:'coffee',style:'Turbo',current_family_id:'family-short',revision:2}];
  r.shots=[
   rawShot({id:'short-a',personal_family_id:'family-short',yield_g:36,time_s:23,feed_mode:'standard'}),
   rawShot({id:'short-b',personal_family_id:'family-short',yield_g:37,time_s:24,feed_mode:'standard',pulled_at:'2026-10-02T12:00:00Z'}),
   rawShot({id:'long-a',personal_family_id:'family-long',yield_g:50,time_s:20,feed_mode:'standard',pulled_at:'2026-10-03T12:00:00Z'}),
   rawShot({id:'long-b',personal_family_id:'family-long',yield_g:52,time_s:22,feed_mode:'standard',pulled_at:'2026-10-04T12:00:00Z'})
  ];
  window.__raw=r;window.__app.raw=structuredClone(r);
  window.__app.state=window.__Modules.mapping.hydrate(window.__app.raw);
  window.__app.view='coffees';window.__app.expanded.add('coffee');window.__app.render();
 }""")
 assert page.locator('.alternate-recipes, [data-action="choose-family"]').count()==0
 assert page.locator('.recipe-grid').count()==1
 assert '1:2.83' in page.locator('.recipe-grid').first.inner_text()
 assert page.evaluate("window.__raw.recipePreferences[0].current_family_id")=='family-short'
 assert page.evaluate("window.__raw.recipePreferences[0].favorite_shot_id")==None
 checks.append('Two successful families yield one visible, clarity-matched recipe without a preference write')
 page.evaluate("window.__app.state.preferences='rich body syrupy';window.__app.render()")
 assert '1:2.03' in page.locator('.recipe-grid').first.inner_text()
 page.evaluate("window.__app.state.preferences='bright citrus clarity';window.__app.render()")
 assert '1:2.83' in page.locator('.recipe-grid').first.inner_text()
 checks.append('Changing local preference adjusts only the automatic family choice')
 page.get_by_text('Shot History (4)',exact=True).click()
 page.locator('[data-action="shot-expand"][data-id="short-b"]').click()
 assert page.locator('.shot-body [data-action="make-current"][data-id="short-b"]').count()==1
 page.locator('.shot-body [data-action="make-current"][data-id="short-b"]').click()
 page.wait_for_function("window.__raw.recipePreferences[0].favorite_shot_id==='short-b'")
 page.wait_for_function("window.__app.state.setups[0].workspaces.version.coffees.coffee.currentFamilies.Turbo==='family-short'")
 assert '1:2.03' in page.locator('.recipe-grid').first.inner_text()
 assert len(page.evaluate("window.__raw.shots"))==4
 assert page.locator('.alternate-recipes').count()==0
 checks.append('Explicit Make Current preference overrides clarity heuristic and preserves both families and all shot records')

 # Sixth style must be an actual user choice and survive a server-style save.
 page.locator('.style-row [data-action="style"]').first.click()
 assert page.locator('#style select[name=style] option[value="Fast-Flow"]').count()==1
 page.locator('#style select[name=style]').select_option('Fast-Flow')
 page.locator('#style button.primary').click()
 page.wait_for_function('!document.querySelector("#sheet").open')
 assert page.locator('.style-row .style-fast-flow').count()==1
 assert page.evaluate("window.__raw.workspaceCoffees[0].selected_style")=='Fast-Flow'
 page.locator('[data-action=log]').first.click()
 assert 'Fast-Flow' in page.locator('#shot .recipe-label').inner_text()
 page.get_by_role('button',name='Close',exact=True).click()
 checks.append('390px browser: sixth Fast-Flow style selected, saved to workspace and retained in new shot draft')

 # Account switches must not reuse a previous account's still-running sync.
 switch=page.evaluate("""async () => {
   const app=window.__app,previous=app.identity,prevEpoch=app.epoch,original=app.doSync;
   let releaseOld,firstRuns=0,nextRuns=0;
   app.doSync=()=>{firstRuns++;return new Promise(resolve=>{releaseOld=resolve;});};
   const first=app.sync(),duplicate=app.sync();
   app.identity={id:'other-synthetic-owner'};app.epoch++;
   app.doSync=async()=>{nextRuns++;};
   const switched=app.sync();
   releaseOld();
   await Promise.all([first,duplicate,switched]);
   app.identity=previous;app.epoch=prevEpoch;app.doSync=original;
   return {firstRuns,nextRuns,clear:app.flushing===null};
  }""")
 assert switch=={'firstRuns':1,'nextRuns':1,'clear':True},switch
 checks.append('Cross-account inflight synchronization never satisfies the next account cache refresh')
 # Responsive regression: shot text, borders, chart and badges must fit at phone/tablet sizes.
 for width in [320,360,375,390,430,768]:
  page.set_viewport_size({'width':width,'height':850})
  page.evaluate("window.__app.view='coffees';window.__app.expanded.add('coffee');window.__app.shotExpanded.add('short-b');window.__app.render()")
  page.get_by_text('Shot History (4)',exact=True).click() if not page.locator('.shot-toggle').count() else None
  assert page.locator('.shot-numbers').count()>0
  detail=page.locator('.shot-numbers').first
  assert detail.evaluate("(el)=>getComputedStyle(el).whiteSpace!=='nowrap' && getComputedStyle(el).overflowX!=='auto'")
  assert detail.evaluate("(el)=>el.scrollWidth<=el.clientWidth+2"),f'Shot summary clipped at {width}px'
  assert page.evaluate("document.documentElement.scrollWidth<=innerWidth+1"),f'Page overflow at {width}px'
  assert page.locator('.shot').first.evaluate("(el)=>{const r=el.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1}"),f'Card border overflow at {width}px'
  checks.append(f'{width}px: shot summary, Grind and card border fit without clipping')
 # Enlarged text must reflow instead of showing a hidden horizontal strip.
 page.set_viewport_size({'width':320,'height':850})
 detail=page.locator('.shot-numbers').first
 detail.evaluate("(el)=>el.style.fontSize='21px'")
 assert detail.evaluate("(el)=>el.scrollWidth<=el.clientWidth+2")
 assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
 checks.append('320px with enlarged shot text keeps the full measurement line readable')
 page.set_viewport_size({'width':390,'height':844})
 assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');checks.append('390px viewport has no horizontal overflow')
 assert not errors,errors;checks.append('No browser JavaScript exceptions')
 b.close()
report={'passed':len(checks),'checks':checks,'caveats':['Injected browser harness with mocked backend/auth and in-memory storage; not live login/email or native IndexedDB','Original local app is untouched; deployment/backup/full feature parity not ready']}
(OUT/'results.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2))
