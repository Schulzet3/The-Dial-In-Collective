import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {STYLES, SCALES} from '../site/lib/constants.js';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const guide=read('docs/guides/BEGINNER_QUICKSTART_DRAFT.md');
const register=read('docs/guides/ISSUE37_VALIDATION_REGISTER.md');
const storyboard=read('docs/guides/ISSUE37_VIDEO_STORYBOARD.md');
const app=read('site/cloud/main.js');
const shotCard=read('site/cloud/shot_card.js');
const ui=read('site/lib/ui.js');
const master=read('docs/MASTER_SPECIFICATION.md');

test('Readable guide has six separately headed, ordered source-backed first-shot steps',()=>{
 const actual=guide.match(/^### Step [1-6] — [^\n]+/gm)||[];
 assert.equal(actual.length,6);
 for(let i=0;i<6;i++)assert.match(actual[i],new RegExp('^### Step '+(i+1)+' — '));
 const labels=['Sign In','Create An Account','Your Invitation','Invitation Code','Use Invitation',
  'Set Up My Workspace','Setup Name','Basket Dose (g)','Grinder Espresso Range',
  'Finest Espresso Setting','Coarsest Espresso Setting','Create Setup','Equipment Details (Optional)',
  'Roaster Page URL','Autofill From URL','Add Coffee','Starting Shot Style',
  'Log First Shot','Starting Recommendation','Log A Shot','Dose (g)','Yield (g)',
  'Time (s)','Grind Setting','Use Recommendation','Notes (Optional',
  'Save Shot & Get Suggestion','Next Shot Recommendation','Shot Feedback',
  'Shot History','Advanced Setup Options','Track Slow Feeding','Track Brew Temperature',
  'Save Advanced Options','Cloud Sync Details'];
 for(const label of labels){assert.ok(app.includes(label),'App lacks '+label);assert.ok(guide.includes(label),'Guide lacks '+label);}
 assert.ok(shotCard.includes('Make Current Recipe'));
 assert.ok(guide.includes('Make Current Recipe'));
 assert.match(ui,/How did it taste\?/);
 assert.match(guide,/How did it taste\?/);
 assert.deepEqual(STYLES,['Traditional','Turbo','Fast-Flow','Ristretto','Lungo']);
 for(const scale of SCALES)assert.ok(guide.includes(scale.label),'missing rating '+scale.label);
});

test('Guide separates actual measurements, suggestions, saved results and privacy',()=>{
 for(const phrase of ['Yield and time deliberately start blank','Use Recommendation',
 'closes and returns you automatically to the **expanded coffee card**',
 'Pending','private shots','Authorized administrators','Offline logging',
 'previously admitted','**Synced**','**Offline**','**Pending**'])
  assert.ok(guide.includes(phrase),phrase);
 for(const expected of [/Extraction \| \*\*3\*\*/,/Body \| \*\*3\*\*/,
  /Clarity \| \*\*5\*\*/,/Sweetness \| \*\*5\*\*/,
  /Astringency \/ Dryness \| \*\*1\*\*/])
  assert.match(guide,expected);
 assert.match(guide,/does \*\*not\*\* disqualify your successful shot/);
});

test('The source-verified support address is the last troubleshooting contact',()=>{
 const address='support@dialincollective.com';
 assert.ok(master.includes(address),'support email must remain in official specification');
 const section=guide.split('## If You Get Stuck\n')[1]?.split('\n## ')[0];
 assert.ok(section&&section.includes('mailto:'+address),'support link belongs in troubleshooting');
 assert.match(section,/\*\*Still need help\? Email/);
 assert.match(section,/Never include a password or invitation code/);
 assert.ok(section.trim().endsWith('Never include a password or invitation code.'));
});

test('Combined video/storyboard is source-bound and cannot claim a published screen recording',()=>{
 assert.match(guide,/Draft for review/);
 assert.match(register,/Format: APPROVED — written guide \+ accompanying short video/);
 assert.match(register,/816949840f22b2a181670de20410786d0a8de79b/);
 assert.match(register,/6ae38ba0a56bed8fa17d20ac/);
 assert.match(storyboard,/STORYBOARD \/ TRANSCRIPT ONLY/);
 assert.match(storyboard,/support@dialincollective\.com/);
 for(const phrase of ['NOT CAPTURED','NOT PERFORMED','NOT AUTHORIZED','NOT CHOSEN'])
  assert.ok(register.includes(phrase),phrase);
});
