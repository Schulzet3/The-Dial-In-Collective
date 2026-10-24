import test from 'node:test';
import assert from 'node:assert/strict';
import {extractProductFlavorEvidence} from '../src/server/coffee-flavor-evidence.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';

const source_url='https://roaster.example/products/current-coffee';
const clean=(html,max=6000)=>String(html).replace(/<[^<>]*>/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim().slice(0,max);
const page=body=>'<main><h1>Current Coffee</h1>'+body+'</main>';
const notes=body=>extractProductFlavorEvidence(page(body),{clean});
const cases=[
  {
    "source": "This delightful coffee is soft and sweet with green grape and jasmine up front with mild tangelo juiciness in the finish.",
    "notes": "green grape and jasmine, mild tangelo juiciness"
  },
  {
    "source": "A rich and incredibly sweet cup, with fruit-forward notes of raspberry, jam, cranberry and cherry.",
    "notes": "raspberry, jam, cranberry and cherry"
  },
  {
    "source": "Warm cinnamon undertones dance with gentle dried fig notes and a graham cracker essence, culminating in a smooth, versatile cup.",
    "notes": "Warm cinnamon, gentle dried fig, graham cracker"
  },
  {
    "source": "Enriched by volcanic soil, this single-origin decaf coffee boasts lively baking spice notes, cherry cobbler sweetness, and a hint of red grape.",
    "notes": "lively baking spice, cherry cobbler sweetness, red grape"
  },
  {
    "source": "Our single-origin Guatemalan coffee boasts cola-like sweetness, buttery undertones, and a delightful sweetness, all captured in a light roast.",
    "notes": "cola-like sweetness, buttery undertones, and a delightful sweetness"
  },
  {
    "source": "The beans are wet hulled just for us producing beautifully rich, full bodied coffee that is chocolaty, licorice-like with bold, earthy undertones.",
    "notes": "chocolaty, licorice-like with bold, earthy undertones"
  },
  {
    "source": "Our light-roasted Honey Process Colombian features vibrant notes of strawberry and orange, complemented by delicate floral undertones.",
    "notes": "strawberry and orange, delicate floral undertones"
  },
  {
    "source": "This blend has two components. The milk chocolate notes of the Black Satin pair perfectly with the notes of roasted cacao nibs from the Fog Riser, and together they deliver a smooth, balanced, low-acid dark/medium roast.",
    "notes": "milk chocolate, roasted cacao nibs"
  },
  {
    "source": "The dominant flavor note of this coffee that we taste is blackberry but think dark berries. As a light roast, this coffee has floral notes. As a medium-dark roast, this coffee has caramelized notes.",
    "notes": "blackberry"
  }
];
// Literal public source sentences exercise generic grammatical relationships.
// These fixtures do not change the original frozen oracle, captures or scorer.
for(const [index,entry] of cases.entries())test('current coordinated sensory source '+(index+1)+' survives actual HTML and selected Product JSON',()=>{
 for(const json of [false,true]){
  const product={'@type':'Product',name:'Current Coffee',url:source_url,description:entry.source};
  const html=(json?'<script type="application/ld+json">'+JSON.stringify(product)+'</script>':'')+
   page(json?'':'<p>'+entry.source+'</p>');
  const result=extractPublicCoffeeFacts(html,{source_url});
  assert.equal(result.fields.tasting_notes,entry.notes);
  assert.ok(result.source_facts?.some(fact=>String(fact.value).includes(entry.source)));
 }
});

test('new coordinated relationships reject denied, historical and other-coffee contexts',()=>{
 for(const entry of cases)for(const prefix of ['Last year ','This is not true: ','Another coffee: ']){
  assert.equal(notes('<p>'+prefix+entry.source+'</p>'),'',prefix+entry.source);
 }
});

test('conditional preparation cannot add the new coordinated descriptors',()=>{
 for(const entry of cases){
  const actual=notes('<p>When served with milk, '+entry.source+'</p>');
  assert.equal(actual,'',entry.source);
 }
});

test('educational and related-product text cannot provide a coordinated current profile',()=>{
 for(const entry of cases){
  assert.equal(notes('<h2>Learn about flavors</h2><p>'+entry.source+'</p>'),'');
  assert.equal(notes('<section class="related-products"><p>'+entry.source+'</p></section>'),'');
 }
});

test('independent narratives and conflicting explicit labels remain unresolved',()=>{
 const body='<p>'+cases[0].source+'</p><p>'+cases[3].source+'</p>';
 assert.equal(notes(body),'');
 const result=extractPublicCoffeeFacts(page('<p>Tasting notes: Cocoa, Almond</p><p>Tasting notes: Mango, Peach</p><p>'+cases[0].source+'</p>'),{source_url});
 assert.equal(result.fields.tasting_notes,undefined);
 assert.ok(result.conflicts?.includes('tasting_notes'));
 assert.equal(notes('<p>Tasting notes: Cocoa, Almond</p><p>'+cases[0].source+'</p>'),'Cocoa, Almond');
});

test('a qualified roast option does not establish an unconditional primary note',()=>{
 const primary=cases[8].source.split('. ')[0]+'.';
 assert.equal(notes('<p>As a light roast, '+primary+'</p><p>As a medium-dark roast, this coffee has caramel notes.</p>'),'');
 const without=cases[8].source.replace(primary+' ','');
 assert.equal(notes('<p>'+without+'</p>'),'');
});

test('named component note pairs require a current selected blend relationship',()=>{
 const paired=cases[7].source.replace('This blend has two components. ','');
 assert.equal(notes('<p>'+paired+'</p>'),'');
 assert.equal(notes('<p>Last year this blend had two components. '+paired+'</p>'),'');
 const other={'@type':'Product',name:'Other Coffee',url:'https://roaster.example/products/other-coffee',description:cases[7].source};
 const selected={'@type':'Product',name:'Current Coffee',url:source_url};
 const result=extractPublicCoffeeFacts('<script type="application/ld+json">'+JSON.stringify([selected,other])+'</script>'+page('<p>Origin: Kenya</p>'),{source_url});
 assert.equal(result.fields.tasting_notes,undefined);
});

test('a later preparation-qualified clause preserves only the earlier unconditional profile',()=>{
 assert.equal(notes('<p>Tasting notes of caramel, peanut and red fruits; chocolatey finish when served with milk.</p>'),'caramel, peanut and red fruits');
 assert.equal(notes('<p>This cup is smooth; when served with milk it has notes of raspberry and caramel.</p>'),'');
 assert.equal(notes('<p>When served with milk, this coffee has notes of raspberry and caramel; chocolatey finish.</p>'),'');
});

test('printed sensory labels keep milk chocolate but preserve preparation qualifications',()=>{
 assert.equal(notes('<p>Tasting Notes: milk chocolate, orange</p>'),'milk chocolate, orange');
 for(const html of ['<p>Tasting Notes: caramel and chocolate when served with milk.</p>',
  '<p>When served with milk, this coffee has notes of strawberry and orange.</p>']){
  assert.equal(notes(html),'');
  const result=extractPublicCoffeeFacts(page(html),{source_url});
  assert.equal(result.fields.tasting_notes,undefined);
  assert.ok(result.source_facts?.some(fact=>String(fact.value).includes('served with milk')));
 }
});
