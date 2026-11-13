import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {selected259,original259} from '../scripts/audit/issue33-r184-259-check.mjs';
const product='<h1>Brasil Carmo de Minas</h1>'+
 '<h2>About the Producer:</h2><p>This coffee hails from the Mantiqueira de Minas region in Brasil and was produced by the Cocarive Cooperative. The cooperative was founded by farmers from Carmo de Minas.</p>'+
 '<p>Mantiqueira de Minas has dominated the Cup of Excellence by producing many winning lots in Brasil. The land has a mild climate with perfect drying conditions.</p>'+
 '<h2>What you will find in the cup:</h2><p>This coffee reminds us of cinnamon bread, milk chocolate, and macadamia nuts. It has a pleasant medium body with low acidity and a mild sweetness.</p>';
const page=(body=product,extra='')=>'<html><head><title>Previous dark-roasted Colombia</title><meta name="description" content="Other roast Dark"></head><body><nav>Dark roast and Natural Colombia</nav><main><article class="product">'+body+'</article></main>'+extra+'<footer>Swiss Water Decaf Espresso Recipe</footer></body></html>';
const parse=(body=product,extra='')=>extractPublicCoffeeFacts(page(body,extra),{source_url:original259.url});
test('#259 chosen actual H1 and supplier literal evidence',()=>{
 const s=selected259(page());assert.equal(s.identity,true);assert.equal(s.coop,true);assert.equal(s.region,true);assert.equal(s.notes,true);
});
test('#259 exact selected name prevails over old SEO',()=>{
 const p=parse();assert.equal(p.ok,true,JSON.stringify(p).slice(0,1100));assert.equal(p.fields?.name,'Brasil Carmo de Minas');
});
test('#259 medium body cannot set Medium roast tier',()=>{
 const p=parse();assert.equal(p.fields?.roast_level,undefined,JSON.stringify(p).slice(0,2000));
});
test('#259 regional drying conditions do not prove this lot processing',()=>{
 const p=parse();assert.equal(p.fields?.process,undefined,JSON.stringify(p).slice(0,2000));
});
test('#259 direct cup tasting notes are selected, not nav/SEO',()=>{
 const p=parse();assert.ok(['cinnamon bread','milk chocolate','macadamia'].every(x=>String(p.fields?.tasting_notes||'').toLowerCase().includes(x)),JSON.stringify(p).slice(0,2600));
});
test('#259 selected identity cannot come from recycled different H1',()=>{
 assert.equal(selected259(page(product.replace('<h1>Brasil Carmo de Minas</h1>','<h1>Colombia Decaf</h1>'))).identity,false);
});
test('#259 related aside cannot supply a missing selected note',()=>{
 const s=selected259(page(product.replace('macadamia nuts','cashew nuts'),'<aside>Our other coffee has macadamia nuts</aside>'));
 assert.equal(s.notes,false);
});
test('#259 related content must not fabricate decaffeination or recipe',()=>{
 const p=parse();assert.ok(!p.fields?.decaffeination_method&&!p.fields?.espresso_recipe,JSON.stringify(p).slice(0,1800));
});
test('#259 medium body sentence alone is not a roast statement',()=>{
 const p=parse('<h1>Brasil Carmo de Minas</h1><p>A pleasant medium body with low acidity and a mild sweetness.</p>');
 assert.ok(!p.fields?.roast_level,JSON.stringify(p).slice(0,1600));
});
