import test from 'node:test';
import assert from 'node:assert/strict';
import {selectedYellowstone598DirectFacts as proof} from '../scripts/audit/issue33-r75-598-selected-contract.mjs';
const name='BOLIVIA LA PAZ - ORGANIC';
const roast='Low Acid &amp; Mellow - Dark Roast';
const notes='NOTES: CHERRY, JAM, ALLSPICE';
const story='Elevate your morning ritual with a cup from the high Bolivian Andes. Roasted dark for a silky, low-acid finish. Grown by farmers in partnership with Cooperativa Agropecuaria Alto Sajama, every bag supports a future of organic farming.';
const facts='Origin La Paz, Bolivia Process Washed and Sun Dried Cooperative Cooperativa Agropecuaria Alto Sajama';
const wrap=(r=roast,n=notes,s=story,f=facts,h=name)=>'<main><h1>'+h+'</h1><p>'+r+'</p><p>'+n+'</p><p>'+s+'</p><section>'+f+'</section></main>';
test('seven direct positive checks require single selected Bolivia product identity',()=>{
  assert.deepEqual(Object.values(proof(wrap(),[name])),Array(7).fill(true));
});
test('different selected lot, missing heading or duplicated heading fail closed',()=>{
  for(const headings of [['COLOMBIA HUILA'],[],[name,name]])
    assert.equal(proof(wrap(),headings).selectedIdentity,false);
});
test('Light-Medium or related shop roast is not direct selected Dark',()=>{
  assert.equal(proof(wrap('Low Acid & Mellow - Medium-Light Roast'),[name]).directlyDarkRoast,false);
});
test('different sensory notes or stale notes fail source proof',()=>{
  assert.equal(proof(wrap(roast,'NOTES: CHERRY, CHOCOLATE, ALLSPICE'),[name]).directlyCherryJamAllspice,false);
});
test('unselected metadata, navigation, scripts and asides cannot supply missing notes or coop',()=>{
  const hidden='<main><h1>'+name+'</h1><p>Selected release has no details.</p><nav>'+notes+' '+facts+'</nav><aside>'+story+'</aside><script>'+roast+' '+notes+' '+facts+'</script></main>';
  const p=proof(hidden,[name]);
  assert.deepEqual(Object.values(p),[true,false,false,false,false,false,false]);
});
test('country or region drift cannot be certified as the original selected product',()=>{
  assert.equal(proof(wrap(roast,notes,story,facts.replace('La Paz, Bolivia','Huila, Colombia')),[name]).labeledLaPazOrigin,false);
});
test('natural or wet-hulled process cannot be borrowed from another release',()=>{
  assert.equal(proof(wrap(roast,notes,story,facts.replace('Washed and Sun Dried','Natural')),[name]).labeledWashedSunDried,false);
});
test('generic smallholder marketing does not substitute named cooperative',()=>{
  assert.equal(proof(wrap(roast,notes,story,facts.replace('Cooperativa Agropecuaria Alto Sajama','Small Farm Sourcing')),[name]).labeledNamedCooperative,false);
});
test('wrong producer in narrative fails independently even when detail block is right',()=>{
  assert.equal(proof(wrap(roast,notes,story.replace('Cooperativa Agropecuaria Alto Sajama','another producer'),facts),[name]).namedCooperativePartnership,false);
});
test('other selected product cannot provide cooperative or notes in a sidebar',()=>{
  const other=wrap(roast,'',story.replace('Cooperativa Agropecuaria Alto Sajama','other growers'),'');
  const p=proof(other+'<aside>'+notes+' '+facts+'</aside>',[name]);
  assert.equal(p.directlyCherryJamAllspice,false);
  assert.equal(p.labeledNamedCooperative,false);
});
