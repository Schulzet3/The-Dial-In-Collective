import test from 'node:test';
import assert from 'node:assert/strict';
import {selectedProductHeadings} from '../scripts/audit/issue33-selected-product-heading.mjs';

const animated=name=>'<h1 class="blinds-text"><div class="word">'+[...name].map((c,i)=>
 '<span class="char-clip"><span style="--i:'+i*20+'ms">'+c+'</span></span>').join('')+'</div></h1>';

test('Onyx selected 5K+ byte character-animated H1 retains its real coffee identity',()=>{
 for(const name of ['Colombia Finca Anaya Wush Wush','Ethiopia Agaro Yukro G1',
 'Mexico Finca Santa Cruz Gesha']){
  const padded=animated(name).replace('</h1>','<div>'+('<em> </em>'.repeat(320))+'</div></h1>');
  assert.ok(padded.length>1800);
  assert.deepEqual(selectedProductHeadings(padded),[name]);
 }
});
test('ordinary selected headings retain punctuation, accents, entities and upper bounds',()=>{
 assert.deepEqual(selectedProductHeadings('<h1>Perú &amp; Brasil — #1</h1>'),['Perú & Brasil — #1']);
 assert.deepEqual(selectedProductHeadings('<h1>'+('&amp;'.repeat(300))+'</h1>'),[]);
 assert.deepEqual(selectedProductHeadings('<h2>Unrelated</h2>'),[]);
});
test('partially animated, oversized or mismatched H1 cannot silently certify another coffee',()=>{
 const x=animated('Colombia Finca Anaya Wush Wush');
 assert.deepEqual(selectedProductHeadings(x.replace('class="char-clip"','class="char-clip-missing"')),[]);
 assert.deepEqual(selectedProductHeadings(animated('Different Recycled Product')),['Different Recycled Product']);
});
