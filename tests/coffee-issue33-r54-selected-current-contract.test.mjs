import test from 'node:test';
import assert from 'node:assert/strict';
import {R54_CASES,r54CurrentIdentityFailures} from '../scripts/audit/issue33-r54-selected-current-contract.mjs';
const copy=(s,name)=>({number:s.number,official_url:'https://'+s.host+s.path,
 final_url:'https://'+s.host+s.path,status:'FETCHED',parser_ok:true,
 selected_h1:[name],selected_heading_identity_verified:s.kind!=='rotating'||/^Sumatra\s+Decaf\b/iu.test(name),
 current_fields:{name},add_coffee_ui_rendered:true,source_review_rendered:true});
test('R54 exact selected #597/#600 identities cannot inherit sibling or SEO names',()=>{
 for(const s of R54_CASES.filter(x=>x.selected)){
  assert.deepEqual(r54CurrentIdentityFailures(copy(s,s.selected),s),[]);
  const other=copy(s,'Related Guatemala Medium');
  other.selected_heading_identity_verified=false;
  assert.ok(r54CurrentIdentityFailures(other,s).includes('current_original_product_changed_'+s.number));
 }
});
test('R54 #594 either current Sumatra or recycled current Timor is identified without certifying Timor as original Sumatra',()=>{
 const s=R54_CASES[0];
 for(const name of ['Sumatra Decaf | Swiss Water® Process','TImor Decaf | Swiss Water® Process']){
  const r=copy(s,name);
  assert.deepEqual(r54CurrentIdentityFailures(r,s),[]);
  r.selected_heading_identity_verified=!r.selected_heading_identity_verified;
  assert.ok(r54CurrentIdentityFailures(r,s).includes('original_identity_mismatch_not_acknowledged_594'));
 }
 const mismatch=copy(s,'Kenya Decaf | Swiss Water® Process');
 assert.ok(r54CurrentIdentityFailures(mismatch,s).includes('not_a_named_current_selected_decaf_594'));
});
test('R54 negative controls: changed selected H1, fake selected parser match, query/redirect, missing source and preview fail closed',()=>{
 for(const s of R54_CASES){
  const name=s.selected||'Sumatra Decaf | Swiss Water® Process';
  const mutations=[
   r=>r.current_fields.name='Archived Coffee from SEO',
   r=>r.selected_h1=[],
   r=>r.selected_h1.push('other product'),
   r=>r.status='UNAVAILABLE',
   r=>r.parser_ok=false,
   r=>r.final_url+='?variant=stale',
   r=>r.final_url=r.final_url.replace('https:','http:'),
   r=>r.final_url='https://other.example/products/sibling',
   r=>r.official_url='https://another.example/products/old',
   r=>r.add_coffee_ui_rendered=false,
   r=>r.source_review_rendered=false
  ];
  for(const mutate of mutations){
   const r=copy(s,name);mutate(r);
   assert.ok(r54CurrentIdentityFailures(r,s).length,JSON.stringify({number:s.number,r}));
  }
 }
});
