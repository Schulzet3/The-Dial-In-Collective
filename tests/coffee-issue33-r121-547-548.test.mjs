import test from 'node:test';
import assert from 'node:assert/strict';
import {selected121,direct121,fields121Ok} from '../scripts/audit/issue33-r121-547-548-check.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
const body=n=>selected121[n].direct.map(s=>'<p>'+s+'</p>').join('');
const page=(n,desc=body(n),extra='',heading=selected121[n].name)=>
 '<html><head><title>Dope Coffee</title><meta property="og:site_name" content="Dope Coffee"></head>'+
 '<body><main><article class="product"><h1>'+heading+'</h1><div class="product__description">'+desc+
 '</div></article>'+extra+'</main></body></html>';
test('547 and 548 selected source heading and own specific notes are both bound',()=>{
 for(const n of [547,548]){
  const d=direct121(page(n),n);
  assert.equal(d.uniqueH1,true,JSON.stringify(d));
  assert.ok(d.direct.every(z=>z.matched),JSON.stringify(d));
 }
});
test('adjacent product and exchanged identity must not certify the original selected coffee',()=>{
 for(const n of [547,548]){
  const other=n===547?548:547;
  assert.equal(direct121(page(n,body(n),'',selected121[other].name),n).uniqueH1,false);
  assert.equal(direct121(page(n,body(n)) .replace('</h1>','</h1><h1>'+selected121[other].name+'</h1>'),n).uniqueH1,false);
 }
});
test('current recommended coffee, navigation and SEO text do not substitute missing selected notes',()=>{
 for(const n of [547,548]){
  const d=direct121(page(n,'Purchase a coffee',
    '<aside>'+body(n)+'</aside><nav>'+body(n)+'</nav><footer>'+body(n)+
    '</footer><meta name="description" content="'+selected121[n].direct.join(' ')+'">'),n);
  assert.ok(d.direct.some(z=>!z.matched),JSON.stringify(d));
 }
});
test('swapping origin or neighboring coffee flavor notes fails direct selected evidence',()=>{
 for(const n of [547,548]){
  const other=n===547?548:547;
  const changed=body(n).replace(selected121[n].origin,selected121[other].origin);
  assert.ok(direct121(page(n,changed),n).direct.some(z=>!z.matched));
  const swapped=body(n).replace(selected121[n].direct[3],selected121[other].direct[3]);
  assert.ok(direct121(page(n,swapped),n).direct.some(z=>!z.matched));
 }
});
test('selected-source fields retain Medium even when Rwanda body is medium-light',()=>{
 const data={name:selected121[548].name,origin:selected121[548].origin,
  roast_level:'Medium',tasting_notes:'Cocoa, jasmine, juicy fruit, chocolate, nutty finish'};
 assert.ok(fields121Ok(data,548));
 assert.equal(fields121Ok({...data,roast_level:'Medium-Light'},548),false);
});
test('noncurrent fields or cross-coffee origin must remain blank',()=>{
 for(const n of [547,548]){
  const other=n===547?548:547;
  const data={name:selected121[n].name,origin:selected121[n].origin,roast_level:'Medium',
   tasting_notes:selected121[n].notes.join(', ')};
  assert.ok(fields121Ok(data,n));
  assert.equal(fields121Ok({...data,origin:selected121[other].origin},n),false);
  assert.equal(fields121Ok({...data,process:'Natural'},n),false);
  assert.equal(fields121Ok({...data,producer:'other selected producer'},n),false);
 }
});
test('real parser accepts two plausible source-shaped selected products',()=>{
 for(const n of [547,548]){
  const p=extractPublicCoffeeFacts(page(n),{source_url:selected121[n].url});
  assert.equal(p.ok,true,JSON.stringify(p));
  assert.equal(p.fields?.name,selected121[n].name,JSON.stringify(p.fields));
 }
});
