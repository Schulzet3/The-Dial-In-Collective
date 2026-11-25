import test from 'node:test';
import assert from 'node:assert/strict';
import {reviewedSelectedQaAmendment,reviewedAlreadyPublishedAmendedQa} from './helpers/release-published-restoration.mjs';
const parent='7607c69f62f65979079fd02a0d25f4b7653a2303';
const merge='0cd5054c6684a63062daf794e33ea265daf5ce66';
const path='supabase/tests/recommendation_context_null_controls.sql';
const old='100644:c6c88c23a6d024f5d15bf087d10e15f6f282109a';
const object='100644:61e496319939f59eb4b7843fdb93aa6b4c1e33fa';
const dev='a'.repeat(40),pub='b'.repeat(40);
function fixture(){
 return {
  row:{id:'DIC-Q-509-recommendation-context-null-control-guard',merged_source_sha:parent},
  dev,initialPaths:[path],path,pub,merges:[parent,merge],
  readParents:sha=>sha===merge?[parent]:[],
  isAncestor:(a,b)=>a===merge&&b===dev,
  firstParentChangedPaths:sha=>[parent,merge].includes(sha)?[path,'docs/workstreams/issue-509.md']:[],
  sourceObjectAt:(sha,p)=>p!==path?null:sha===parent+'^'?null:
   [parent,merge+'^'].includes(sha)?old:[merge,dev,pub,'HEAD'].includes(sha)?object:null
 };
}
test('exact direct-child recommendation fixture retains original source ownership',()=>{
 assert.deepEqual(reviewedSelectedQaAmendment(fixture()),{merge,paths:[path]});
 assert.equal(reviewedAlreadyPublishedAmendedQa(fixture()),true);
});
const invalid=[
 ['missing parent reader',()=>({readParents:undefined})],
 ['wrong parent',()=>({readParents:()=>[dev]})],
 ['multiple parents',()=>({readParents:()=>[parent,dev]})],
 ['no parent',()=>({readParents:()=>[]})],
 ['not a development ancestor',()=>({isAncestor:()=>false})],
 ['extra changed executable',f=>({firstParentChangedPaths:sha=>[...f.firstParentChangedPaths(sha),'site/cloud/main.js']})],
 ['unowned fixture',()=>({initialPaths:[]})],
 ['changed amendment blob',f=>({sourceObjectAt:(sha,p)=>sha===merge?old:f.sourceObjectAt(sha,p)})],
 ['unchanged parent blob',f=>({sourceObjectAt:(sha,p)=>sha===parent?object:f.sourceObjectAt(sha,p)})]
];
for(const [name,edit] of invalid)test('reject '+name,()=>{
 const f=fixture();assert.throws(()=>reviewedSelectedQaAmendment({...f,...edit(f)}));
});
test('unrelated item and corrected-child-as-original cannot borrow attribution',()=>{
 const f=fixture();
 assert.equal(reviewedSelectedQaAmendment({...f,row:{...f.row,id:'DIC-Q-509-other'}}),null);
 assert.equal(reviewedSelectedQaAmendment({...f,row:{...f.row,merged_source_sha:merge}}),null);
});
for(const sha of ['HEAD',dev,merge,merge+'^'])test('published amendment rejects drift at '+sha,()=>{
 const f=fixture();assert.throws(()=>reviewedAlreadyPublishedAmendedQa({...f,
  sourceObjectAt:(ref,p)=>ref===sha?(ref===merge+'^'?object:old):f.sourceObjectAt(ref,p)}));
});
test('unpublished, pre-existing and runtime paths do not receive published fixture proof',()=>{
 const f=fixture();
 assert.equal(reviewedAlreadyPublishedAmendedQa({...f,sourceObjectAt:(sha,p)=>sha===pub?old:f.sourceObjectAt(sha,p)}),false);
 assert.equal(reviewedAlreadyPublishedAmendedQa({...f,sourceObjectAt:(sha,p)=>sha===parent+'^'?old:f.sourceObjectAt(sha,p)}),false);
 assert.equal(reviewedAlreadyPublishedAmendedQa({...f,path:'site/cloud/main.js'}),false);
 assert.equal(reviewedAlreadyPublishedAmendedQa({...f,merges:[parent,merge,dev]}),false);
});
