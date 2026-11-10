import test from 'node:test';
import assert from 'node:assert/strict';
import {selectedWoodshed592DirectFacts as proof} from '../scripts/audit/issue33-r76-592-selected-contract.mjs';
const name='Honduran Decaf | Swiss Water® Processed';
const region='The region of Copan lies in a fertile valley, known for its cool temperatures, and as a result is a perfect location for green coffee production.';
const sensory='Our Decaf Honduras is citrus forward, a fruity sweetness with a syrup-y body!';
const decaf='The Swiss Water® Process is a chemical free decaffeination process that brings out the best flavor in the coffee beans.';
const page=(a=region,b=sensory,c=decaf,h=name)=>'<main><h1>'+h+'</h1><p>'+a+' '+b+' '+c+'</p><label>Roast Level</label><select><option>Select</option></select></main>';
test('exact selected identity, growing region context, sensory and separate decaffeination evidence',()=>{
  assert.deepEqual(Object.values(proof(page(),[name])),[true,true,true,true]);
});
test('different identity, absent H1 or duplicate selected H1 must fail closed',()=>{
  for(const hs of [['Sumatra Decaf | Swiss Water® Process'],[],[name,name]])
    assert.equal(proof(page(),hs).selectedIdentity,false);
});
test('wrong selected Copan context cannot borrow historical source',()=>{
  assert.equal(proof(page(region.replace('Copan','Sumatra')),[name]).directCopanContext,false);
});
test('other flavor narrative cannot certify exact Honduran sensory',()=>{
  assert.equal(proof(page(region,sensory.replace('citrus','caramel')),[name]).directHondurasSensory,false);
});
test('Swiss Water is decaffeination not Washed cherry processing',()=>{
  assert.equal(proof(page(region,sensory,'The coffee was washed at the farm.'),[name]).directSwissWaterDecaffeination,false);
});
test('unselected nav, scripts, footer, forms and asides cannot supply direct facts',()=>{
  const fake='<main><h1>'+name+'</h1><p>Selected coffee description currently unavailable.</p>'+
    '<nav>'+region+'</nav><script>'+sensory+'</script><footer>'+decaf+'</footer><aside>'+region+'</aside><form>'+sensory+' '+decaf+'</form></main>';
  assert.deepEqual(Object.values(proof(fake,[name])),[true,false,false,false]);
});
test('unrelated Timor and Sumatra product story is not selected Honduran Decaf',()=>{
  const other=page('The region of Sumatra lies in a valley.',
    'Our Sumatra decaf has chocolate notes.',decaf,'Sumatra Decaf | Swiss Water® Process');
  assert.deepEqual(Object.values(proof(other,['Sumatra Decaf | Swiss Water® Process'])),[false,false,false,true]);
});
test('generic marketing Swiss Water label alone is not the selected coffee method proof',()=>{
  assert.equal(proof(page(region,sensory,'Swiss Water decaf available in our shop.'),[name]).directSwissWaterDecaffeination,false);
});
test('selection widget does not replace direct sensory or roast evidence',()=>{
  const p='<main><h1>'+name+'</h1><label>Roast Level</label><select><option>Dark</option></select><p>'+region+' '+decaf+'</p></main>';
  assert.equal(proof(p,[name]).directHondurasSensory,false);
});
test('related products in an aside cannot replace omitted direct origin',()=>{
  const p=page('',sensory,decaf)+'<aside>'+region+'</aside>';
  assert.equal(proof(p,[name]).directCopanContext,false);
});
