import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const sources=['site/cloud/main.js','site/cloud/coffee-match-ui.js',
 'site/cloud/import-ui.js','site/cloud/import-preview.js',
 'site/cloud/confirmation.js','site/admin/view.js'];
const labels=[];
for(const source of sources){
 const code=read(source);
 for(const expr of [/\bbutton\('([^']+)'\s*,/g,/\bfield\('([^']+)'\s*,/g,/\bselect\('([^']+)'\s*,/g]){
  for(const match of code.matchAll(expr))labels.push({source,text:match[1]});
 }
}
const sentence=(s)=>s.endsWith('.')||s.endsWith('!')||(s.includes(' ')&&s.includes('?')&&s!==s.replace(/[a-z]/,''));
test('standalone literal UI labels keep approved Title Case for both themes',()=>{
 const bad=[];
 for(const {source,text} of labels){
  if(sentence(text))continue;
  const normal=text.replace(/\s*\((?:g|s|kg|mL|ml|°F|°C)\)/g,''); // SI measurement units are lowercase by design.
  const lowered=[...normal.matchAll(/(?:^|[\s/·(-])([a-z])/g)].map(x=>x[1]);
  if(lowered.length)bad.push(source+': '+text);
 }
 assert.deepEqual(bad,[]);
});
test('all known legacy import and confirmation actions now use Title Case',()=>{
 for(const [source,labs] of [
 ['site/cloud/import-ui.js',['Backup File','Validate Import','Save Recovery Copy','Confirm Import']],
 ['site/cloud/import-preview.js',['What Is Preserved?']],
 ['site/cloud/confirmation.js',['I Verified My Email · Sign In']]])for(const label of labs)
  assert.ok(read(source).includes(label),source+': '+label);
});
test('user-entered shot notes and coffee identity strings are escaped, never recased',()=>{
 const main=read('site/cloud/main.js'),shot=read('site/cloud/shot_card.js');
 assert.match(main,/\$\{e\(c\.name\)\}/);
 assert.match(shot,/\$\{e\(shot\.notes\)\}/);
});
test('button roles are standardized by shared CSS tokens without reskinning original badges',()=>{
 const css=read('site/visual.css');
 for(const name of ['control-height','control-compact-height','control-radius','control-font','control-weight'])
  assert.match(css,new RegExp('--'+name+':'));
 assert.match(css,/\.primary,\.secondary,\.ghost,\.danger\{border-radius:var\(--control-radius\)/);
 assert.match(css,/\.compact\{min-height:var\(--control-compact-height\)/);
 assert.doesNotMatch(css,/\.shot-summary-actions\{/);
 assert.match(css,/\.taste-chip\{[^}]+font-weight:500/);
 assert.match(css,/\.radar text\{[^}]+font-weight:600/);
 assert.match(css,/\*,\*::before,\*::after\{text-shadow:none!important\}/);
});
test('review-requested recommendation captions are deliberately retained pending approval',()=>{
 const code=read('site/lib/ui.js');
 assert.match(code,/'Basket-based'/);
 assert.match(code,/'Recommendation','thermometer'/);
});
