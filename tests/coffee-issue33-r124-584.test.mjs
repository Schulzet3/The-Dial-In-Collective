import test from 'node:test';
import assert from 'node:assert/strict';
import {selected124,direct124,fields124Ok} from '../scripts/audit/issue33-r124-584-check.mjs';
import {selectedCurrentTradeElevationRegion} from '../src/server/coffee-selected-trade-elevation-region.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
const own='<p>'+selected124.primary+'</p><p>Flavor Notes: Rich Dark Chocolate, Black Pepper</p>';
const page=(body=own,h1=selected124.name,extra='')=>'<html><head><title>Coffee Exchange</title><script type="application/ld+json">'+
 JSON.stringify({'@context':'https://schema.org','@type':'Product',name:h1,url:selected124.url,description:'Honduras Comsa – Washed, Espresso'})+
 '</script></head><body><main><article class="product"><h1>'+h1+'</h1><section class="product__description">'+body+'</section></article>'+extra+'</main></body></html>';
const blocks=(caption=selected124.primary,h1=selected124.name,section='')=>[
 {tag:'h1',text:h1,section:''},{tag:'p',text:caption,section,educational:false}];
const region=b=>selectedCurrentTradeElevationRegion({name:selected124.name,origin:'Honduras',blocks:b});
test('unique selected product current caption supports La Paz, Honduras',()=>{
 const d=direct124(page());assert.equal(d.uniqueH1,true);assert.equal(d.directCaption,true);
 assert.equal(region(blocks())?.value,'La Paz, Honduras');
});
test('changed or doubled H1 fails closed',()=>{
 assert.equal(direct124(page(own,'Different coffee')).uniqueH1,false);
 assert.equal(direct124(page().replace('</h1>','</h1><h1>Another product</h1>')).uniqueH1,false);
 assert.equal(region(blocks(selected124.primary,'Different coffee')),null);
 assert.equal(region([...blocks(),{tag:'h1',text:'Other'}]),null);
});
test('SEO, sibling card, menu, and educational text cannot certify selected local region',()=>{
 assert.equal(direct124(page('<p>Buy</p>',selected124.name,'<aside>'+own+'</aside><nav>'+own+'</nav><footer>'+own+'</footer>')).directCaption,false);
 assert.equal(region(blocks(selected124.primary,selected124.name,'Related products')),null);
 assert.equal(region(blocks(selected124.primary,selected124.name,'Education')),null);
});
test('missing elevation, locality or historical context is withheld',()=>{
 for(const s of ['Fair Trade / Organic • 1200-1750 meters','Fair Trade / Organic • La Paz • no altitude',
  'Previously Fair Trade / Organic • La Paz • 1200-1750 meters'])
  assert.equal(region(blocks(s)),null,s);
});
test('two inconsistent directly printed regions are not silently resolved',()=>{
 assert.equal(region([...blocks(),{tag:'p',text:'Fair Trade / Organic • Copan • 1200-1750 meters',section:''}]),null);
});
test('broad country and unsupported roast/process/notes are not full acceptance',()=>{
 const f={name:selected124.name,origin:'La Paz, Honduras',process:'Washed',roast_level:'Dark',tasting_notes:'Rich Dark Chocolate, Black Pepper'};
 assert.equal(fields124Ok(f),true);
 for(const patch of [{origin:'Honduras'},{origin:'Jarabacoa, Dominican Republic'},{process:'Natural'},{roast_level:'Medium-Dark'},{tasting_notes:'Rich Dark Chocolate'},{decaffeination_method:'Ethyl Acetate'}])
  assert.equal(fields124Ok({...f,...patch}),false,JSON.stringify(patch));
});
test('actual parser recognizes selected exact URL-anchored mock',()=>{
 const p=extractPublicCoffeeFacts(page(),{source_url:selected124.url});
 assert.equal(p.ok,true,JSON.stringify(p));
 assert.equal(p.fields?.name,selected124.name,JSON.stringify(p.fields));
});
