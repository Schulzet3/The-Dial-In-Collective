import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {quartermaineCases,quartermaineSelected} from '../scripts/audit/issue33-r187-quartermaine-check.mjs';
const stories={
 262:"From the Andes Mountains in Colombia's Huila region, this coffee is a rare find. Shade grown, sun dried, and beautifully prepared, this high-altitude coffee offers more than enough flavor and acidity to stand up to our deep signature roast. 100% Typica (an heirloom variety of the Arabica species), it boasts penetrating acidity and notes of caramel.",
 263:"From the Tarrazu region of Costa Rica, this coffee opens with a floral aroma. Our signature roast marries its medium body with bright acidity, notes of baking chocolate, and hints of citrus rind on the finish.",
 264:"A full-bodied coffee with low acidity, it has earthy, spicy notes that are sometimes described as tasting like dark chocolate or tobacco. Sumatran coffee is a great choice for those who prefer a bolder, richer coffee."
};
const product=(n)=>'<h1>'+quartermaineCases[n].name+'</h1><p>'+stories[n]+'</p>';
const page=(n,markup=product(n),related='')=>'<html><head><title>Old Other Coffee - Dark Roast</title></head>'+
 '<body><nav>Process: Natural; Producer: Old Estate</nav><main><article class="product">'+markup+'</article></main>'+
 related+'<footer>Swiss Water Decaf Dark Roast Old Estate</footer></body></html>';
const parse=(n,markup=product(n),related='')=>extractPublicCoffeeFacts(page(n,markup,related),{source_url:quartermaineCases[n].url});
for(const n of [262,263,264]){
 test('#'+n+' exact selected source identity and literal own story',()=>{
  const s=quartermaineSelected(page(n),n);assert.equal(s.identity,true);assert.equal(s.direct,true,JSON.stringify(s));
 });
 test('#'+n+' actual parser chooses selected product over stale SEO',()=>{
  const p=parse(n);assert.equal(p.ok,true,JSON.stringify(p).slice(0,1800));
  assert.equal(p.fields?.name,quartermaineCases[n].name,JSON.stringify(p).slice(0,1800));
 });
 test('#'+n+' unsupported processing/producer/decaf/roast cannot come from nav/footer',()=>{
  const p=parse(n);assert.ok(!p.fields?.process&&!p.fields?.producer&&!p.fields?.decaffeination_method&&!p.fields?.roast_level,
   JSON.stringify(p).slice(0,2200));
 });
 test('#'+n+' changed selected H1 disqualifies original chosen identity',()=>{
  const bad=page(n,product(n).replace('<h1>'+quartermaineCases[n].name+'</h1>','<h1>Different Crop</h1>'));
  assert.equal(quartermaineSelected(bad,n).identity,false);
 });
 test('#'+n+' related/sibling notes cannot supply missing selected description',()=>{
  const html=page(n,'<h1>'+quartermaineCases[n].name+'</h1><p>No tasting information given.</p>',
   '<aside>'+stories[n]+'</aside>');
  assert.equal(quartermaineSelected(html,n).direct,false);
 });
}
test('#262 Typica is selected variety; caramel note is directly selected',()=>{
 const p=parse(262);assert.ok(String(p.fields?.variety||'').toLowerCase().includes('typica'),JSON.stringify(p).slice(0,2400));
 assert.ok(String(p.fields?.tasting_notes||'').toLowerCase().includes('caramel'),JSON.stringify(p).slice(0,2400));
});
test('#263 medium BODY cannot become a medium ROAST label',()=>{
 const p=parse(263);assert.ok(!p.fields?.roast_level,JSON.stringify(p).slice(0,2200));
});
test('#263 selected baking chocolate and citrus finish remain in notes',()=>{
 const p=parse(263),s=String(p.fields?.tasting_notes||'').toLowerCase();
 assert.ok(s.includes('baking chocolate')&&s.includes('citrus rind'),JSON.stringify(p).slice(0,2500));
});
test('#264 selected earthy/spicy notes retained, not inferred as processing',()=>{
 const p=parse(264),s=String(p.fields?.tasting_notes||'').toLowerCase();
 assert.ok(s.includes('earthy')&&s.includes('spicy')&&!p.fields?.process,JSON.stringify(p).slice(0,2400));
});
test('#262 direct selected process label is valid while sun-dried growing narrative alone is not',()=>{
 const p=parse(262,product(262)+'<p>Process: Washed</p>');
 assert.equal(p.fields?.process,'Washed',JSON.stringify(p).slice(0,2400));
});
