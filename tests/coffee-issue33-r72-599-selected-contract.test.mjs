import test from 'node:test';
import assert from 'node:assert/strict';
import {selectedYellowstone599DirectFacts as audit} from '../scripts/audit/issue33-r72-599-selected-contract.mjs';
const prose='This remarkable Colombian coffee comes to us from the small town of Salado Blanco and has all the characteristics that are distinct to the Huila region.';
const body=(heading='COLOMBIA HUILA',roast='Juicy &amp; Dynamic - Medium-Light Roast',notes='NOTES: DRIED CHERRY, CITRUS, CUSTARD',facts='Origin Huila, Colombia Process Washed and Sun Dried Cooperative Small co-ops in Salado Blanco',story=prose)=>'<main><h1>'+heading+'</h1><p>'+roast+'</p><p>'+notes+'</p><p>'+story+'</p><section>'+facts+'</section></main>';
test('current selected Huila notes roast and cooperative roles',()=>assert.ok(Object.values(audit(body(),['COLOMBIA HUILA'])).every(Boolean)));
test('historic word order is not current roast proof',()=>assert.equal(audit(body(undefined,'Light-Medium Roast'),['COLOMBIA HUILA']).directRoast,false));
test('changed selected identity or multiple selected titles fail closed',()=>{
 assert.equal(audit(body('COLOMBIA NARIÑO'),['COLOMBIA NARIÑO']).selectedIdentity,false);
 assert.equal(audit(body(),['COLOMBIA HUILA','COLOMBIA HUILA']).selectedIdentity,false);
});
test('irrelevant related recommendation cannot supply selected notes and fields',()=>{
 const html=body(undefined,undefined,'','','Selected coffee <aside>NOTES: DRIED CHERRY, CITRUS, CUSTARD Origin Huila, Colombia Process Washed and Sun Dried Cooperative Small co-ops in Salado Blanco</aside>');
 const d=audit(html,['COLOMBIA HUILA']);
 assert.equal(d.directNotes,false);
 assert.equal(d.labeledCurrentOrigin,false);
});
test('script metadata cannot prove selected notes',()=>assert.equal(audit(body(undefined,undefined,'<script>NOTES: DRIED CHERRY, CITRUS, CUSTARD</script>'),['COLOMBIA HUILA']).directNotes,false));
test('storewide small farm sourcing cannot replace named coops',()=>assert.equal(audit(body(undefined,undefined,undefined,'Origin Huila, Colombia Process Washed and Sun Dried Small Farm Sourcing'),['COLOMBIA HUILA']).labeledSaladoBlancoCoops,false));
test('wrong origin or process rejects typed direct source',()=>{
 assert.equal(audit(body(undefined,undefined,undefined,'Origin Antioquia, Colombia Process Washed and Sun Dried Cooperative Small co-ops in Salado Blanco'),['COLOMBIA HUILA']).labeledCurrentOrigin,false);
 assert.equal(audit(body(undefined,undefined,undefined,'Origin Huila, Colombia Process Natural Cooperative Small co-ops in Salado Blanco'),['COLOMBIA HUILA']).labeledWashedSunDried,false);
});
