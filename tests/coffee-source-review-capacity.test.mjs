import test from 'node:test';
import assert from 'node:assert/strict';
import {MAX_SOURCE_REVIEW_FACTS,coffeeSourceReviewSnapshot,coffeeUrlPreviewMarkup} from '../site/cloud/coffee-url-autofill.js';
import {MAX_SOURCE_FACTS,MAX_SOURCE_FACT_CHARACTERS,mergeCoffeeSourceFacts} from '../src/server/coffee-source-facts.mjs';

const source_url='https://roaster.example/products/current';
const rows=count=>Array.from({length:count},(_,i)=>({label:'Published fact '+i,value:'Source value '+i,source_url,source_type:'html'}));

test('the expanded server allowance survives the actual client preview and download in full',()=>{
 assert.equal(MAX_SOURCE_REVIEW_FACTS,MAX_SOURCE_FACTS);
 const facts=mergeCoffeeSourceFacts(rows(MAX_SOURCE_FACTS));
 assert.equal(facts.length,MAX_SOURCE_FACTS);
 assert.equal(facts.truncated,false);
 const result={ok:true,source_url,source_facts:facts};
 const exported=coffeeSourceReviewSnapshot(result);
 assert.deepEqual(exported.published_source_information,facts);
 assert.equal(exported.source_information_truncated,false);
 const markup=coffeeUrlPreviewMarkup(result);
 assert.ok(markup.includes('Source value '+(MAX_SOURCE_FACTS-1)));
 assert.doesNotMatch(markup,/more information than the preview can display/);
});

test('an over-budget server result remains bounded and visibly marked as incomplete',()=>{
 const facts=mergeCoffeeSourceFacts(rows(MAX_SOURCE_FACTS+1));
 assert.equal(facts.length,MAX_SOURCE_FACTS);assert.equal(facts.truncated,true);
 const result={ok:true,source_url,source_facts:facts,source_facts_truncated:facts.truncated};
 assert.equal(coffeeSourceReviewSnapshot(result).source_information_truncated,true);
 assert.match(coffeeUrlPreviewMarkup(result),/more information than the preview can display/);
});

test('client-side safety clipping cannot silently export a falsely complete review',()=>{
 const result={ok:true,source_url,source_facts:rows(MAX_SOURCE_FACTS+1)};
 const exported=coffeeSourceReviewSnapshot(result);
 assert.equal(exported.published_source_information.length,MAX_SOURCE_REVIEW_FACTS);
 assert.equal(exported.source_information_truncated,true);
 assert.match(coffeeUrlPreviewMarkup(result),/more information than the preview can display/);
 const long=coffeeSourceReviewSnapshot({ok:true,source_url,source_facts:[{label:'Long source',value:'a'.repeat(1599)+'🍋tail'}]});
 assert.equal(long.source_information_truncated,true);
 assert.ok(long.published_source_information[0].value.isWellFormed());
});

test('larger fact counts do not weaken the aggregate character ceiling or export privacy',()=>{
 const facts=mergeCoffeeSourceFacts(rows(MAX_SOURCE_FACTS).map(row=>({...row,value:row.value+' '+ 'x'.repeat(1500)})));
 const units=facts.reduce((sum,fact)=>sum+['label','value','section','source_path','source_locator'].reduce((n,key)=>n+(fact[key]?.length||0),0),0);
 assert.ok(units<=MAX_SOURCE_FACT_CHARACTERS);assert.equal(facts.truncated,true);
 const exported=coffeeSourceReviewSnapshot({ok:true,source_url,source_facts:facts,source_facts_truncated:true,auth_token:'private-token',member_id:'private-owner'});
 assert.deepEqual(exported.published_source_information,facts);
 assert.doesNotMatch(JSON.stringify(exported),/private-token|private-owner/);
});
