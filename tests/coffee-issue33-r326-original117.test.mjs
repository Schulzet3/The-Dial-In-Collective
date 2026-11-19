import test from 'node:test';
import assert from 'node:assert/strict';
import {selected117} from '../scripts/audit/issue33-r326-original117-check.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../site/cloud/coffee-url-autofill.js';
import {requiredFocusedSourceFailures} from '../scripts/audit/issue33-focused-source-acceptance.mjs';
const url='https://enjoycoffeeroasters.com/products/stanislas-kayitera',name='Stanislas Kayitera';
const facts='<p>Producer: Stanislas Kayitera</p><p>Origin: Bushekeri Sector, Nyamasheke District, Western Province, Rwanda</p><p>Elevation: 1700 MASL</p><p>Variety: Red Bourbon</p><p>Process: Washed</p><p>Roast Level: Light</p><p>Importer: Sundog Trading</p><p>Flavor Notes: Lemon, Caramel, Honey, Floral</p><p>Stanislas floats the cherries then introduces them to a brief 10 hour in-cherry oxygen light / anaerobic light fermentation before traditional wet fermentation.</p>';
const fixture=(own=facts,heading=name,other='')=>'<html><body><main><article class="product"><h1>'+heading+'</h1><div class="product__description">'+own+'</div></article>'+other+'</main></body></html>';
const parsed=html=>extractPublicCoffeeFacts(html,{source_url:url});
test('R326 exact selected current identity and own source signals',()=>{
 const s=selected117(fixture());assert.equal(s.exact,true);
 for(const k of ['producer','washed','rwanda','variety','notes','fermentation'])assert.equal(s[k],true,k);
});
test('R326 explicit selected Process Washed is not overwritten by in-cherry anaerobic-light stage',()=>{
 const p=parsed(fixture());assert.equal(p.ok,true);assert.equal(p.fields?.process,'Washed');
});
test('R326 explicit producer remains farmer, not named importer',()=>{
 const p=parsed(fixture());assert.equal(p.ok,true);assert.equal(p.fields?.producer,'Stanislas Kayitera');
});
test('R326 direct selected roast, variety and flavor are read from own labels',()=>{
 const p=parsed(fixture());assert.equal(p.ok,true);
 assert.equal(p.fields?.roast_level,'Light');assert.match(String(p.fields?.variety||''),/Red Bourbon/i);
 assert.match(String(p.fields?.tasting_notes||''),/Lemon/i);
});
test('R326 washing-station manager does not override explicit selected producer',()=>{
 const p=parsed(fixture('<p>Producer: Stanislas Kayitera</p><p>Process: Washed</p><p>Baho washing station manager: Aphrodis</p>'));
 assert.equal(p.ok,true);assert.equal(p.fields?.producer,'Stanislas Kayitera');
});
test('R326 sibling and footer must not count as current own source',()=>{
 const s=selected117(fixture('<p>Unspecified Rwanda coffee</p>',name,'<aside>'+facts+'</aside><footer>'+facts+'</footer>'));
 assert.equal(s.producer,false);assert.equal(s.notes,false);assert.equal(s.washed,false);
});
test('R326 changed current product heading blocks original identity',()=>{
 assert.equal(selected117(fixture(facts,'Another Rwanda Coffee')).exact,false);
});
test('R326 Add Coffee preview and source review remain available without auto save',()=>{
 const p=parsed(fixture());assert.equal(p.ok,true);assert.match(coffeeUrlPreviewMarkup(p),/coffee-url-preview/);
 assert.equal(coffeeSourceReviewSnapshot({...p,source_url:url})?.type,'coffee_source_review');
});
test('R326 unavailable or unreviewed official source fails acceptance',()=>{
 const good={number:117,status:'FETCHED',archived_coffee:name,parser_ok:true,selected_h1:[name],
 selected_h1_present_in_scoped_html:true,selected_heading_identity_verified:true,
 current_fields:{name},add_coffee_ui_rendered:true,source_review_rendered:true};
 assert.deepEqual(requiredFocusedSourceFailures([117],[good]),[]);
 assert.ok(requiredFocusedSourceFailures([117],[{...good,status:'UNAVAILABLE'}]).length);
 assert.ok(requiredFocusedSourceFailures([117],[{...good,source_review_rendered:false}]).length);
});
