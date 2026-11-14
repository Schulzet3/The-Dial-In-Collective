import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {selected260,original260} from '../scripts/audit/issue33-r185-260-check.mjs';
const chosen='<h1>Colombia Decaf</h1><h2>We love a good decaf!</h2>'+
 '<p>Did you know that decaf can be as delicious as a fully caffeinated coffee? We found that to be true with this crop.</p>'+
 "<h2>What you'll find in the cup:</h2>"+
 "<p>This is a full bodied coffee with sweet flavors of maple glaze and raspberry preserves. We also get some nice cinnamon-like spice with hints of ginger that's reminiscent of root beer.</p>";
const page=(product=chosen,related='')=>'<html><head><title>Previous Ethiopia coffee</title></head>'+
 '<body><nav>Swiss Water decaf Natural dark roast</nav><main><article class="product">'+product+'</article></main>'+
 related+'<footer>Swiss Water CO2 EA decaf recipes</footer></body></html>';
const parse=(product=chosen,related='')=>extractPublicCoffeeFacts(page(product,related),{source_url:original260.url});
test('#260 chosen H1 and selected product direct sensory context',()=>{
 const s=selected260(page());assert.equal(s.identity,true);assert.equal(s.notes,true);assert.equal(s.full_body,true);
});
test('#260 actual parser preserves exact selected identity over old page SEO',()=>{
 const p=parse();assert.equal(p.ok,true,JSON.stringify(p).slice(0,1500));assert.equal(p.fields?.name,'Colombia Decaf');
});
test('#260 direct tasting notes carry all published sensory substances',()=>{
 const p=parse();for(const v of ['maple glaze','raspberry','cinnamon','ginger','root beer'])assert.ok(
  String(p.fields?.tasting_notes||'').toLowerCase().includes(v),JSON.stringify(p).slice(0,2000));
});
test('#260 decaf identity alone does not establish the decaffeination METHOD',()=>{
 const p=parse();assert.ok(!p.fields?.decaffeination_method,JSON.stringify(p).slice(0,2000));
});
test('#260 full bodied is mouthfeel not roast tier',()=>{
 const p=parse();assert.ok(!p.fields?.roast_level,JSON.stringify(p).slice(0,1700));
});
test('#260 no selected green processing, producer or espresso recipe',()=>{
 const p=parse();assert.ok(!p.fields?.process&&!p.fields?.producer&&!p.fields?.espresso_recipe,JSON.stringify(p).slice(0,1700));
});
test('#260 unrelated nav/footer Swiss Water, CO2, EA cannot set decaf method',()=>{
 const p=parse();assert.ok(!p.fields?.decaffeination_method,JSON.stringify(p).slice(0,1800));
});
test('#260 related coffee cannot supply removed maple glaze',()=>{
 const s=selected260(page(chosen.replace('maple glaze','honey'),'<aside>Another coffee: maple glaze</aside>'));
 assert.equal(s.notes,false);
});
test('#260 changed selected H1 must fail original frozen identity',()=>{
 assert.equal(selected260(page(chosen.replace('<h1>Colombia Decaf</h1>','<h1>Peru Decaf</h1>'))).identity,false);
});
test('#260 seller editorial H1s cannot be mistaken for competing coffees',()=>{
 const sections=chosen.replace('<h2>We love a good decaf!</h2>','<h1>We love a good decaf!</h1>')
   .replace("<h2>What you'll find in the cup:</h2>","<h1>What you'll find in the cup:</h1>");
 const s=selected260(page(sections));assert.equal(s.headings.length,3);assert.equal(s.identity,true);
});
test('#260 a second real product H1 disqualifies selected evidence',()=>{
 assert.equal(selected260(page(chosen+'<h1>Ethiopia Guji Kercha</h1>')).identity,false);
});
test('#260 historical SEO title and footer cannot count as current official cup',()=>{
 const s=selected260(page('<h1>Colombia Decaf</h1><p>Simple decaf.</p>'));
 assert.equal(s.notes,false);
});
