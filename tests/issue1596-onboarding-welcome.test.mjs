import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {firstSetupWelcomeMarkup,WALKTHROUGH_VIDEO,WALKTHROUGH_CAPTIONS,WALKTHROUGH_POSTER} from '../site/cloud/help.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const html=firstSetupWelcomeMarkup(),main=read('site/cloud/main.js'),css=read('site/visual.css');

test('only admitted no-setup members reach welcome, without changing Auth or setup',()=>{
 assert.match(main,/connected\?this\.coffees\(\):this\.auth\(\)/);
 assert.match(main,/if\(!setup\)return firstSetupWelcomeMarkup\(\)/);
 assert.ok(main.indexOf('if(!setup)return firstSetupWelcomeMarkup()')<main.indexOf("if(this.view==='community')return this.communityScreen()"));
 assert.match(main,/if\(this\.identity\)return/);
 assert.match(main,/Your Invitation/);
 assert.match(main,/if\(this\.authView==='check-email'\)return emailConfirmationView/);
 assert.match(html,/aria-current="step"/);
 for(const label of ['Account','Welcome','Setup','Getting Started'])assert.ok(html.includes(label));
 assert.match(html,/data-action="new-setup"/);
 assert.match(main,/if\(a==='new-setup'\)\{this\.showSetup\(\);return;\}/);
 assert.match(main,/if\(id==='new-setup'\)\{await this\.mutate\('create_setup'/);
});
test('existing same-origin optional video, captions, transcript and fallback retained',()=>{
 assert.match(html,/<video[^>]*controls playsinline preload="metadata"/);
 assert.doesNotMatch(html,/\bautoplay\b|https?:\/\/|<iframe|onclick=/i);
 for(const [attr,value] of [['src',WALKTHROUGH_VIDEO],['poster',WALKTHROUGH_POSTER],['src',WALKTHROUGH_CAPTIONS]])
  assert.ok(html.includes(attr+'="'+value+'"'));
 assert.match(html,/kind="captions"[^>]*default/);
 assert.match(html,/href="\/media\/first-shot-transcript\.txt" download/);
 assert.match(html,/data-onboarding-error/);
 assert.match(main,/welcomeVideo\?\.addEventListener\('error'/);
});
test('existing guide and setup actions, Settings and no new data flags',()=>{
 assert.match(html,/data-action="getting-started-guide"/);
 assert.match(main,/if\(a==='getting-started-guide'\)\{this\.showGettingStarted\(\);return;\}/);
 assert.match(main,/if\(a==='settings'\)\{this\.settings\(\);return;\}/);
 assert.match(main,/Help &amp; Getting Started/);
 assert.doesNotMatch(html,/<form|<input|<script|localStorage|sessionStorage/);
});
test('exact owner reminder is legible in light and dark and mobile layout',()=>{
 assert.match(html,/Tap the <strong>Settings<\/strong> gear icon in the top-right corner of the app to reference these again/);
 assert.doesNotMatch(html,/How to Find These Later|Scroll to Help/);
 assert.match(css,/\.onboarding-return-note\s*\{[^}]*background:var\(--well\);color:var\(--ink\)/);
 assert.match(css,/\.onboarding-return-note p,\.onboarding-return-note strong\{color:var\(--ink\)/);
 assert.match(css,/:root\s*\{[^}]*--ink:#2d2018/);
 assert.match(css,/:root\[data-theme=dark\]\s*\{[^}]*--ink:#f6ead9/);
 assert.match(css,/@media\(max-width:480px\)\{\.onboarding-welcome/);
 assert.match(css,/\.onboarding-video-card video\{[^}]*object-fit:contain/);
});
