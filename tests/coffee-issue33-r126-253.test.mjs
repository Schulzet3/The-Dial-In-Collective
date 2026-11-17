import test from 'node:test';
import assert from 'node:assert/strict';
import {selected126,selected126CurrentSource} from '../scripts/audit/issue33-r126-253-check.mjs';
const process='<p>PROCESS -- NATURAL</p>';
const region='<p>REGION -- MINAS GERAIS,</p>';
const altitude='<p>ALTITUDE -- 1100 MASL</p>';
const variety='<p>CULTIVARS -- CATUAI</p>';
const notes='<p>NOTES -- ALMOND, BROWN SUGAR, VANILLA</p>';
const farms='<p>Fazenda Furnas, Apostolo Simao, and Boa Vista farms</p>';
const all=process+region+altitude+variety+notes+farms;
const page=(body=all,h1=selected126.name,extra='')=>'<html><head><script type="application/ld+json">'+
 JSON.stringify({'@context':'https://schema.org','@type':'Product',name:h1,url:selected126.url,
  description:'GET RIGHT | MEDIUM ROAST | BRAZIL'})+
 '</script></head><body><main><article class="product"><h1>'+h1+'</h1><section>'+body+
 '</section></article>'+extra+'</main></body></html>';
test('real selected source shape retains six separately published specifics',()=>{
 const r=selected126CurrentSource(page());assert.equal(r.exactSelectedHeading,true);
 assert.equal(Object.values(r.direct).every(Boolean),true);
});
test('a changed selected H1 cannot certify original identity',()=>{
 assert.equal(selected126CurrentSource(page(all,'Other Brazil Coffee')).exactSelectedHeading,false);
});
test('only roast/process evidence cannot create missing tasting notes',()=>{
 const r=selected126CurrentSource(page(process+region+altitude+variety));
 assert.equal(r.direct.notes,false);assert.equal(r.direct.process,true);
});
test('only the flavor evidence cannot manufacture a processing method',()=>{
 const r=selected126CurrentSource(page(notes+region));
 assert.equal(r.direct.notes,true);assert.equal(r.direct.process,false);
});
test('omitted current exact selected region stays absent',()=>{
 const r=selected126CurrentSource(page(process+altitude+variety+notes+farms));
 assert.equal(r.direct.region,false);
});
test('foreign navigation cannot supply missing chosen coffee fields',()=>{
 const r=selected126CurrentSource(page(process,selected126.name,'<nav>'+region+altitude+variety+notes+farms+'</nav>'));
 assert.equal(r.direct.process,true);assert.equal(r.direct.region,false);
});
test('footer and foreign sibling aside cannot lend flavor or farm specifics',()=>{
 const r=selected126CurrentSource(page(process+region,selected126.name,
  '<footer>'+notes+farms+'</footer><aside>'+altitude+variety+'</aside>'));
 assert.equal(r.direct.notes,false);assert.equal(r.direct.threeFarms,false);
});
test('changed selected product must not inherit current source facts from metadata',()=>{
 const r=selected126CurrentSource(page('', 'Different Product',
  '<script type="application/ld+json">'+JSON.stringify({'@type':'Product',name:selected126.name,description:all})+'</script>'));
 assert.equal(r.exactSelectedHeading,false);assert.equal(r.direct.notes,false);
});
