"""Issue 26: accessible keyboard/mobile/contrast/browser regression (synthetic).
Executes actual site CSS + CloudApp modules in Chromium, never live credentials.
Real screen-reader/VoiceOver behavior and hardware safe areas are not certified.
"""
from pathlib import Path
import json
import re
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[2]
SITE=ROOT/'site'
OUT=ROOT/'qa_artifacts/visual-review'
OUT.mkdir(parents=True,exist_ok=True)
source=(ROOT/'tests/browser/cloud_owner_qa.py').read_text().split('checks=[]')[0]
ns={'__file__':str(ROOT/'tests/browser/cloud_owner_qa.py')}
exec(source,ns)
bundle=ns['bundle']
fixture=ns['fixture']
mock=ns['mock']
checks=[]
def check(value,label):
    assert value,label
    checks.append(label)
def contrast(a,b):
    def lum(color):
        parts=[int(x,16)/255 for x in (color[1:3],color[3:5],color[5:7])]
        linear=[v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in parts]
        return .2126*linear[0]+.7152*linear[1]+.0722*linear[2]
    la,lb=lum(a),lum(b)
    return (max(la,lb)+.05)/(min(la,lb)+.05)

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,args=['--no-sandbox'])
    context=browser.new_context(viewport={'width':390,'height':844})
    page=context.new_page()
    page.set_default_timeout(12000)
    errors=[]
    page.on('pageerror',lambda err:errors.append(str(err)))
    css=(SITE/'styles.css').read_text().split('\n',1)[1]+'\n'+(SITE/'visual.css').read_text()
    page.set_content('<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>'+css+'</style></head><body><div id="app"></div><dialog id="sheet" aria-labelledby="sheet-title"></dialog><div id="toasts" class="toasts" role="status"></div></body></html>')
    page.add_script_tag(content=bundle())
    page.add_script_tag(content=fixture+'\n'+mock)
    page.get_by_role('button',name='Sign In',exact=True).wait_for()
    check(page.locator('[name=email]').evaluate('el=>el.labels.length>0') and page.locator('[name=password]').evaluate('el=>el.labels.length>0'),'Authentication fields carry visible programmatic labels')
    page.locator('[name=email]').focus()
    page.keyboard.press('Tab')
    check(page.evaluate("document.activeElement?.name==='password'"),'Tab moves from Email to Password')
    page.keyboard.press('Tab')
    check(page.evaluate("document.activeElement?.textContent.trim()==='Sign In'"),'Tab reaches native Sign In submit')
    page.locator('[name=email]').fill('member@example.invalid')
    page.locator('[name=password]').fill('synthetic-only')
    page.get_by_role('button',name='Sign In',exact=True).click()
    page.get_by_role('button',name='Use Invitation').wait_for()
    page.locator('[name=token]').fill('synthetic-invite')
    page.get_by_role('button',name='Use Invitation').click()
    page.get_by_role('button',name='Settings',exact=True).wait_for()
    check(page.locator('.coffee-card').count()==1,'Admitted synthetic member starts with one coffee and no shot')
    check(page.get_by_role('button',name='Add Coffee',exact=False).count()==1,'Connected empty-shot workspace exposes Add Coffee')

    # Page redraws should not drop the position of a keyboard-only user.
    search=page.locator('[data-action=search-toggle]')
    search.focus()
    search.press('Enter')
    check(page.locator('#search').count()==1,'Search toggle opens its field with Enter')
    check(page.evaluate("document.activeElement?.dataset?.action==='search-toggle'"),'Search toggle preserves keyboard focus across render')
    search=page.locator('[data-action=search-toggle]')
    search.press('Enter')
    check(page.locator('#search').count()==0,'Search toggle closes without saving or mutating records')

    coffee=page.locator('[data-action=expand]').first
    coffee.focus()
    coffee.press('Enter')
    page.get_by_role('button',name='Log First Shot',exact=True).wait_for()
    check(page.locator('.first-shot-style [name=first_style]').count()==1,'Before first shot, style choice is keyboard accessible')
    check(page.evaluate("document.activeElement?.dataset?.action==='expand'"),'Coffee expansion preserves focus and remains keyboard reversible')
    check(page.locator('[data-action=expand]').first.get_attribute('aria-expanded')=='true','Expanded coffee exposes live aria-expanded=true')

    # Focused Log Shot sheet, native dialog semantics and keyboard navigation.
    log=page.locator('[data-action=first-shot-log]').first
    log.focus()
    log.press('Enter')
    page.locator('#shot [name=yieldG]').wait_for()
    check(page.locator('#sheet').evaluate('el=>el.open && el.getAttribute("aria-labelledby")==="sheet-title"'),'Log Shot is a correctly titled native modal')
    check(page.evaluate('document.activeElement?.closest("#sheet")!==null'),'Opening Log Shot places focus inside modal')
    for _ in range(18):
        page.keyboard.press('Tab')
        check(page.evaluate('document.activeElement?.closest("#sheet")!==null'),'Native modal keeps keyboard Tab focus inside sheet')
    page.keyboard.press('Shift+Tab')
    check(page.evaluate('document.activeElement?.closest("#sheet")!==null'),'Native modal keeps Shift+Tab focus inside sheet')
    page.keyboard.press('Escape')
    check(page.locator('#sheet').evaluate('el=>el.open'),'Escape does not discard an unsaved shot without explicit Close')

    # Critical physical target sizes; owner-approved info/compact targets are
    # intentionally excluded from blanket 44px claims.
    sizes=page.locator('#sheet .scale-button, #sheet .primary').evaluate_all("""els=>els.map(el=>({
      kind:el.className, h:el.getBoundingClientRect().height,w:el.getBoundingClientRect().width
    }))""")
    check(len(sizes)>=26 and all(s['h']>=44 for s in sizes),'All five sensory rows and primary Save target have >=44px height')
    check(all(s['w']>=24 for s in sizes),'Sensory rating targets remain physically distinguishable')

    # Preserve the existing first-invalid focus and explicit five-scale selection.
    page.get_by_role('button',name='Save Shot & Get Suggestion').click()
    check(page.locator('[name=yieldG]').get_attribute('aria-invalid')=='true','First missing measurement is visibly and programmatically invalid')
    check(page.evaluate("document.activeElement?.name==='yieldG'"),'First missing measurement receives focus')
    page.locator('[name=yieldG]').fill('48')
    page.locator('[name=timeS]').fill('25')
    page.locator('[name=grindSetting]').fill('1')
    page.get_by_role('button',name='Save Shot & Get Suggestion').click()
    check(page.locator('[data-scale=extraction] [role=group]').get_attribute('aria-invalid')=='true','Missing sensory ratings announce invalid group')
    for key,value in [('extraction',3),('body',3),('clarity',5),('sweetness',5),('astringency',1)]:
        button=page.locator(f'[data-action=rate][data-key={key}][data-value="{value}"]')
        button.focus()
        button.press('Space')
        check(button.get_attribute('aria-pressed')=='true' and button.evaluate('el=>document.activeElement===el'),key+': Space selects value without dropping focus')
        check(bool(button.get_attribute('aria-label')),key+': selected rating has readable accessible name')
    check(page.locator('#shot [role=alert]').count()>=1,'Shot validation owns a live alert region')
    page.locator('[name=notes]').fill('Synthetic private accessibility QA note')

    # Respect both approved palettes; audit text contrast without changing it.
    audits={}
    for mode in ['light','dark']:
        page.evaluate("(v)=>document.documentElement.setAttribute('data-theme',v)",mode)
        colors=page.evaluate("""()=>Object.fromEntries(
          ['--bg','--ink','--surface','--well','--muted','--accent-text','--action','--action-ink']
          .map(k=>[k,getComputedStyle(document.documentElement).getPropertyValue(k).trim()])
        )""")
        ratios={
          'body':contrast(colors['--ink'],colors['--bg']),
          'modal':contrast(colors['--ink'],colors['--surface']),
          'muted_well':contrast(colors['--muted'],colors['--well']),
          'action':contrast(colors['--action-ink'],colors['--action']),
          'accent_surface':contrast(colors['--accent-text'],colors['--surface'])
        }
        audits[mode]={k:round(v,2) for k,v in ratios.items()}
        check(all(x>=4.5 for x in ratios.values()),mode+': primary copy, helper, and action colors meet 4.5:1 on intended surfaces')
        check(page.locator('#sheet h2').evaluate("el=>getComputedStyle(el).textShadow==='none'"),mode+': modal title respects Locked no-text-effects design')
    page.evaluate("document.documentElement.setAttribute('data-theme','light')")
    (OUT/'issue26-contrast.json').write_text(json.dumps(audits,indent=2)+'\n')

    # Reduced motion on real CSS must suppress UI animations.
    page.emulate_media(reduced_motion='reduce')
    transition=page.locator('#sheet .primary').evaluate('el=>getComputedStyle(el).transitionDuration')
    check(all(float(x.strip().removesuffix('s'))==0 for x in transition.split(',')),'Reduced-motion media query disables button transitions')
    page.emulate_media(reduced_motion='no-preference')

    # Portrait, landscape, tablet and small viewport; form stays scrollable.
    for w,h in [(320,700),(360,740),(390,844),(430,932),(768,900),(1024,768),(844,390)]:
        page.set_viewport_size({'width':w,'height':h})
        dims=page.locator('#sheet').evaluate("""el=>{
          const b=el.getBoundingClientRect(),body=el.querySelector('.sheet-content');
          return {left:b.left,right:b.right,top:b.top,bottom:b.bottom,
             contentScrollable:body.scrollHeight<=body.clientHeight||getComputedStyle(body).overflowY==='auto'};
        }""")
        check(dims['left']>=-2 and dims['right']<=w+2 and dims['top']>=-2 and dims['bottom']<=h+2 and dims['contentScrollable'],f'{w}x{h}: Log Shot dialog remains within viewport and internally scrollable')
        check(page.evaluate('document.documentElement.scrollWidth<=innerWidth+2'),f'{w}x{h}: no horizontal document overflow')
    page.set_viewport_size({'width':390,'height':844})

    # Single-member Log -> Rate -> Recommendation without double saves.
    page.get_by_role('button',name='Save Shot & Get Suggestion').click()
    page.wait_for_function("!document.querySelector('#sheet').open")
    check(page.locator('.feedback-panel').count()==1,'Rating and saving generates one visible recommendation')
    check(page.locator('.first-shot-style').count()==0 and page.locator('[data-action=log]').count()==1,'After first shot, regular Log A Shot replaces first-shot guidance')
    check(page.evaluate('window.__raw.shots.length===1'),'One submission creates exactly one synthetic shot')
    check(page.locator('.current-mark').count()==1,'Completed shot retains a single current coffee')
    # History controls also redraw the root: keyboard focus must survive both directions.
    page.get_by_text('Shot History (1)',exact=True).click()
    history=page.locator('[data-action=shot-expand]').first
    history.focus()
    history.press('Enter')
    check(page.locator('[data-action=shot-expand]').first.get_attribute('aria-expanded')=='true','Keyboard Enter expands the saved shot history row')
    check(page.evaluate("document.activeElement?.dataset?.action==='shot-expand'"),'Shot-history expansion preserves keyboard focus')
    page.locator('[data-action=shot-expand]').first.press('Enter')
    check(page.locator('[data-action=shot-expand]').first.get_attribute('aria-expanded')=='false','Keyboard Enter collapses the shot without losing history')

    context.set_offline(True)
    page.wait_for_function("document.querySelector('.sync-indicator')?.textContent.includes('Offline')")
    check(page.locator('.coffee-card').count()==1 and page.get_by_role('button',name='Community',exact=True).count()==0,'Network loss preserves private coffee and hides unavailable Community')
    context.set_offline(False)
    page.wait_for_function("document.querySelector('.sync-indicator')?.textContent.includes('Synced')")
    check(page.get_by_role('button',name='Community',exact=True).count()==1,'Network reconnect restores online controls only after revalidation')

    # A verified account with no saved coffees still offers a reachable action.
    page.evaluate("""async()=>{
      const raw=window.__raw;
      raw.library=[];raw.submissions=[];raw.workspaceCoffees=[];raw.shots=[];raw.notes=[];
      await window.__app.sync();
    }""")
    check(page.locator('.coffee-card').count()==0,'Empty coffee library renders no stale private cards')
    check(page.get_by_role('button',name='Add Coffee',exact=False).count()==1,'Empty library preserves a keyboard-reachable Add Coffee action')
    check(not errors,'No JavaScript page exceptions in keyboard, offline and viewport scenarios: '+repr(errors))

    context.close()
    browser.close()
print('PASS issue26 browser accessibility matrix:',len(checks),'assertions; contrast:',json.dumps(audits,sort_keys=True))
