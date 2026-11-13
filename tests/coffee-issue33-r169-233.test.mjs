import test from 'node:test';
import assert from 'node:assert/strict';
import {chosen233,selected233} from '../scripts/audit/issue33-r169-233-check.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
const description='This coffee beautifully showcases the complexity of African coffees—and Ethiopian coffees in particular. Medium-bodied with a delicate floral aroma, it reveals notes of apricot and dark honey, finishing with a soft hint of vanilla. A true roaster’s favorite.';
const own='<h1>Ethiopia Yirgacheffe</h1><p>'+description+'</p>';
const page=(body=own,other='')=>'<html><head><title>Old Colombia Caturra Washed Medium</title><meta name="description" content="Other coffee strawberry orange"></head><body>'+
 '<nav>Kenya natural dark cocoa</nav><main><article class="product">'+body+'</article></main>'+other+
 '<footer>Guatemala floral vanilla honey</footer></body></html>';
const parse=html=>extractPublicCoffeeFacts(html,{source_url:chosen233.url});
test('#233 one selected identity and four directly printed prose descriptors',()=>{
 const r=selected233(page());assert.equal(r.identity,true);
 assert.deepEqual(Object.entries(r.direct).filter(([,ok])=>!ok),[]);
});
test('#233 changed selected H1 cannot certify archived Ethiopia product',()=>{
 assert.equal(selected233(page(own.replace('<h1>Ethiopia Yirgacheffe</h1>','<h1>Kenya Washed 2026</h1>'))).identity,false);
});
test('#233 unrelated product paragraph cannot supply removed vanilla',()=>{
 const body=own.replace('soft hint of vanilla','soft finish');
 const r=selected233(page(body,'<aside><p>soft hint of vanilla</p></aside>'));assert.equal(r.direct.vanilla,false);
});
test('#233 unrelated product paragraph cannot supply removed floral',()=>{
 const body=own.replace('delicate floral aroma','delicate aroma');
 const r=selected233(page(body,'<aside><p>delicate floral aroma</p></aside>'));assert.equal(r.direct.floral,false);
});
test('#233 single selected prose source is required, not duplicate conflicting paragraphs',()=>{
 const r=selected233(page(own+'<p>'+description+'</p>'));assert.equal(r.direct.apricot_dark_honey,false);
});
test('#233 medium-bodied prose is not categorical Medium roast',()=>{
 const p=parse(page());assert.ok(!p.fields?.roast_level,JSON.stringify(p).slice(0,2000));
});
test('#233 actual parser must retain direct apricot and dark honey',()=>{
 const p=parse(page());assert.ok(['apricot','dark honey'].every(x=>String(p.fields?.tasting_notes||'').toLowerCase().includes(x)),JSON.stringify(p).slice(0,2000));
});
test('#233 actual parser should retain own floral aroma and vanilla finish',()=>{
 const p=parse(page());assert.ok(['floral','vanilla'].every(x=>String(p.fields?.tasting_notes||'').toLowerCase().includes(x)),JSON.stringify(p).slice(0,2500));
});
test('#233 no unpublished process, variety, producer, elevation, decaf or recipe can be fabricated',()=>{
 const p=parse(page());for(const k of ['process','variety','producer','elevation_m','decaffeination_method','espresso_recipe'])assert.ok(!p.fields?.[k],k+': '+JSON.stringify(p).slice(0,1600));
});
test('#233 historical SEO and unrelated aside must not override chosen identity or notes',()=>{
 const p=parse(page(own,'<aside><h2>Other coffee</h2><p>Roast Level: Dark; Process: Honey; Tasting notes: Strawberry, Coconut</p></aside>'));
 assert.equal(p.fields?.name,chosen233.name);assert.ok(!String(p.fields?.tasting_notes||'').toLowerCase().includes('strawberry'),JSON.stringify(p).slice(0,1500));
});

test('#233 direct printed Notes list outranks longer unlabelled aroma and finish prose',()=>{
 const p=parse(page(own+'<p>Tasting Notes: Apricot, Dark Honey</p>'));
 assert.ok(!String(p.fields?.tasting_notes||'').toLowerCase().includes('vanilla'),JSON.stringify(p).slice(0,2400));
 assert.ok(!String(p.fields?.tasting_notes||'').toLowerCase().includes('floral'),JSON.stringify(p).slice(0,2400));
});
test('#233 another product aside cannot complete missing own sensory arc',()=>{
 const body=own.replace('delicate floral aroma','delicate aroma').replace('soft hint of vanilla','soft finish');
 const p=parse(page(body,'<aside><p>'+description+'</p></aside>'));
 assert.ok(!String(p.fields?.tasting_notes||'').toLowerCase().includes('floral'),JSON.stringify(p).slice(0,1400));
 assert.ok(!String(p.fields?.tasting_notes||'').toLowerCase().includes('vanilla'),JSON.stringify(p).slice(0,1400));
});
test('#233 conditional aroma or finish must not augment literal notes',()=>{
 const conditional=own.replace('with a delicate floral aroma','when brewed with milk, with a delicate floral aroma');
 const p=parse(page(conditional));
 assert.ok(!String(p.fields?.tasting_notes||'').toLowerCase().includes('floral'),JSON.stringify(p).slice(0,2200));
 assert.ok(!String(p.fields?.tasting_notes||'').toLowerCase().includes('vanilla'),JSON.stringify(p).slice(0,2200));
});
test('#233 changed selected coffee must not promote archived original identity',()=>{
 const replaced=own.replace('<h1>Ethiopia Yirgacheffe</h1>','<h1>Kenya Washed 2026</h1>');
 const p=parse(page(replaced));
 assert.notEqual(p.fields?.name,chosen233.name);
});
