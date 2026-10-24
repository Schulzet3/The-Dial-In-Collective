import test from 'node:test';
import assert from 'node:assert/strict';
import {extractProductFlavorEvidence} from '../src/server/coffee-flavor-evidence.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';

const clean=(html,max=6000)=>String(html).replace(/<[^<>]*>/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim().slice(0,max);
const source_url='https://roaster.example/products/current-coffee';
const page=body=>'<main><h1>Current Coffee</h1>'+body+'</main>';
const notes=body=>extractProductFlavorEvidence(page(body),{clean});
const wild='Jammy blueberry notes of our natural Ethiopia are intricately layered with the sweet pepper and subtle, ginger-like spice from our Sumatra.';
const raven="Straight shots mysteriously balance different worlds. They begin with a profound dark chocolate sweetness that is tamed with a velvet-like nuttiness, and end with a bright effervescent finish. Raven's brilliance is truly revealed when layered with milk, showcasing an artistic dance of creamy chocolate, blueberry preserves, and hazelnut liqueur.";
const finish='Syrupy body, rounded acidity; tasting notes of caramel, peanut and red fruits; chocolatey finish';
const wildNotes='Jammy blueberry, sweet pepper and subtle, ginger-like spice';
const ravenNotes='profound dark chocolate sweetness, velvet-like nuttiness, bright effervescent finish';
// These are literal excerpts, not replacements for the original frozen captures.
// Full603 and unchanged real-source acceptance remain independent gates.

test('a single current blend statement preserves both literal component notes and their modifiers',()=>{
 assert.equal(notes('<p>'+wild+'</p>'),wildNotes);
 const changed=wild.replace('Jammy blueberry','Ripe raspberry').replace('sweet pepper','warm cinnamon');
 assert.equal(notes('<p>'+changed+'</p>'),'Ripe raspberry, warm cinnamon and subtle, ginger-like spice');
});

test('component continuations retain an earlier unrelated negative without losing current evidence',()=>{
 assert.equal(notes("<p>After all, coffee doesn't have to taste ordinary. "+wild+'</p>'),wildNotes);
});

test('component notes require the complete explicit relationship and two literal coffee origins',()=>{
 for(const value of [
  wild.replace('are intricately layered with','might be layered with'),
  wild.replace('our Sumatra','our flavoring syrup'),
  wild.replace('our natural Ethiopia','our gift basket'),
  wild.replace('from our Sumatra.','when served with milk.'),
  'If brewed with milk, '+wild,
  'Last year '+wild,
  'Other coffees: '+wild,
  'For example, '+wild
 ])assert.doesNotMatch(notes('<p>'+value+'</p>'),/sweet pepper|ginger-like spice/,value);
});

test('educational and unrelated-product prose cannot supply the new continuations',()=>{
 assert.equal(notes('<h2>What are tasting notes?</h2><p>'+wild+'</p>'),'');
 assert.equal(notes('<section class="related products"><p>'+wild+'</p></section>'),'');
 assert.equal(notes('<h2>What are tasting notes?</h2><p>'+raven+'</p>'),'');
});

test('independent narrative alternatives remain unresolved and a printed profile keeps priority',()=>{
 assert.equal(notes('<p>'+wild+'</p><p>'+wild.replace('Jammy blueberry','Ripe raspberry')+'</p>'),'');
 assert.equal(notes('<p>Tasting notes: Mango, Peach</p><p>'+wild+'</p>'),'Mango, Peach');
});

test('straight-shot sensory prose supplies only its stated unconditioned descriptors',()=>{
 assert.equal(notes('<p>'+raven+'</p>'),ravenNotes);
 assert.doesNotMatch(notes('<p>'+raven+'</p>'),/blueberry preserves|hazelnut liqueur/);
});

test('a pronoun without current straight-shot context cannot introduce a sensory profile',()=>{
 const tail=raven.split('. ').slice(1).join('. ');
 assert.equal(notes('<p>'+tail+'</p>'),'');
 for(const first of [
  'Straight shots when mixed with milk mysteriously balance different worlds.',
  'Straight shots of another coffee mysteriously balance different worlds.',
  'Straight shots from a camera mysteriously balance different worlds.'
 ])assert.equal(notes('<p>'+first+' '+tail+'</p>'),'');
});

test('a same-sentence finish augments the literal list but conditional or separate finishes do not',()=>{
 assert.equal(notes('<p>'+finish+'</p>'),'caramel, peanut and red fruits, chocolatey finish');
 assert.equal(notes('<p>'+finish.replace('chocolatey finish','chocolatey finish when served with milk')+'</p>'),'caramel, peanut and red fruits');
 assert.doesNotMatch(notes('<p>Tasting notes of caramel, peanut and red fruits.</p><p>chocolatey finish.</p>'),/chocolatey/);
});

test('actual selected HTML and JSON paths preserve the complete component profile and source quote',()=>{
 for(const json of [false,true]){
  const product={'@type':'Product',name:'Current Coffee',url:source_url,description:wild};
  const html=(json?'<script type="application/ld+json">'+JSON.stringify(product)+'</script>':'')+
   page(json?'':'<p>'+wild+'</p>');
  const result=extractPublicCoffeeFacts(html,{source_url});
  assert.equal(result.fields.tasting_notes,wildNotes);
  assert.ok(result.source_facts?.some(fact=>String(fact.value).includes(wild)));
 }
});

test('actual straight-shot extraction retains the qualified milk paragraph for review',()=>{
 const product={'@type':'Product',name:'Current Coffee',url:source_url,description:raven};
 const result=extractPublicCoffeeFacts('<script type="application/ld+json">'+JSON.stringify(product)+'</script>'+page('<p>'+raven+'</p>'),{source_url});
 assert.equal(result.fields.tasting_notes,ravenNotes);
 assert.ok(result.source_facts?.some(fact=>String(fact.value).includes('when layered with milk')));
 assert.ok(result.source_facts?.some(fact=>String(fact.value).includes('blueberry preserves, and hazelnut liqueur')));
});

test('a different structured product cannot donate a complete new sensory continuation',()=>{
 const other={'@type':'Product',name:'Another Coffee',url:'https://roaster.example/products/another-coffee',description:wild};
 const selected={'@type':'Product',name:'Current Coffee',url:source_url};
 const result=extractPublicCoffeeFacts('<script type="application/ld+json">'+JSON.stringify([selected,other])+'</script>'+page('<p>Origin: Kenya</p>'),{source_url});
 assert.equal(result.fields.tasting_notes,undefined);
});

test('actual conflicting selected printed profiles are not replaced by the new narrative',()=>{
 const result=extractPublicCoffeeFacts(page('<p>Tasting notes: Mango, Peach</p><p>Tasting notes: Cocoa, Almond</p><p>'+wild+'</p>'),{source_url});
 assert.equal(result.fields.tasting_notes,undefined);
 assert.ok(result.conflicts?.includes('tasting_notes'));
});
