import test from 'node:test';
import assert from 'node:assert/strict';
import {selectedBleu26Facts as current} from '../scripts/audit/issue33-r78-26-check.mjs';
const name='Ethiopia Yirgacheffe';
const washed='Tied for second-highest rating. Processed by the washed method (fruit removed before drying). A washed Ethiopia cup gives a clean coffee.';
const fruit='The taste has a tones of tangerine and citrus along with wine and berry tones.';
const flavor='Ethiopia Flavor: Richly sweet, roast-rounded. Dark chocolate, gardenia, gently scorched cedar, red plum, hazelnut in aroma and cup.';
const conditional='The coffees are known for their heavy sweetness when given a a Dark Roast, and for the bright acidity when given a Medium Roast.';
const page=(w=washed,f=fruit,d=flavor,c=conditional,h=name)=>'<main><h1>'+h+'</h1><div>Single Origin</div><section><p>'+w+'</p><p>'+f+'</p><p>'+d+'</p><p>'+c+'</p></section></main>';
test('exact selected original #26 independent direct evidence',()=>assert.deepEqual(Object.values(current(page(),[name])),Array(6).fill(true)));
test('missing, different or duplicate selected heading is not certified',()=>{for(const hs of [[],['Kenya AA'],[name,name]])assert.equal(current(page(),hs).exactIdentity,false)});
test('unwashed selected process must not become washed',()=>assert.equal(current(page(washed.replace('washed method','natural method'),fruit,flavor,conditional),[name]).selectedWashed,false));
test('fruit tones are distinct direct source, not only structured flavor list',()=>assert.equal(current(page(washed,'',flavor,conditional),[name]).directFruitClause,false));
test('detailed selected tasting is distinct from vague marketing',()=>assert.equal(current(page(washed,fruit,'Generic coffee tastes good.',conditional),[name]).directDetailedFlavor,false));
test('conditional roast language is not a selected numeric or categorical roast',()=>assert.equal(current(page(washed,fruit,flavor,'This coffee is a Medium Roast.'),[name]).roastConditionalOnly,false));
test('related navigation, footer, other coffee cannot supply missing selected facts',()=>{
 const a=page(washed,'','',conditional)+'<nav>'+fruit+flavor+'</nav><aside>'+fruit+flavor+'</aside><footer>'+fruit+'</footer>';
 const d=current(a,[name]);assert.equal(d.directFruitClause,false);assert.equal(d.directDetailedFlavor,false);
});
test('shop checkout or variant controls do not establish origin or flavor',()=>{
 const d=current('<main><h1>'+name+'</h1>Single Origin</main><form><select><option>'+fruit+flavor+washed+conditional+'</option></select></form>',[name]);
 assert.equal(d.selectedWashed,false);assert.equal(d.directFruitClause,false);assert.equal(d.directDetailedFlavor,false);
});
