// #33 R323 selected original603 #99: current own Swiss Water vs generic roaster method.
import test from 'node:test';
import assert from 'node:assert/strict';
import {selected99} from '../scripts/audit/issue33-r323-original99-check.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {requiredFocusedSourceFailures} from '../scripts/audit/issue33-focused-source-acceptance.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../site/cloud/coffee-url-autofill.js';
const url='https://dekaf.com/products/guatemala-finca-santa-isabel';
const name='Guatemala Finca Santa Isabel';
const own="Shade-grown, this decaf single origin gem teems with bonbon-like caramel, clementine sparkle, and crisp green apple notes. It is a standout medium roast.";
const decaf="Dekáf'd by way of Swiss Water® Process";
const fixture=(description=own+' ROAST: Medium '+decaf,heading=name,related='')=>
 '<html><head><meta property="og:site_name" content="DEKÁF"></head><body><main><article class="product"><h1>'+heading+'</h1><div class="product__description">'+description+'</div></article>'+related+'</main></body></html>';
test('R323 source-bound selected original #99 owns self-decaf method, medium and three notes',()=>{
 const d=selected99(fixture());
 assert.equal(d.exactSelectedHeading,true);
 assert.ok(Object.values(d.direct).every(Boolean),JSON.stringify(d.direct));
 const p=extractPublicCoffeeFacts(fixture(),{source_url:url});
 assert.equal(p.ok,true);assert.equal(p.fields.name,name);
 assert.equal(p.fields.decaffeination_method,'Water Process');
 assert.ok(!p.fields.process,'decaffeination is not green coffee process');
});
test('R323 changed H1 cannot be certified by selected SEO/old URL',()=>{
 const d=selected99(fixture(own+' ROAST: Medium '+decaf,'Other Guatemala Coffee'));
 assert.equal(d.exactSelectedHeading,false);
});
test('R323 unrelated sibling and site navigation cannot supply own decaf method',()=>{
 const d=selected99(fixture(own+' ROAST: Medium',name,'<aside class="related-products">'+decaf+'</aside><nav>'+decaf+'</nav>'));
 assert.equal(d.direct.water,false);
});
test('R323 unrelated sibling and navigation cannot supply missing selected flavors',()=>{
 const d=selected99(fixture('This decaf single origin is great. ROAST: Medium '+decaf,name,'<aside>caramel clementine green apple</aside>'));
 assert.equal(d.direct.notes,false);
});
test('R323 roaster footer and generic origin do not provide selected coffee detail',()=>{
 const d=selected99(fixture(own+' ROAST: Medium',name,'<footer>'+decaf+' Swiss Water</footer>'));
 assert.equal(d.direct.water,false);
 const p=extractPublicCoffeeFacts(fixture(own+' ROAST: Medium'),{source_url:url});
 assert.ok(!p.fields.process&&!p.fields.variety&&!p.fields.elevation_m,'unpublished origin details remain blank');
});
test('R323 Add Coffee remains opt-in preview and private Source Review',()=>{
 const p=extractPublicCoffeeFacts(fixture(),{source_url:url});
 assert.equal(p.ok,true);
 assert.match(coffeeUrlPreviewMarkup(p),/coffee-url-preview/);
 assert.equal(coffeeSourceReviewSnapshot({...p,source_url:url})?.type,'coffee_source_review');
});
test('R323 required current official-source gate rejects unavailable and false UI',()=>{
 const good={number:99,status:'FETCHED',archived_coffee:name,parser_ok:true,selected_h1:[name],
  selected_h1_present_in_scoped_html:true,selected_heading_identity_verified:true,current_fields:{name},
  add_coffee_ui_rendered:true,source_review_rendered:true};
 assert.deepEqual(requiredFocusedSourceFailures([99],[good]),[]);
 assert.ok(requiredFocusedSourceFailures([99],[{...good,status:'UNAVAILABLE'}]).length>0);
 assert.ok(requiredFocusedSourceFailures([99],[{...good,add_coffee_ui_rendered:false}]).length>0);
 assert.ok(requiredFocusedSourceFailures([99],[{...good,selected_heading_identity_verified:false}]).length>0);
});
