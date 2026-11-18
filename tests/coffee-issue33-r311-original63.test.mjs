// Issue #33 R311: original603 #63 Organic Sumatra, selected-product source only.
import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {selectedCurrentPublishedSourcingRegion} from '../src/server/coffee-selected-published-sourcing-region.mjs';
import {productMarkup} from '../src/server/coffee-product-scope.mjs';
import {selectedProductHeadings} from '../scripts/audit/issue33-selected-product-heading.mjs';
import {identicalCurrentSelectedTitle} from '../scripts/audit/issue33-selected-public-alternate.mjs';
import {requiredFocusedSourceFailures} from '../scripts/audit/issue33-focused-source-acceptance.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../site/cloud/coffee-url-autofill.js';
const title='Organic Sumatra';
const url='https://coffeetraders.com/products/organic-sumatra';
const direct='<p>Tasting Notes: Nutty, Spicy, Earthy</p><p>Roast: Medium</p><p>Sumatra is the largest island in Western Indonesia. Sourced from the Takengon region within the province of Aceh, this coffee is grown on small holder farms.</p><p>Coffee in Indonesia is often wet-hulled, a regional processing tradition.</p><p>Also available as a Dark Roast.</p>';
const html=(name=title,seo='',tail='')=>'<html><head><meta property="og:site_name" content="Montana Coffee Traders">'+seo+'</head><body><main><article class="product"><h1>'+name+'</h1>'+direct+'</article></main>'+tail+'</body></html>';
test('R311 selected H1 and explicit Add Coffee / Source Review remain separate',()=>{
 const p=extractPublicCoffeeFacts(html(),{source_url:url});
 assert.equal(p.ok,true);
 assert.equal(p.fields.name,title);
 assert.deepEqual(selectedProductHeadings(productMarkup(html())),[title]);
 assert.match(coffeeUrlPreviewMarkup(p),/coffee-url-preview/);
 assert.equal(coffeeSourceReviewSnapshot({...p,source_url:url})?.type,'coffee_source_review');
});
test('R311 direct roast Medium is not replaced by link to sibling Dark',()=>{
 const p=extractPublicCoffeeFacts(html(),{source_url:url});
 assert.equal(p.ok,true);
 assert.equal(p.fields.roast_level,'Medium');
 assert.doesNotMatch(String(p.fields.roast_level||''),/Dark/i);
});
test('R311 direct sensory beats related dark-coffee flavor and process',()=>{
 const sibling='<aside class="related-products"><h2>Organic Sumatra Dark</h2><p>Dark roast, Blueberry, Licorice, Natural, Colombia</p></aside>';
 const p=extractPublicCoffeeFacts(html(title,'',sibling),{source_url:url});
 assert.equal(p.ok,true);
 assert.doesNotMatch(String(p.fields.tasting_notes||''),/Blueberry|Licorice/i);
 assert.doesNotMatch(String(p.fields.origin||''),/Colombia/i);
 assert.doesNotMatch(String(p.fields.process||''),/Natural/i);
});
test('R311 generic global SEO and Whitefish roastery cannot replace selected farm',()=>{
 const seo='<meta name="description" content="Brazil natural coffee, blueberry and caramel"><meta property="og:description" content="Colombia dark roast">';
 const p=extractPublicCoffeeFacts(html(title,seo,'<footer>Montana Coffee Traders roastery Whitefish, Montana. Ethiopia coffee coming soon.</footer>'),{source_url:url});
 assert.equal(p.ok,true);
 assert.doesNotMatch(String(p.fields.origin||''),/Brazil|Colombia|Whitefish|Montana|Ethiopia/i);
 assert.doesNotMatch(String(p.fields.tasting_notes||''),/Blueberry|Caramel/i);
});
test('R311 changed product identity, failed source and duplicated capture fail closed',()=>{
 const changed='Organic Sumatra Dark';
 const p=extractPublicCoffeeFacts(html(changed),{source_url:url});
 assert.equal(p.ok,true);
 assert.equal(identicalCurrentSelectedTitle(title,changed,p.fields.name),false);
 const good={number:63,archived_coffee:title,status:'FETCHED',parser_ok:true,selected_h1:[title],
 selected_h1_present_in_scoped_html:true,selected_heading_identity_verified:true,
 current_fields:{name:title},add_coffee_ui_rendered:true,source_review_rendered:true};
 assert.deepEqual(requiredFocusedSourceFailures([63],[good]),[]);
 for(const bad of [[],[good,good],[{...good,status:'UNAVAILABLE'}],
  [{...good,parser_ok:false}],[{...good,selected_heading_identity_verified:false}],
  [{...good,add_coffee_ui_rendered:false}],[{...good,source_review_rendered:false}]])
  assert.ok(requiredFocusedSourceFailures([63],bad).length>0);
});

test('R311 current direct sourcing region refines only this current chosen coffee',()=>{
 const p=extractPublicCoffeeFacts(html(),{source_url:url});
 assert.equal(p.ok,true);
 assert.equal(p.fields.origin,'Takengon, Aceh, Sumatra, Indonesia');
 assert.equal(p.fields.process,'Other/Unknown');
 assert.ok((p.source_facts||[]).some(f=>f.field==='origin'&&
  /sourced\/grown area/.test(String(f.label||''))));
});
test('R311 sourced-region grammar refuses old lot, unselected or mill provenance',()=>{
 const good={tag:'p',text:'Sumatra is in Indonesia. Sourced from the Takengon region within the province of Aceh, this coffee is grown on small holder farms.'};
 const blocks=[{tag:'h1',text:title},good];
 const get=b=>selectedCurrentPublishedSourcingRegion({name:title,origin:'Sumatra, Indonesia',blocks:b});
 assert.equal(get(blocks)?.value,'Takengon, Aceh, Sumatra, Indonesia');
 for(const falseProof of [
  'Previously sourced from the Takengon region within the province of Aceh, this coffee is grown by families.',
  'Sourced from the Takengon region within the province of Aceh, another coffee is grown there.',
  'The processing mill is located in Takengon in Aceh; the coffee is grown elsewhere.',
  'Sourced from the Takengon region within the province of Aceh, this coffee was grown in a past harvest.'
 ])assert.equal(get([{tag:'h1',text:title},{tag:'p',text:falseProof}]),null);
 assert.equal(get([{tag:'h1',text:'Organic Sumatra Dark'},good]),null);
 assert.equal(get([{tag:'h1',text:title},good,{tag:'h1',text:'Other coffee'}]),null);
 assert.equal(get([{tag:'h1',text:title},good,{tag:'p',text:'Sourced from the Gayo region within the province of Aceh, this coffee is grown by local farmers.'}]),null);
 assert.equal(selectedCurrentPublishedSourcingRegion({name:title,origin:'Indonesia',blocks}),null);
 assert.equal(selectedCurrentPublishedSourcingRegion({name:title,origin:'Sumatra, Indonesia',blocks:[{tag:'h1',text:title},{...good,educational:true}]}),null);
});
