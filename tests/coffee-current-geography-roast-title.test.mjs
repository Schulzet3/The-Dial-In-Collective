import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts} from '../src/server/coffee-page-metadata.mjs';
import {extractRoastVisualEvidence} from '../src/server/roast-level-evidence.mjs';
const url='https://roaster.examplecoffee.com/products/selected';
const parse=html=>extractPublicCoffeeFacts(html,{source_url:url});
const html=title=>`<main><h1>${title}</h1><p>Process: Washed</p></main>`;

test('the only current-product H1 can print literal locality and complete roast category',()=>{
 for(const [title,roast] of [['Sumatra Medium','Medium'],['Colombia Medium','Medium'],['Kenya Light','Light'],['Costa Rica Medium-Dark','Medium-Dark']]){
  const source=html(title),out=parse(source);
  assert.equal(extractRoastVisualEvidence(source).value,roast,title);
  assert.equal(out.fields.roast_level,roast,title);
  assert.ok(!out.conflicts?.includes('roast_level'));
 }
});
test('unrelated H1, a nongeographic product title, a selection range or multiple H1s cannot infer roast',()=>{
 for(const source of [html('Daily Medium'),html('Medium'),html('Colombia Medium+'),html('Colombia Light/Medium'),html('Honduras Blonde'),
  '<main><h1>Colombia Medium</h1><h1>Other Roast</h1></main>',
  '<main><h1>Selected Coffee</h1><div class="related-products"><h1>Sumatra Medium</h1></div></main>',
  '<main><h1>Selected Coffee</h1><p>Browse Kenya Medium products</p></main>']){
  const out=parse(source);
  assert.equal(extractRoastVisualEvidence(source).value,null,source);
  assert.equal(out.fields?.roast_level,undefined,source);
 }
});
test('another explicit current product roast conflicts rather than being silently overwritten',()=>{
 const source='<main><h1>Sumatra Medium</h1><p>Roast Level: Dark</p></main>';
 const out=parse(source);
 assert.notEqual(out.fields.roast_level,'Medium');
 assert.ok(out.conflicts?.includes('roast_level'));
});
