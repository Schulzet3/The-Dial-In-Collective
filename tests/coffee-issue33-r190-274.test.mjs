import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';

const url='https://readysetcoffee.com/products/copy-of-mexico-chiapas';
const product={'@context':'https://schema.org','@type':'Product',name:'Mexico Chiapas',url,brand:{'@type':'Brand',name:'Ready Set!'}};
const current='<div class="product-description"><h6>Elevation: 3,200Feet</h6><h6>Process: Fully Washed</h6><h6>Varietals: Bourbon, Caturra, Mundo Nova</h6><h6>Cupping Notes: Brown Sugar | Green Apple | Milk Chocolate</h6><h6>Roaster\'s Level: Medium</h6><p>Chiapas is back and sweeter than ever! We roast these delicate beans with a light touch to create a cup that captures the green apple sweetness and chocolaty overtones.</p><p>Grown high in the mountains of Chiapas, Mexico, this special short-run coffee comes from small family farms in rich volcanic soil.</p></div>';
function page(extra='',desc=current){
 return '<!doctype html><html><head><meta property="og:type" content="product"><meta property="og:title" content="Mexico Chiapas"><meta property="og:site_name" content="Ready Set!"><script type="application/ld+json">'+JSON.stringify(product)+'</script></head><body><header><h3>This Week\'s offers</h3><a href="/products/guatemala-antigua-los-volcanes-copy">Volcanes! fresh off the pallet, a favorite medium roast</a></header><main><article class="product"><h1>Mexico Chiapas</h1>'+desc+'</article></main>'+extra+'</body></html>';
}
const parse=(extra='',desc=current)=>extractPublicCoffeeFacts(page(extra,desc),{source_url:url});
test('#274 selected cupping notes retain all three own-source literals',()=>{
 const p=parse(); assert.equal(p.ok,true,JSON.stringify(p).slice(0,1000));
 assert.equal(p.fields?.name,'Mexico Chiapas');
 const n=String(p.fields?.tasting_notes||'').toLowerCase();
 for(const x of ['brown sugar','green apple','milk chocolate']) assert.ok(n.includes(x),JSON.stringify(p).slice(0,2000));
});
test('#274 direct medium roast outranks marketing light touch and light body',()=>{
 const p=parse(); assert.equal(p.ok,true,JSON.stringify(p).slice(0,1000));
 assert.equal(p.fields?.roast_level,'Medium',JSON.stringify(p).slice(0,1500));
 assert.match(String(p.fields?.origin||''),/Mexico/i);
 assert.match(String(p.fields?.process||''),/Washed/i);
});
test('#274 sibling Volcanes promotion and unrelated product notes do not contaminate the selected coffee',()=>{
 const sidebar='<aside><h2>Guatemala Antigua Los Volcanes</h2><p>Cupping Notes: Black Currant, Toffee, Toasted Almond</p><p>Roast: Dark</p><p>Producer: Jose Other Farm</p></aside>';
 const p=parse(sidebar);assert.equal(p.ok,true,JSON.stringify(p).slice(0,1000));
 assert.equal(p.fields?.name,'Mexico Chiapas');
 assert.doesNotMatch(String(p.fields?.tasting_notes||'').toLowerCase(),/currant|toffee|toasted almond/);
 assert.equal(p.fields?.roast_level,'Medium');
 assert.doesNotMatch(String(p.fields?.producer||''),/Jose Other Farm/i);
});
test('#274 grind choice espresso is not published espresso brewing recipe or decaffeination method',()=>{
 const p=parse('<select><option>Ground | Espresso</option><option>Whole Bean</option></select>');
 assert.equal(p.ok,true,JSON.stringify(p).slice(0,1000));
 assert.ok(!p.fields?.decaffeination_method,JSON.stringify(p).slice(0,1500));
 assert.ok(!p.fields?.espresso_recipe,JSON.stringify(p).slice(0,1500));
});
