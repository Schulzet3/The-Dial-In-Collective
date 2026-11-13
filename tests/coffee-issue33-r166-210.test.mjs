import test from 'node:test';
import assert from 'node:assert/strict';
import {chosen210,source210} from '../scripts/audit/issue33-r166-210-check.mjs';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
const own='<p>Roast: Medium</p><h1>Brazil Paubrasil</h1><p>Tasting Notes: Cocoa, Roasted Pecan, Peanut Butter</p>'+
 '<p>Named after Brazil’s official tree. Each naturally processed bean is from the Cerrado region and comes from one of nine cooperatives or six associations affiliated with the Cerrado Coffee Growers Federation. In the cup we taste cocoa, roasted pecan, and peanut butter.</p>'+
 '<section>Details<p>Origin Brazil</p><p>Region Cerrado Mineiro</p><p>Variety Catuai</p><p>Process Natural</p><p>Elevation 1100 m</p></section>';
const page=(body=own,other='')=>'<html><head><title>Old Burundi Washed</title><meta name="description" content="Peru washed bourbon blueberry"></head><body>'+
 '<nav>Old Burundi Medium</nav><main><article class="product">'+body+'</article></main>'+other+
 '<footer>Kenya Washed Njeri named producer</footer></body></html>';
test('#210 exact selected H1 and published direct fields',()=>{
 const s=source210(page());assert.equal(s.identity,true);assert.deepEqual(Object.entries(s.direct).filter(([,v])=>!v),[]);
});
test('#210 recycled URL with a different selected H1 cannot certify current original',()=>{
 assert.equal(source210(page(own.replace('<h1>Brazil Paubrasil</h1>','<h1>2026 Guatemala Geisha</h1>'))).identity,false);
});
test('#210 unrelated card cannot supply absent chosen tasting notes',()=>{
 const body=own.replaceAll('Cocoa, Roasted Pecan, Peanut Butter','Unpublished');
 assert.equal(source210(page(body,'<aside>Cocoa, Roasted Pecan, Peanut Butter</aside>')).direct.notes,false);
});
test('#210 related-product card cannot supply absent Cerrado Mineiro region',()=>{
 const body=own.replace('Region Cerrado Mineiro','Region unpublished');
 assert.equal(source210(page(body,'<aside>Region Cerrado Mineiro</aside>')).direct.region,false);
});
test('#210 no own Natural processing may be borrowed from recommendation',()=>{
 const body=own.replace('naturally processed','processed').replace('Process Natural','Process unknown');
 assert.equal(source210(page(body,'<aside>Process Natural</aside>')).direct.process,false);
});
test('#210 no own Catuai cultivar may be borrowed from SEO or card',()=>{
 const body=own.replace('Variety Catuai','Variety unpublished');
 assert.equal(source210(page(body,'<aside>Variety Catuai</aside>')).direct.variety,false);
});
test('#210 no own altitude may be borrowed from footer',()=>{
 const body=own.replace('Elevation 1100 m','Elevation unpublished');
 assert.equal(source210(page(body,'<aside>Elevation 1100 m</aside>')).direct.elevation,false);
});
test('#210 no named individual grower inferred from cooperative affiliation',()=>{
 const p=extractPublicCoffeeFacts(page(),{source_url:chosen210.url});
 assert.ok(!/^(?:jose|maria|njeri)\b/i.test(p.fields?.producer||''),JSON.stringify(p));
});
test('#210 actual parser preserves direct selected Natural and country',()=>{
 const p=extractPublicCoffeeFacts(page(),{source_url:chosen210.url});
 assert.equal(p.fields?.process,'Natural',JSON.stringify(p));
 assert.ok(String(p.fields?.origin||'').toLowerCase().includes('brazil'),JSON.stringify(p));
});
test('#210 actual parser preserves own roast and tasting, not SEO Peru washed',()=>{
 const p=extractPublicCoffeeFacts(page(),{source_url:chosen210.url});
 assert.equal(p.fields?.roast_level,'Medium',JSON.stringify(p));
 assert.ok(['cocoa','pecan','peanut'].every(x=>String(p.fields?.tasting_notes||'').toLowerCase().includes(x)),JSON.stringify(p));
 assert.notEqual(p.fields?.origin,'Peru',JSON.stringify(p));
});
