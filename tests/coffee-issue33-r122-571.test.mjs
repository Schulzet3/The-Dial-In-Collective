import test from 'node:test';
import assert from 'node:assert/strict';
import {selected122,direct122,fields122Ok} from '../scripts/audit/issue33-r122-571-check.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
const prose=selected122.own.map(s=>'<p>'+s+'</p>').join('');
const page=(body=prose,heading=selected122.name,other='')=>'<html><head><title>Stage Line Coffee</title></head><body><main><article class="product"><h1>'+
 heading+'</h1><section class="product__description">'+body+'</section></article>'+other+'</main></body></html>';
test('exact selected coffee H1 and its two independent 50% processing components are source-bound',()=>{
 const d=direct122(page());assert.equal(d.uniqueH1,true,JSON.stringify(d));assert.ok(d.own.every(x=>x.matched),JSON.stringify(d));
});
test('a changed or doubled product H1 cannot claim the original selected identity',()=>{
 assert.equal(direct122(page(prose,'Ethiopia Aricha Natural')).uniqueH1,false);
 assert.equal(direct122(page().replace('</h1>','</h1><h1>Other release</h1>')).uniqueH1,false);
});
test('SEO, menu, or recommended product prose is not selected direct processing evidence',()=>{
 const d=direct122(page('Select quantity',''+selected122.name,
   '<aside>'+prose+'</aside><nav>'+prose+'</nav><footer>'+prose+'</footer><script>'+prose+'</script>'));
 assert.ok(d.own.some(x=>!x.matched),JSON.stringify(d));
});
test('both 50% processing methods must be present, neither may silently replace the other',()=>{
 assert.ok(direct122(page(prose.replace('honey processed','naturally processed'))).own.some(x=>!x.matched));
 assert.ok(direct122(page(prose.replace('naturally processed','honey processed'))).own.some(x=>!x.matched));
});
test('mixed Natural and Honey must never become a single whole-coffee Natural or Honey process',()=>{
 const valid={name:selected122.name,origin:'Brazil',process:'Other/Unknown'};
 assert.equal(fields122Ok(valid),true);
 assert.equal(fields122Ok({...valid,process:'Natural'}),false);
 assert.equal(fields122Ok({...valid,process:'Honey'}),false);
});
test('program name, missing roast or other coffee notes must not become selected producer, roast or flavor',()=>{
 const valid={name:selected122.name,origin:'Brazil',process:'Other/Unknown'};
 assert.equal(fields122Ok({...valid,producer:'Capricornio'}),false);
 assert.equal(fields122Ok({...valid,roast_level:'Medium'}),false);
 assert.equal(fields122Ok({...valid,tasting_notes:'Nano Challa Orange Blossom'}),false);
});
test('actual parser accepts source-shaped exact current selected product',()=>{
 const p=extractPublicCoffeeFacts(page(),{source_url:selected122.url});
 assert.equal(p.ok,true,JSON.stringify(p));
 assert.equal(p.fields?.name,selected122.name,JSON.stringify(p.fields));
});
