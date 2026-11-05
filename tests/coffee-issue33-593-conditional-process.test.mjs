// Original603 #593: a current selected "whether washed or natural"
// sentence is not an actual process field for the purchased coffee.
import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {coffeeUrlPreviewMarkup,coffeeSourceReviewSnapshot} from '../site/cloud/coffee-url-autofill.js';
const source_url='https://coffee.example.test/products/ethiopian';
const parse=body=>extractPublicCoffeeFacts('<main><h1>Ethiopian | Single Origin Coffee</h1>'+body+'</main>',{source_url});
const conditional='Whether washed or natural process, it has an incredibly complex and delicious cup.';
test('selected #593 alternatives are not current Natural processing evidence',()=>{
 const r=parse('<p>'+conditional+'</p><p>Fruity, stone fruits, orange blossom.</p>');
 assert.equal(r.ok,true);
 assert.equal(r.fields.process,undefined);
 assert.ok(!r.conflicts?.includes('process'));
 assert.match(coffeeUrlPreviewMarkup(r),/coffee-url-preview/);
 assert.ok(coffeeSourceReviewSnapshot({...r,source_url}));
});
for(const sentence of [
 'Whether natural or washed process, it will taste incredible.',
 'Whether washed process or natural process, the profile is balanced.',
 'Whether honey or anaerobic process, the cup is remarkable.'
])test('other conditional alternatives cannot select a method: '+sentence,()=>{
 const r=parse('<p>'+sentence+'</p>');
 assert.equal(r.fields.process,undefined);
});
for(const [direct,expect] of [['Process: Natural','Natural'],['Process: Washed','Washed']])
 test('explicit selected process remains authoritative: '+direct,()=>{
  const r=parse('<p>'+direct+'</p><p>'+conditional+'</p>');
  assert.equal(r.fields.process,expect);
 });
test('unconditional exact selected processing remains when no alternative text exists',()=>{
 const r=parse('<p>Process: Natural</p>');
 assert.equal(r.fields.process,'Natural');
});
test('related alternatives cannot override direct selected method',()=>{
 const r=parse('<p>Process: Natural</p><h2>Related Products</h2><p>'+conditional+'</p>');
 assert.equal(r.fields.process,'Natural');
});
test('a genuinely mixed process is never simplified to a single conditional method',()=>{
 const r=parse('<p>Process: Washed &amp; Natural</p><p>'+conditional+'</p>');
 assert.notEqual(r.fields.process,'Washed');
 assert.notEqual(r.fields.process,'Natural');
});
