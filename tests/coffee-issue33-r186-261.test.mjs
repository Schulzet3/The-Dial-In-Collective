import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {selected261,original261} from '../scripts/audit/issue33-r186-261-check.mjs';
const region='<h2>About the Producer:</h2><p>The Guji region is named for one of the tribes of the Oromo and is one of the administrative zones of the Oromia region. The zone was created in 2002 when the uplands of Borena zone were split to create it.</p>';
const climate='<h2>About the Process:</h2><p>The Guji region enjoys ideal coffee growing conditions. Its volcanic soil is bursting with nutrients, creating deep red and brown top-layer of soil. The regions high altitude, bi-modal rainfall pattern and dry weather allow for the cherries to develop slowly.</p>';
const cup="<h2>What you'll find in the cup:</h2><p>This coffee has those classic bursting fruit flavors we've come to love about natural Ethiopian coffees. It reminds us of sweet strawberries and agave nectar with a buttery mouthfeel and a pleasant acidity that makes us think of granny smith apples.</p>";
const chosen='<h1>Ethiopia Guji Kercha</h1>'+region+climate+cup;
const page=(product=chosen,related='')=>'<html><head><title>Old Kenya producer Other Estate</title></head>'+
 '<body><nav>Producer Other Estate Washed process</nav><main><article class="product">'+product+'</article></main>'+
 related+'<footer>Decaf Dark roast Swiss Water</footer></body></html>';
const parse=(product=chosen,related='')=>extractPublicCoffeeFacts(page(product,related),{source_url:original261.url});
test('#261 exact selected H1 and all current direct cup words',()=>{
 const s=selected261(page());assert.equal(s.identity,true);assert.equal(s.cup,true);assert.equal(s.natural_analogy,true);
});
test('#261 current parser chooses product identity over old SEO page title',()=>{
 const p=parse();assert.equal(p.ok,true,JSON.stringify(p).slice(0,1500));assert.equal(p.fields?.name,'Ethiopia Guji Kercha');
});
test('#261 real selected tasting substances remain intact',()=>{
 const p=parse();for(const v of ['strawberr','agave','granny smith apple'])assert.ok(
  String(p.fields?.tasting_notes||'').toLowerCase().includes(v),JSON.stringify(p).slice(0,2200));
});
test('#261 natural Ethiopian *comparison* does not establish current lot processing',()=>{
 const p=parse();assert.ok(!p.fields?.process,JSON.stringify(p).slice(0,1800));
});
test('#261 section titled About the Process with soil/climate only is not processed Natural or Washed',()=>{
 const p=parse('<h1>Ethiopia Guji Kercha</h1>'+climate);assert.ok(!p.fields?.process,JSON.stringify(p).slice(0,1700));
});
test('#261 regional Guji/Oromo background cannot become named producer',()=>{
 const p=parse();assert.ok(!p.fields?.producer,JSON.stringify(p).slice(0,1800));
});
test('#261 buttery mouthfeel or acidity does not imply roast or processing',()=>{
 const p=parse();assert.ok(!p.fields?.roast_level&&!p.fields?.process,JSON.stringify(p).slice(0,1800));
});
test('#261 unrelated nav/footer and related card cannot supply producer, roast or decaf method',()=>{
 const p=parse(chosen,'<aside><h2>Kenya</h2><p>Producer: Other Estate, Roast: Dark, Swiss Water decaf</p></aside>');
 assert.ok(!p.fields?.producer&&!p.fields?.roast_level&&!p.fields?.decaffeination_method,JSON.stringify(p).slice(0,1800));
});
test('#261 a direct selected process label is distinguishable from the natural comparison',()=>{
 const p=parse('<h1>Ethiopia Guji Kercha</h1><p>Process: Washed</p>'+cup);
 assert.equal(p.fields?.process,'Washed',JSON.stringify(p).slice(0,1600));
});
test('#261 a genuine selected naturally processed statement remains extractable',()=>{
 const p=parse('<h1>Ethiopia Guji Kercha</h1><p>This coffee is naturally processed and dried in the cherry.</p>');
 assert.equal(p.fields?.process,'Natural',JSON.stringify(p).slice(0,1700));
});
test('#261 changed product H1 must disqualify frozen selected identity',()=>{
 assert.equal(selected261(page(chosen.replace('<h1>Ethiopia Guji Kercha</h1>','<h1>Peru Microlot</h1>'))).identity,false);
});
test('#261 three editorial H1s are merchant sections, but a second real coffee H1 is not',()=>{
 const withH1=chosen.replace(/<h2>/g,'<h1>').replace(/<\/h2>/g,'</h1>');
 assert.equal(selected261(page(withH1)).identity,true);
 assert.equal(selected261(page(withH1+'<h1>Colombia Decaf</h1>')).identity,false);
});
test('#261 notes from a related card do not establish missing selected cup',()=>{
 const s=selected261(page('<h1>Ethiopia Guji Kercha</h1><p>Only local history.</p>',
   '<aside>Other coffee: sweet strawberries agave nectar granny smith apples</aside>'));
 assert.equal(s.cup,false);
});
