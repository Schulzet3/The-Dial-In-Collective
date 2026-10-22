"""Private browser screenshots of actual app code with isolated synthetic accounts.
No live Supabase/Netlify request, screenshot-specific UI, or production mutation.
Optional DIC_FONT_DIR supplies private rendering fonts (never published as artifacts).
"""
from pathlib import Path
import os,json,base64,re,shutil
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[2]; SITE=ROOT/'site'
OUT=Path(os.environ.get('DIC_SCREENSHOT_DIR',str(ROOT/'qa_artifacts/visual-review')));OUT.mkdir(parents=True,exist_ok=True)
FONT_DIR=Path(os.environ.get('DIC_FONT_DIR','/mnt/data/dic-render-assets'))
# Use the existing synthetic CloudApp adapter; its imports are bundled unchanged.
base=(ROOT/'tests/browser/cloud_owner_qa.py').read_text().split('checks=[]')[0]
ctx={'__file__':str(ROOT/'tests/browser/cloud_owner_qa.py')};exec(base,ctx)
style=(SITE/'styles.css').read_text().split('\n',1)[1]+'\n'+(SITE/'visual.css').read_text()
font_css=''
for family,file in [('Fraunces','Fraunces.ttf'),('JetBrains Mono','JetBrainsMono.ttf')]:
 p=FONT_DIR/file
 if p.exists():font_css+=f"@font-face{{font-family:'{family}';src:url(data:font/ttf;base64,{base64.b64encode(p.read_bytes()).decode()}) format('truetype');font-weight:100 900;font-style:normal;font-display:block;}}\n"
setup='''
window.__admitted=true;window.__who={id:OWNER,email:'review@example.invalid'};
window.__client.status=async()=>({authenticated:true,admitted:true,admin:true,emailVerified:true});
window.__raw.preferences.theme=MODE;
window.__raw.preferences.tasting_preferences='Sweet, balanced espresso with fruit-forward clarity.';
window.__raw.setups[0].name='Home Espresso';
window.__raw.setupPreferences[0].track_temperature=true;
window.__raw.setupPreferences[0].track_slow_feed=true;
window.__raw.setupPreferences[0].slow_feed=true;
window.__raw.submissions[0].proposed_data={name:'Yirgacheffe',roaster:'Example Roaster',origin:'Yirgacheffe, Ethiopia',roast_level:'Light-Medium',elevation_m:'1700-2200',process:'Washed',variety:'Heirloom',tasting_notes:'Berries, floral, citrus'};
window.__raw.submissions[0].status='approved';
window.__raw.coffees=[{id:'verified-coffee',name:'Yirgacheffe',roaster:'Example Roaster',origin:'Yirgacheffe, Ethiopia',roast_level:'Light-Medium',process:'Washed',variety:'Heirloom',tasting_notes:'Berries, floral, citrus',verification_state:'verified'}];
window.__raw.library[0].coffee_id='verified-coffee';
window.__raw.workspaces[0].current_library_entry_id='coffee';
window.__raw.shots=[rawShot({id:'review-a',grind_setting:1,temperature_c:89.4,feed_mode:'slow',pulled_at:'2026-10-14T14:00:00Z'}),rawShot({id:'review-b',yield_g:51,time_s:23,grind_setting:1,temperature_c:89.4,feed_mode:'slow',pulled_at:'2026-10-13T14:00:00Z'}),rawShot({id:'review-c',yield_g:36.5,time_s:30.5,grind_setting:.4,style:'Traditional',temperature_c:89.4,feed_mode:'standard',personal_family_id:'trad-family',pulled_at:'2026-10-12T14:00:00Z'})];
window.__raw.notes=[{owner_id:OWNER,shot_id:'review-a',notes:'Sweet berry finish with a clean, silky body.'}];
window.__raw.families=[{id:'family',library_entry_id:'coffee',style:'Turbo',statistics:{ratio:{center:2.8}},created_at:TIME}];
window.__raw.recipePreferences=[{setup_version_id:'version',library_entry_id:'coffee',style:'Turbo',current_family_id:'family',revision:1}];
window.__raw.submissions.push({id:'sub-two',proposed_data:{name:'Honey Process',roaster:'Example Roaster',origin:'Costa Rica',roast_level:'Medium'},status:'pending'});
window.__raw.library.push({id:'coffee-two',owner_id:OWNER,submission_id:'sub-two',created_at:TIME});
window.__app.identity=window.__who;window.__app.connect();
'''
checks=[];errors=[];manifest=[]
def check(condition,label):
 assert condition,label
 checks.append(label)
