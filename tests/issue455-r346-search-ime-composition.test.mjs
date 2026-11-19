import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

// Synthetic input only. No real member records or browser/provider session.
const source=readFileSync(new URL('../site/cloud/main.js',import.meta.url),'utf8');
const sourceBranch=source.match(/if\(ev\.target\.id==='search'&&!ev\.isComposing\)\{[\s\S]*?input\.setSelectionRange\(position,position\);\}/);
assert.ok(sourceBranch,'search redraw guard is present in the live input handler');
const applySearch=new Function('ev','root',sourceBranch[0]);

function syntheticSearch(){
 const rebuilt={focused:0,selection:null,focus(){this.focused++;},setSelectionRange(a,b){this.selection=[a,b];}};
 const root={querySelector(selector){assert.equal(selector,'#search');return rebuilt;}};
 const app={search:'unchanged',renders:0,render(){this.renders++;}};
 return {root,app,rebuilt};
}
test('R346 IME composing keystrokes never replace the active Search input',()=>{
 const {root,app,rebuilt}=syntheticSearch();
 const target={id:'search',value:'にほ',selectionStart:2};
 applySearch.call(app,{target,isComposing:true},root);
 assert.equal(app.search,'unchanged');
 assert.equal(app.renders,0);
 assert.equal(rebuilt.focused,0);
 assert.equal(rebuilt.selection,null);
});
test('R346 committed search input redraws once and restores cursor/focus',()=>{
 const {root,app,rebuilt}=syntheticSearch();
 const target={id:'search',value:'日本語',selectionStart:3};
 applySearch.call(app,{target,isComposing:false},root);
 assert.equal(app.search,'日本語');
 assert.equal(app.renders,1);
 assert.equal(rebuilt.focused,1);
 assert.deepEqual(rebuilt.selection,[3,3]);
});
test('R346 compositionend commits final search even without a follow-up input event',()=>{
 assert.match(source,/document\.addEventListener\('compositionend',ev=>\{\s*if\(ev\.target\?\.id==='search'\)this\.input\(\{target:ev\.target,isComposing:false\}\);\s*\}\);/);
 const {root,app,rebuilt}=syntheticSearch();
 const target={id:'search',value:'完成',selectionStart:2};
 // Listener routes compositionend into the same normal committed-search branch.
 applySearch.call(app,{target,isComposing:false},root);
 assert.equal(app.search,'完成');
 assert.equal(app.renders,1);
 assert.equal(rebuilt.focused,1);
 assert.deepEqual(rebuilt.selection,[2,2]);
});
test('R346 original search/filter and five-rating pathways are not redefined',()=>{
 assert.match(source,/this\.search=value;this\.render\(\)/);
 assert.match(source,/if\(a==='rate'\)\{this\.readDraft\(\);this\.draft\.tasteScales/);
 assert.match(source,/U\.updateTasteSelection\(sheet\.querySelector\('#ratings'\)/);
 assert.match(source,/coffeeListEmptyState\(this\.search,s\.coffees\.some\(c=>!c\.hidden\)\)/);
});
