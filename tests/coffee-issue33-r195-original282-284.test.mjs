import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';

const bold='https://ridleyroasthouse.com/products/ridley-roasthouse-founders-roast-coffee';
const nica='https://riseupcoffee.com/products/single-origin-nicaragua-honey-arabica-coffee';
const boldDetails='<p>ORIGIN: Columbia</p><p>PROCESS: Washed</p><p>ROAST: Dark</p><p>FLAVOR: Great aroma, very clean, notes of apricot, honey and pear with full body and sweet finish.</p><p>This family farm produces an assortment of 100% shade grown Bourbon, Catuai and Caturra varietals.</p>';
const nicaDetails='<p>ROAST LEVEL: Light+</p><h5>Byron Corrales, Finca Los Pinos</h5><p>Los Pinos is located in Aranjuez, Mataglapa next to the Arenal reserve. It is a group of family farms totaling 55 hectares of coffee run by Byron Corrales.</p><p>The Honey Process is one of many processes used by Finca Los Pinos. During this process coffee cherries are picked and pulped but then dried without the use of water.</p><p>This coffee is sweet and smooth with subtle fruit notes.</p>';
function parse(url,name,details,aside='',ldName=name){
 const ld={'@context':'https://schema.org','@type':'Product',name:ldName,url,brand:{'@type':'Brand',name:url===nica?'Rise Up Coffee Roasters':'Ridley Roasthouse'}};
 const html='<!doctype html><html><head><script type="application/ld+json">'+JSON.stringify(ld)+'</script></head><body><header>Shop coffees</header><main><article class="product"><h1>'+name+'</h1><div class="product-description">'+details+'</div></article></main>'+aside+'</body></html>';
 return extractPublicCoffeeFacts(html,{source_url:url});
}
test('#282 selected Bold Betty current literal Columbia and process/roast',()=>{
 const p=parse(bold,'Bold Betty',boldDetails);
 assert.equal(p.ok,true,JSON.stringify(p).slice(0,800));
 assert.equal(p.fields?.name,'Bold Betty');
 assert.equal(p.fields?.origin,'Columbia');
 assert.equal(p.fields?.process,'Washed');
 assert.equal(p.fields?.roast_level,'Dark');
});
test('#282 current selected published flavor stays complete',()=>{
 const p=parse(bold,'Bold Betty',boldDetails);
 for(const x of ['apricot','honey','pear'])assert.match(String(p.fields?.tasting_notes||'').toLowerCase(),new RegExp(x));
 assert.ok(!p.fields?.producer,'unnamed family farm is not a named grower');
});
test('#282 unrelated collection/sidebar flavor and roast never contaminate selected',()=>{
 const aside='<aside><h2>Other Roast</h2><p>ORIGIN: Costa Rica</p><p>ROAST: Light</p><p>FLAVOR: Coconut, passionfruit</p><p>Producer: Susan Smith</p></aside>';
 const p=parse(bold,'Bold Betty',boldDetails,aside);
 assert.equal(p.ok,true,JSON.stringify(p).slice(0,850));
 assert.equal(p.fields?.name,'Bold Betty');
 assert.equal(p.fields?.origin,'Columbia');
 assert.equal(p.fields?.roast_level,'Dark');
 assert.doesNotMatch(String(p.fields?.tasting_notes||''),/coconut|passionfruit/i);
 assert.doesNotMatch(String(p.fields?.producer||''),/Susan Smith/i);
});
test('#284 current Nicaragua preserves exact chosen product and directly named farmer',()=>{
 const name='Single Origin: Nicaragua | Honey Arabica | Organic Coffee';
 const p=parse(nica,name,nicaDetails);
 assert.equal(p.ok,true,JSON.stringify(p).slice(0,850));
 assert.equal(p.fields?.name,name);
 assert.match(String(p.fields?.producer||''),/byron corrales/i);
 assert.match(String(p.fields?.origin||''),/nicaragua/i);
 assert.equal(p.fields?.process,'Honey');
});
test('#284 directly named locality Aranjuez, Mataglapa remains selected source evidence',()=>{
 const p=parse(nica,'Single Origin: Nicaragua | Honey Arabica | Organic Coffee',nicaDetails);
 assert.equal(p.ok,true,JSON.stringify(p).slice(0,850));
 const detail=JSON.stringify(p.source_facts||[])+' '+JSON.stringify(p.roaster_details||{});
 assert.match(detail,/aranjuez|mataglapa/i);
 assert.match(String(p.fields?.tasting_notes||''),/subtle fruit/i);
 assert.ok(!p.fields?.decaffeination_method);
});
test('#284 related house roast does not leak chocolate, dark roast or names',()=>{
 const aside='<aside><h2>Organic House Roast</h2><p>NOTES: BALANCED, CHOCOLATEY, CREAMY</p><p>ROAST LEVEL: Dark</p><p>Grower: Susan Smith</p></aside>';
 const p=parse(nica,'Single Origin: Nicaragua | Honey Arabica | Organic Coffee',nicaDetails,aside);
 assert.equal(p.ok,true);
 assert.doesNotMatch(String(p.fields?.tasting_notes||''),/chocolate|creamy/i);
 assert.doesNotMatch(String(p.fields?.producer||''),/susan smith/i);
 assert.notEqual(p.fields?.roast_level,'Dark');
});

