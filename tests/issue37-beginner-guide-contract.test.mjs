import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {STYLES, SCALES} from '../site/lib/constants.js';

const read=(p)=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const guide=read('docs/guides/BEGINNER_QUICKSTART_DRAFT.md');
const register=read('docs/guides/ISSUE37_VALIDATION_REGISTER.md');
const app=read('site/cloud/main.js');
const ui=read('site/lib/ui.js');

test('First Shot guide uses actual supported login, setup, Add Coffee and Log Shot labels',()=>{
 const mainLabels=[
  'Sign In','Create An Account','Your Invitation','Invitation Code','Use Invitation',
  'Set Up My Workspace','Setup Name','Basket Dose (g)','Grinder Espresso Range',
  'Finest Espresso Setting','Coarsest Espresso Setting','Create Setup',
  'Equipment Details (Optional)','Roaster Page URL','Autofill From URL','Add Coffee',
  'Starting Shot Style','Log First Shot','Starting Recommendation','Log A Shot',
  'Dose (g)','Yield (g)','Time (s)','Grind Setting','Use Recommendation',
  'Notes (Optional','Save Shot & Get Suggestion','Next Shot Recommendation','Shot Feedback',
  'Shot History','Make Current Recipe','Advanced Setup Options','Track Slow Feeding',
  'Track Brew Temperature','Save Advanced Options','Cloud Sync Details'
 ];
 for(const label of mainLabels){
  assert.ok(app.includes(label),'app source lacks expected control: '+label);
  assert.ok(guide.includes(label),'guide lacks actual control: '+label);
 }
 assert.match(ui,/How did it taste\?/);
 assert.match(guide,/How did it taste\?/);
 assert.deepEqual(STYLES,['Traditional','Turbo','Fast-Flow','Ristretto','Lungo']);
 for(const scale of SCALES)assert.ok(guide.includes(scale.label),'missing taste scale '+scale.label);
});

test('Guide does not mistake suggestions for measurements or omit critical first-shot actions',()=>{
 const checks=[
  /Machine[\s\S]{0,120}Grinder[\s\S]{0,160}optional/i,
  /Yield and time deliberately start blank/i,
  /Use Recommendation[\s\S]{0,140}separate optional action/i,
  /closes and returns you automatically to the[\s\S]{0,40}expanded coffee card/i,
  /Extraction \*\*3\*\*, Body \*\*3\*\*, Clarity \*\*5\*\*, Sweetness \*\*5\*\*, and Astringency \/ Dryness \*\*1\*\*/i,
  /does \*\*not\*\* disqualify your successful shot/i,
  /Your Invitation[\s\S]{0,150}Invitation Code[\s\S]{0,80}Use Invitation/i,
  /Pending[\s\S]{0,80}private shots/i,
  /Authorized administrators[\s\S]{0,130}records and notes/i,
  /Offline logging[\s\S]{0,120}previously admitted/i
 ];
 for(const check of checks)assert.match(guide,check);
 const steps=guide.match(/^\d+\. \*\*/gm)||[];
 assert.equal(steps.length,6,'there must be six clear user steps');
});

test('Guide remains explicitly draft, source bound and does not masquerade as live authenticated QA',()=>{
 assert.match(guide,/DRAFT/);
 assert.match(guide,/05cf9eb156f63110cd434034ec3914a1e92b76d3/);
 assert.match(register,/6ae27f32bfae09ad8745e19b/);
 assert.match(register,/NOT CAPTURED/);
 assert.match(register,/NOT PERFORMED/);
 assert.match(register,/NOT AUTHORIZED/);
 assert.match(register,/OPEN OWNER PRODUCT CHOICE/);
 assert.match(guide,/has \*\*not\*\* selected the final written\/video\/combined format/);
});
