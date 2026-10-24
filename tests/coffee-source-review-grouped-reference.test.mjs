import test from 'node:test';
import assert from 'node:assert/strict';
import {coffeeSourceReviewSnapshot,coffeeUrlPreviewMarkup} from '../site/cloud/coffee-url-autofill.js';

test('source review keeps bounded grouped references exact without rendering structures or exporting member data',()=>{
 const source_url='https://roaster.example/products/current';
 const facts=[
  {label:'First subscription plans',source_url,source_type:'product_json',source_path:'/variants/0/plans',format:'json',part:0,value:'[{"price":0,"maximum":null}]'},
  {label:'Repeated subscription plans',source_url,source_type:'product_json',source_path:'/variants/1/plans',format:'reference',part:0,
   value:JSON.stringify({source_path:'/variants/0/plans',destinations:['/variants/1/plans','/variants/2/plans']})}
 ];
 const result={ok:true,source_url,fields:{name:'Current Coffee'},source_facts:facts,source_facts_truncated:true,
  match:{member_id:'private-member'},auth_token:'private-token'};
 const exported=coffeeSourceReviewSnapshot(result,{checkedAt:'2026-10-24T02:30:00Z'});
 assert.deepEqual(exported.published_source_information,facts);
 assert.equal(exported.source_information_truncated,true);
 assert.doesNotMatch(JSON.stringify(exported),/private-member|private-token/);
 assert.doesNotMatch(coffeeUrlPreviewMarkup(result),/destinations|maximum|subscription plans/);
});