def fonts(page):
 page.evaluate('()=>document.fonts.ready');page.wait_for_timeout(60)
def shot(page,name,selector=None):
 fonts(page)
 dest=OUT/(name+'.png')
 if selector:
  # Resize the review viewport to capture all modal content, then reset scroll.
  height=page.locator('.sheet-content').evaluate('(e)=>e.scrollHeight')+page.locator('.sheet-header').evaluate('(e)=>e.offsetHeight')+130
  page.set_viewport_size({'width':page.viewport_size['width'],'height':max(980,int(height*1.1))})
  page.locator('.sheet-content').evaluate('(e)=>e.scrollTop=0')
  page.locator(selector).screenshot(path=str(dest),animations='disabled')
 else:page.screenshot(path=str(dest),full_page=True,animations='disabled')
 manifest.append({'name':name,'file':dest.name})
def boot(browser,mode,width=430,height=980,admin=False):
 page=browser.new_page(viewport={'width':width,'height':height},device_scale_factor=2,color_scheme=mode)
 page.set_default_timeout(7000);page.on('pageerror',lambda e:errors.append(str(e)))
 # No actual service endpoint can be fetched by these fixtures.
 page.route('**/*',lambda route:route.abort())
 html='<div id="app"></div><dialog id="sheet" aria-labelledby="sheet-title"></dialog><div id="toasts" class="toasts" role="status"></div>'
 page.set_content('<!doctype html><html><head><meta name="theme-color" content="#f4eee4"><style>'+font_css+style+'</style></head><body>'+html+'</body></html>')
 page.add_script_tag(content=ctx['bundle']());page.add_script_tag(content=ctx['fixture']+'\n'+ctx['mock'])
 page.add_script_tag(content='const MODE='+json.dumps(mode)+';\n'+setup)
 page.locator('.current-mark').wait_for();fonts(page)
 return page
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=shutil.which('chromium') or shutil.which('chromium-browser') or None,headless=True,args=['--no-sandbox'])
 for mode in ['light','dark']:
  page=boot(browser,mode)
  check(page.locator('html').get_attribute('data-theme')==mode,mode+': saved appearance applied')
  check(page.evaluate('document.documentElement.scrollWidth<=innerWidth'),mode+': home has no overflow')
  check(page.locator('.browse-toggle').evaluate('(e)=>getComputedStyle(e).borderTopStyle')=='solid',mode+': Search & Sort is visibly outlined')
  check(page.locator('.status-badge').first.evaluate('(e)=>getComputedStyle(e).borderTopWidth==="0px"'),mode+': status badge is flat and borderless like original')
  check(page.locator('.workspace-bar h2').evaluate('(e)=>getComputedStyle(e).fontVariantLigatures')=='none',mode+': display ligatures disabled')
  shot(page,'01-home-'+mode)
  caption_path=OUT/('01b-recipe-metric-captions-'+mode+'.png')
  page.locator('.coffee-card.is-open .recipe-grid').screenshot(path=str(caption_path),animations='disabled')
  manifest.append({'name':'01b-recipe-metric-captions-'+mode,'file':caption_path.name})
  page.locator('[data-action=search-toggle]').click();check(page.locator('.search-tools').is_visible(),mode+': Search & Sort expands')
  shot(page,'02-search-'+mode)
  page.locator('[data-action=search-toggle]').click()
  page.locator('[data-action=settings]').click()
  check(page.locator('.recovery-options').count()==0,mode+': Recovery Options removed')
  check(page.locator('.settings-signout').locator('[data-action=signout]').count()==1,mode+': Sign Out is last and icon-labelled')
  check(page.locator('.settings-row[data-action=new-setup]').count()==1,mode+': Add Another Setup grouped with active setup')
  shot(page,'03-settings-'+mode,'#sheet')
  page.get_by_text('Advanced Setup Options',exact=True).click();shot(page,'04-settings-advanced-'+mode,'#sheet')
  page.locator('[data-action=close]').click();page.locator('[data-action=log]').first.click()
  check(page.locator('[name=yieldG]').input_value()=='',mode+': actual yield remains blank')
  check(page.locator('[name=timeS]').input_value()=='',mode+': actual time remains blank')
  page.locator('[name=yieldG]').fill('50');page.locator('[name=timeS]').fill('22')
  for key,value in [('extraction',3),('body',3),('clarity',5),('sweetness',5),('astringency',1)]:page.locator(f'[data-action=rate][data-key={key}][data-value="{value}"]').click()
  # Tall review viewport captures the entire actual scrollable form without altering its CSS.
  page.set_viewport_size({'width':430,'height':1700});shot(page,'05-log-shot-'+mode,'#sheet')
  page.locator('[data-action=close]').click();page.set_viewport_size({'width':430,'height':980})
  page.locator('details[data-retain="history-coffee"] summary').click()
  check(page.locator('.shot-date').first.inner_text().count('/')==2,mode+': month/day/year date style')
  check(page.locator('.shot-record-context').count()==0,mode+': setup and basket hidden while collapsed')
  check(page.locator('[data-action=shot-toggle-all]').inner_text()=='Expand All',mode+': Expand All offered')
  page.locator('[data-action=shot-toggle-all]').click()
  check(page.locator('[data-action=shot-expand][aria-expanded=true]').count()==3,mode+': all three history rows expand')
  check(page.locator('.shot-record-context').count()==3,mode+': expanded setup context preserved')
  check(page.locator('[data-action=shot-toggle-all]').inner_text()=='Collapse All',mode+': Collapse All offered')
  page.locator('[data-action=shot-toggle-all]').click()
  check(page.locator('[data-action=shot-expand][aria-expanded=true]').count()==0,mode+': all three history rows collapse')
  page.locator('[data-action=shot-expand]').first.click()
  check(page.locator('.shot-body [data-action=edit]').count()==1,mode+': Edit appears only in expanded details')
  check(page.locator('.shot-body [data-action=edit]').first.evaluate('(e)=>e.getBoundingClientRect().height')<=38,mode+': Edit is compact')
  check(page.locator('.shot-body [data-action=make-current]').first.evaluate('(e)=>e.getBoundingClientRect().height')<=38,mode+': Make Current Recipe is compact')
  check(page.locator('.shot-body .taste-chip').first.evaluate('(e)=>getComputedStyle(e).fontWeight')==page.locator('.shot-meta .style-badge').first.evaluate('(e)=>getComputedStyle(e).fontWeight'),mode+': taste badge lettering matches style')
  check(int(page.locator('.shot-body .radar text').first.evaluate('(e)=>getComputedStyle(e).fontWeight'))>=600,mode+': radar labels have medium emphasis')
  check(page.locator('.shot-topline .shot-date').first.evaluate('(e)=>{const d=e.getBoundingClientRect(),t=e.closest(".shot-topline").getBoundingClientRect();return Math.abs(d.left-t.left)<3}'),mode+': mobile date aligns left')
  check(page.locator('.shot-body [data-action=make-current]').count()==1,mode+': Make Current Recipe remains separate')
  shot(page,'06-history-'+mode)
  page.set_viewport_size({'width':900,'height':950})
  check(page.locator('.shot-topline').first.evaluate('(el)=>{const a=el.querySelector(".shot-numbers").getBoundingClientRect(),b=el.querySelector(".shot-date").getBoundingClientRect();return Math.abs(a.top-b.top)<9}'),mode+': wide shot summary and date share one line')
  shot(page,'06b-history-desktop-'+mode,'.coffee-card.is-open')
  page.set_viewport_size({'width':430,'height':980})
  page.locator('[data-action=add]').click()
  check(page.locator('#new-coffee summary').count()==0,mode+': no Optional Coffee Details heading')
  check(page.locator('#new-coffee .coffee-detail-grid').count()==1,mode+': metadata grid remains')
  check(page.locator('#new-coffee .coffee-detail-grid .field').count()==6,mode+': six coffee metadata fields retained')
  check(page.locator('#new-coffee>label.field').first.evaluate('(el)=>getComputedStyle(el).marginBottom')=='13px',mode+': full-width New Coffee fields have readable spacing')
  columns=page.locator('#new-coffee .coffee-detail-grid').evaluate('(el)=>getComputedStyle(el).gridTemplateColumns.split(" ").length')
  check(columns==2,mode+': metadata fields remain side by side')
  shot(page,'07-add-coffee-'+mode,'#sheet')
  # Use a synthetic result instead of making any external HTTP request.
  # Current published flow fills blanks on Autofill; Add Coffee remains explicit.
  # Typed facts must survive the preview and no record may be saved by it.
  library_count=page.evaluate('window.__raw.library.length')
  page.evaluate("""()=>{
    window.__app.client.previewCoffeeUrl=async (source_url)=>({
      ok:true,source_url,source:'official_roaster_product_metadata',
      fields:{name:'Hambela',roaster:'Sweet Bloom',release_label:'2026 Harvest',
        origin:'Guji, Ethiopia',process:'Washed',variety:'Heirloom',
        elevation_m:'1,900–2,100 m',tasting_notes:'Berry, floral, citrus'},
      match:{classification:'exact_verified',exact_id:'12345678-1234-1234-1234-123456789012',candidates:[]}
    });
  }""")
  page.locator('#new-coffee [name=source_url]').fill('https://sweetbloomcoffee.com/products/hambela')
  page.locator('#new-coffee [name=variety]').fill('Local Bag Entry')
  page.locator('[data-action=preview-coffee-url]').click()
  page.locator('.coffee-url-preview').wait_for()
  check(page.locator('#new-coffee [name=name]').input_value()=='Hambela',mode+': Autofill fills blank Name in one click')
  check(page.locator('.coffee-url-preview .coffee-match-alert').count()==1,mode+': URL previews existing verified-coffee match')
  shot(page,'07b-url-autofill-preview-'+mode,'#sheet')
  check(page.locator('[data-action=apply-coffee-url]').count()==0,mode+': no redundant Apply step in current flow')
  check(page.evaluate('window.__raw.library.length')==library_count,mode+': preview does not save a coffee')
  check(page.locator('#new-coffee [name=roaster]').input_value()=='Sweet Bloom',mode+': source Roaster fills its blank field')
  check(page.locator('#new-coffee [name=origin]').input_value()=='Guji, Ethiopia',mode+': source-backed Origin filled')
  check(page.locator('#new-coffee [name=process]').input_value()=='Washed',mode+': recognized Process field filled')
  check(page.locator('#new-coffee [name=variety]').input_value()=='Local Bag Entry',mode+': typed Variety never overwritten')
  check(page.locator('#new-coffee [name=source_url]').input_value()=='https://sweetbloomcoffee.com/products/hambela',mode+': official URL retained in form')
  check(page.locator('#new-coffee .coffee-detail-grid .field').count()==6,mode+': original two-column details preserved after autofill')
  page.locator('[data-action=close]').click()
  page.locator('[data-action=sync]').first.click();check(page.locator('#sheet [data-action=export]').count()==0,mode+': no routine recovery export when synced');shot(page,'08-sync-'+mode,'#sheet');page.locator('[data-action=close]').click()
  page.locator('[data-action=style]').first.click();shot(page,'09-style-'+mode,'#sheet');page.locator('[data-action=close]').click()
  # An unproven coffee, sourced from a similar coffee's genuine synthetic
  # success on the same setup. Never use the owner's real cloud data here.
  page.evaluate("""()=>{
    const a=window.__app,s=a.state,c=s.coffees.find(x=>x.id==='coffee-two');
    c.name='Wuri (Synthetic)';c.roastLevel='Light-Medium';c.process='Washed';
    c.origin='Gedeb, Ethiopia';c.tastingNotes='Floral, citrus, berry';
    const ws=s.setups[0].workspaces[s.setups[0].activeVersionId];
    ws.coffees[c.id]={style:'Turbo',currentFamilies:{},referenceFamilies:{},favoriteShots:{},basketId:'basketv',experiments:{}};
    a.expanded.clear();a.expanded.add(c.id);
    a.render();
  }""")
  check(page.locator('.coffee-card.is-open .recipe-label').inner_text()=='Starting Recommendation',mode+': unproven coffee has a starting recipe')
  check('similar' in page.locator('.coffee-card.is-open .recipe-reason').inner_text().lower(),mode+': starting recipe cites personal similar-coffee evidence')
  check('–' in page.locator('.coffee-card.is-open .metric').filter(has=page.locator('.metric-label',has_text='Grind')).locator('.metric-value').inner_text(),mode+': unproven Grind has a narrow range')
  shot(page,'09b-starting-recommendation-'+mode,'.coffee-card.is-open')
  page.evaluate("""()=>{
    const a=window.__app,s=a.state,c=s.coffees.find(x=>x.id==='coffee-two');
    const example={...s.shots[0],id:'review-undialed',coffeeId:c.id,style:'Turbo',
      timestamp:'2026-10-15T19:00:00Z',yieldG:50,timeS:10,grindSetting:1.2,
      dialedIn:false,familyId:null,suggestion:null,notes:'Needs more sweetness',
      tasteScales:{extraction:2,body:2,clarity:3,sweetness:2,astringency:1}};
    s.shots.push(example);a.render();
  }""")
  check(page.locator('.coffee-card.is-open .feedback-panel').count()==1,mode+': non-green shot generates next-shot guidance')
  check('Try grind' in page.locator('.coffee-card.is-open .feedback-panel').inner_text(),mode+': non-green shot has specific grinder recommendation')
  check('–' not in page.locator('.coffee-card.is-open .metric').filter(has=page.locator('.metric-label',has_text='Grind')).locator('.metric-value').inner_text(),mode+': explicit next-shot Grind is a specific setting')
  shot(page,'09c-next-shot-recommendation-'+mode,'.coffee-card.is-open')
  # Denied/non-admin front-end fixture. Real user authorization is a separate gate.
  page.evaluate('window.__app.status.admin=false;window.__app.settings()')
  check(page.locator('[data-action=open-admin]').count()==0,mode+': non-admin Settings has no Admin Dashboard link')
  page.locator('[data-action=close]').click()
  # Capture real auth page markup with synthetic signed-out state.
  page.evaluate('window.__app.identity=null;window.__app.status=null;window.__app.authView="signin";window.__app.render()')
  shot(page,'10-sign-in-'+mode)
  page.evaluate('window.__app.authView="check-email";window.__app.confirmationEmail="review@example.invalid";window.__app.render()')
  shot(page,'11-confirm-email-'+mode)
  page.close()
  # Actual administrator JS running against an isolated read-only SDK fixture.
  page=browser.new_page(viewport={'width':1120,'height':1050},device_scale_factor=2,color_scheme=mode);page.set_default_timeout(7000)
  page.on('pageerror',lambda e:errors.append(str(e)));page.route('**/*',lambda route:route.abort())
  page.set_content('<html><head><meta name="theme-color"><style>'+font_css+(SITE/'styles.css').read_text().split('\n',1)[1]+(SITE/'admin/styles.css').read_text()+ (SITE/'visual.css').read_text()+'</style></head><body><main id="admin-root" class="admin-shell"></main></body></html>')
  main=(SITE/'admin/main.js').read_text()
  main=re.sub(r"^import .*?;\n",'',main,flags=re.M)
  # Keep real denial classification even though this about:blank fixture
  # supplies a synthetic secure origin and authenticated SDK.
  client=(SITE/'cloud/client.js').read_text()
  client="const {isAccessDenied}=(()=>{\n"+re.sub(r'\bexport\s+','',client)+"\nreturn {isAccessDenied};\n})();\n"
  shared=(SITE/'cloud/appearance.js').read_text().replace('export ','')
  records=(SITE/'admin/records.js').read_text();records=re.sub(r"^import .*?;\n",'',records,flags=re.M).replace('export ','')
  view=(SITE/'admin/view.js').read_text();view=re.sub(r"^import .*?;\n",'',view,flags=re.M).replace('export ','')
  sdk=r'''
const CLOUD_CONFIG={enabled:true};const secureOrigin=()=>{};let requests=[];
const fixtureId=(group,index)=>group+'0000000-0000-4000-8000-'+String(index).padStart(12,'0');
const fixtureTime='2026-10-21T12:00:00Z';
const fixtureCoffee={revision:3,roaster:'Synthetic Roaster',release_label:'2026 Harvest',
 origin:'Guji, Ethiopia',process:'Washed',roast_level:'Light-Medium',variety:'Heirloom',
 producer:'Synthetic producer',elevation_m:'1800-2000',tasting_notes:'Berry, floral, citrus',
 summary:'Synthetic coffee record for isolated visual review.',espressoNotes:'18 g in, 50 g out.',
 source_url:'https://fixture.invalid/coffee',creator_email:'tester@synthetic.invalid',created_at:fixtureTime};
const fixtureShot={revision:2,coffee_name:'Synthetic Washed Coffee',style:'Turbo',dose_g:18,yield_g:50,
 time_s:22,grind_setting:1.1,temperature_c:91,extraction:3,body:3,clarity:5,sweetness:5,astringency:1,
 notes:'Synthetic private note: sweet berry finish.',creator_email:'tester@synthetic.invalid',pulled_at:fixtureTime};
const fixtureRows={
 pending:[{...fixtureCoffee,id:fixtureId('4',1),name:'Synthetic Pending Coffee',status:'pending'}],
 conflicts:[{...fixtureCoffee,id:fixtureId('4',2),name:'Synthetic Conflict Coffee',status:'conflict'}],
 approved:[{...fixtureCoffee,id:fixtureId('5',1),name:'Synthetic Washed Coffee'},
  {...fixtureCoffee,id:fixtureId('5',2),name:'Synthetic Natural Coffee',process:'Natural'}],
 shots:[{...fixtureShot,id:fixtureId('6',1)},
  {...fixtureShot,id:fixtureId('6',2),coffee_name:'Synthetic Natural Coffee',hidden_at:fixtureTime,
   notes:'Synthetic retained note on a hidden shot.'}],
 accounts:[{id:fixtureId('1',1),email:'operator@synthetic.invalid',admin:true,enabled:true},
  {id:fixtureId('2',1),email:'tester@synthetic.invalid',admin:false,enabled:false}],
 invites:[{id:fixtureId('7',1),label:'Synthetic Used Invitation',status:'used',uses:1,max_uses:1,created_at:fixtureTime}]
};
const sdk={
 auth:{onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),
  getUser:async()=>({data:{user:{id:fixtureId('1',1)}}})},
 from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:{theme:MODE}})})})}),
 rpc:async(name,args={})=>{
  requests.push(name);
  if(name==='dic_session_status')return {data:{authenticated:true,admitted:true,admin:true}};
  if(name==='dic_admin_dashboard')return {data:{
   // Legacy aggregates exclude the hidden shot and removed member and include
   // one merged coffee. Successful detail pages supply their own exact totals.
   counts:{pending_coffees:1,conflicts:1,verified_coffees:3,active_accounts:1,shot_records:1},
   queue_total:2,queue:structuredClone([...fixtureRows.pending,...fixtureRows.conflicts])}};
  if(name==='dic_admin_access_overview')return {data:{invites:[],invites_total:0,
   members:structuredClone(fixtureRows.accounts),members_total:fixtureRows.accounts.length}};
  if(name==='dic_admin_records'){
   const rows=fixtureRows[args.p_kind];
   if(!rows)throw Error('Unknown synthetic record kind');
   return {data:{kind:args.p_kind,items:structuredClone(rows.slice(args.p_offset,args.p_offset+args.p_limit)),
    total:rows.length,offset:args.p_offset,limit:args.p_limit}};
  }
  throw Error('Unexpected visual-fixture RPC '+name);
 }
};
globalThis.supabase={createClient:()=>sdk};
'''
  escaped="const e=x=>String(x??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',\"'\":'&#39;'}[c]));"
  page.add_script_tag(content='const MODE='+json.dumps(mode)+';'+escaped+shared+client+records+view+sdk+main)
  page.locator('#admin-refresh').wait_for();check(page.locator('html').get_attribute('data-theme')==mode,mode+': Admin reads saved account appearance')
  page.locator('#admin-refresh').click();check(page.evaluate('requests.filter(x=>x==="dic_admin_dashboard").length')>=2,mode+': Admin Refresh remains read-only')
  page.wait_for_function("document.querySelector('#admin-refresh')?.disabled===false && document.querySelectorAll('#admin-approved .admin-record').length===2")
  check(page.locator('.admin-stats a strong').all_text_contents()==['1','1','2','2','2'],mode+': Admin cards match complete record totals')
  check(page.locator('details.admin-disclosure:not([open])').count()==6,mode+': all admin sections collapsed initially')
  for kind in ['pending','conflicts','approved','shots','accounts','infrastructure']:
   page.locator('#admin-'+kind+' summary.admin-disclosure-summary').click()
  for group in page.locator('#admin-shots details.admin-coffee-group').all():
   group.locator('summary').click()
  for kind,total in [('pending',1),('conflicts',1),('approved',2),('shots',2)]:
   check(page.locator('#admin-'+kind+' .admin-record').count()==total,mode+': '+kind+' records are populated')
  check(page.locator('#admin-pending h2').all_text_contents()==['Pending Coffee Review'] and page.locator('#admin-conflicts h2').all_text_contents()==['Conflicts'],mode+': review sections have one readable heading')
  check(page.locator('#admin-pending > section, #admin-conflicts > section').count()==0,mode+': review records have no duplicate nested panel')
  check(page.locator('#admin-approved .admin-queue-title strong').first.inner_text()=='tester@synthetic.invalid',mode+': record creator attribution is visible')
  check(page.locator('#admin-shots .admin-record-note').first.inner_text()=='Notes: Synthetic private note: sweet berry finish.',mode+': synthetic private shot notes are visible')
  check(page.locator('.admin-member-row').count()==2 and page.get_by_role('button',name='Restore Access',exact=True).count()==1,mode+': complete accounts include the removed synthetic member')
  check(page.locator('#admin-invites .admin-invite-row').count()==1 and page.get_by_text('Synthetic Used Invitation').count()==1,mode+': complete historical invitation listing renders without secret retrieval')
  check(page.locator('#admin-invites').get_by_text('Complete invitation history is temporarily unavailable').count()==0,mode+': invitation fixture exercises successful server listing, not fallback')
  check(page.locator('.admin-pagination').count()==0,mode+': complete short lists do not show misleading pagination')
  review=page.locator('#admin-pending .admin-record')
  check(all(review.locator('[data-action="'+action+'"]').is_visible() for action in ['review-approve','review-merge-prepare','review-hold']),mode+': each paginated coffee has review actions')
  check(page.locator('.admin-review-details').count()==0,mode+': duplicate legacy review actions omitted')
  check(page.evaluate('document.documentElement.scrollWidth<=innerWidth'),mode+': Admin has no horizontal overflow')
  shot(page,'12-admin-'+mode)
  page.set_viewport_size({'width':390,'height':1100});shot(page,'13-admin-mobile-'+mode)
  check(page.evaluate('document.documentElement.scrollWidth<=innerWidth'),mode+': Admin mobile has no horizontal overflow')
  coffee=page.locator('#admin-approved > .admin-record').first
  coffee.get_by_role('button',name='Edit Details',exact=True).click()
  coffee_editor=coffee.locator('[data-record-form]');coffee_editor.wait_for(state='visible')
  check(all(not coffee_editor.locator('[name="'+field+'"]').is_editable() for field in ['name','roaster','release_label']),mode+': approved identity remains readonly in the open editor')
  check(coffee_editor.locator('[name="origin"]').input_value()=='Guji, Ethiopia' and coffee_editor.locator('[name="origin"]').is_editable(),mode+': descriptive coffee values are editable')
  shot_record=page.locator('#admin-shots .admin-record').first
  shot_record.get_by_role('button',name='Edit Details',exact=True).click()
  shot_editor=shot_record.locator('[data-record-form]');shot_editor.wait_for(state='visible')
  check(shot_editor.locator('[name="notes"]').input_value()=='Synthetic private note: sweet berry finish.' and shot_editor.locator('[name="notes"]').is_editable(),mode+': shot editor retains the original synthetic private note')
  check(page.evaluate('document.documentElement.scrollWidth<=innerWidth'),mode+': populated mobile editors fit the viewport')
  shot(page,'14-admin-editors-mobile-'+mode)
  check(all(name in ['dic_session_status','dic_admin_dashboard','dic_admin_access_overview','dic_admin_records'] for name in page.evaluate('requests')),mode+': visual editor inspection makes no mutation RPC')
  page.close()
 for width in [320,375,390,768,1280]:
  page=boot(browser,'dark',width,1100)
  check(page.evaluate('document.documentElement.scrollWidth<=innerWidth'),f'{width}px: home no horizontal overflow')
  page.locator('[data-action=settings]').click();check(page.locator('#sheet').evaluate('(e)=>e.scrollWidth<=e.clientWidth'),f'{width}px: Settings fits')
  page.close()
 browser.close()
check(not errors,'No JavaScript exceptions during visual review')
report={'passed':len(checks),'checks':checks,'screenshots':manifest,'fonts_loaded_from_files':(FONT_DIR/'Fraunces.ttf').exists(),'scope':'Chromium renders actual edited app/admin code with mocked authentication and synthetic records. Not real nonadmin Auth verification. No production writes or Netlify deploy.'}
(OUT/'review-results.json').write_text(json.dumps(report,indent=2));print(json.dumps({'passed':len(checks),'screenshots':len(manifest),'output':str(OUT)},indent=2))
