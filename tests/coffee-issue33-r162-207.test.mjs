import test from 'node:test';
import assert from 'node:assert/strict';
import {chosen207,selected207Source} from '../scripts/audit/issue33-r162-207-check.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
const own='<h1>Special House Blend</h1><p>Our Special House Blend delivers rich mocha notes in every sip. '+
 'Discover the rich taste of our hand-crafted coffee beans, roasted daily for unmatched freshness. '+
 'We take pride in delivering the finest coffee straight to your door from the beautiful Lowcountry of South Carolina.</p>'+
 '<dl><dt>Roast:</dt><dd>Medium</dd><dt>Flavor:</dt><dd>Nutmeg, Whole Bean Vanilla, Creamy Butter</dd></dl>';
const inline='<h1>Special House Blend</h1><p>Our Special House Blend delivers rich mocha notes in every sip. '+
 'We roast locally in the Lowcountry of South Carolina.</p>'+
 '<p>Roast: Medium</p><p>Flavor: Nutmeg, Whole Bean Vanilla, Creamy Butter</p>';
const page=(body=inline,unrelated='')=>'<html><head><title>Archived Almond Chocolate United States Blend</title>'+
 '<meta name="description" content="Historic Almond, Chocolate; produced in the USA"></head><body>'+
 '<nav>South Carolina roasted Brazilian decaf</nav><main><article class="product">'+body+
 '</article></main>'+unrelated+'<footer>Other coffees from Brazil and Colombia, Almond Chocolate</footer></body></html>';
test('#207 current selected own heading and its four bounded literal details',()=>{
 const x=selected207Source(page());assert.equal(x.exactSelectedTitle,true);
 assert.deepEqual(Object.entries(x.direct).filter(([,v])=>!v),[]);
});
test('#207 changed H1 must invalidate archived coffee identity',()=>{
 assert.equal(selected207Source(page(inline.replace('<h1>Special House Blend</h1>','<h1>Different House Blend</h1>'))).exactSelectedTitle,false);
});
test('#207 selected roast cannot be borrowed from related products',()=>{
 const s=selected207Source(page(inline.replace('Roast: Medium','Roast: unavailable'),'<aside>Roast: Medium</aside>'));
 assert.equal(s.direct.medium_roast,false);
});
test('#207 selected Flavor cannot borrow other SKU notes',()=>{
 const s=selected207Source(page(inline.replace('Flavor: Nutmeg, Whole Bean Vanilla, Creamy Butter','Flavor: unavailable'),
 '<section class="related-products">Flavor: Nutmeg, Whole Bean Vanilla, Creamy Butter</section>'));
 assert.equal(s.direct.printed_nutmeg_flavor,false);
});
test('#207 selected mocha prose cannot be sourced from footer',()=>{
 const s=selected207Source(page(inline.replace('rich mocha notes','a pleasant balanced cup'),
 '<footer>rich mocha notes from another coffee</footer>'));
 assert.equal(s.direct.mocha_narrative,false);
});
test('#207 direct selected process is not invented from navigation or page SEO',()=>{
 const p=extractPublicCoffeeFacts(page(),{source_url:chosen207.url});
 assert.equal(p.fields?.process,undefined,JSON.stringify(p));
});
test('#207 direct local roaster is not fabricated as a green-coffee country',()=>{
 const p=extractPublicCoffeeFacts(page(),{source_url:chosen207.url});
 assert.notEqual(p.fields?.origin,'United States',JSON.stringify(p));
});
test('#207 actual parser chooses selected name over recycled title',()=>{
 const p=extractPublicCoffeeFacts(page(),{source_url:chosen207.url});
 assert.equal(p.fields?.name,'Special House Blend',JSON.stringify(p));
});
test('#207 literal selected Medium roast remains a real categorical roast',()=>{
 const p=extractPublicCoffeeFacts(page(),{source_url:chosen207.url});
 assert.equal(p.fields?.roast_level,'Medium',JSON.stringify(p));
});
test('#207 unrelated floral flavor cannot replace chosen selected flavor',()=>{
 const p=extractPublicCoffeeFacts(page(inline,'<aside><h2>Another Coffee</h2>Flavor: Jasmine, Bergamot</aside>'),{source_url:chosen207.url});
 assert.ok(!/jasmine|bergamot/iu.test(p.fields?.tasting_notes||''),JSON.stringify(p));
});
