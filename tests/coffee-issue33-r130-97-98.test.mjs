import test from 'node:test';
import assert from 'node:assert/strict';
import {selected130,currentSelected130} from '../scripts/audit/issue33-r130-97-98-check.mjs';
const description=(e)=>'<p>Sourced from '+e.region+', '+e.country+', this single origin decaf coffee tastes like '+e.notes.join(', ')+'.</p><p>ROAST: Medium</p><p>Dekáf&#39;d by way of Swiss Water® Process</p>';
const page=(e,body=description(e),h1=e.name,extra='')=>'<html><head><title>Other old coffee</title><script type="application/ld+json">{"name":"Other old coffee"}</script></head><body><main><article class="product"><h1>'+h1+'</h1><section class="product__description">'+body+'</section></article>'+extra+'</main></body></html>';
for(const entry of selected130){
 test('original '+entry.number+' direct selected H1 and own roast/region/notes/method',()=>{
  const d=currentSelected130(page(entry),entry);
  assert.equal(d.exactSelectedHeading,true);assert.ok(Object.values(d.direct).every(Boolean),JSON.stringify(d.direct));
 });
 test('original '+entry.number+' changed live H1 rejects archived identity despite SEO',()=>{
  const d=currentSelected130(page(entry,description(entry),'Different Current Coffee'),entry);
  assert.equal(d.exactSelectedHeading,false);
 });
 test('original '+entry.number+' nav/aside/footer cannot supply selected method or flavor',()=>{
  const body=description(entry).replace('Dekáf&#39;d by way of Swiss Water® Process','not a method')
   .replace(entry.notes[1],'unpublished');
  const d=currentSelected130(page(entry,body,entry.name,'<nav>'+description(entry)+'</nav><aside>'+description(entry)+'</aside><footer>'+description(entry)+'</footer>'),entry);
  assert.equal(d.direct.water,false);assert.equal(d.direct.notes,false);
 });
 test('original '+entry.number+' wrong coffee specs/related beans cannot repair own origin',()=>{
  const body=description(entry).replace(entry.region,'unpublished-region');
  const d=currentSelected130(page(entry,body,entry.name,'<aside>from '+entry.region+', '+entry.country+'</aside>'),entry);
  assert.equal(d.direct.region,false);
 });
}
