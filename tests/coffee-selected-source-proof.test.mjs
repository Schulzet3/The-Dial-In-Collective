import {relocateCoffeeReviewedAdditions as relocate} from '../scripts/release/coffee-selected-source-proof.mjs';
import {checkedCoffeeSourceProof,applyCoffeeReviewedQueueDelta,REVIEWED_COFFEE_COMPONENT} from '../scripts/release/coffee-selected-source-proof.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {reconstructCoffeeSelectedObjects,assertCoffeeSelectedCandidate,proveCoffeeSelectedSource,REVIEWED_COFFEE_IDS} from '../scripts/release/coffee-selected-source-proof.mjs';
const hash=t=>'100644:'+createHash('sha1').update('blob '+Buffer.byteLength(t)+'\0').update(t).digest('hex');
const S=n=>String(n).repeat(40);
const runtime='src/server/coffee-example.mjs',testPath='tests/coffee-example.test.mjs',workflow='.github/workflows/coffee-example.yml';
function fixture(){
 const p=S(1),a=S(2),m=S(3),b=S(4),n=S(5),dev=S(6),ref=S(7);
 const pub='a\nb\nc\nd\ne\nf\ng\nh\ni\nj\nk\n';
 const old1=pub+'excluded-one\n',new1=old1.replace('\ne\n','\nE\n');
 const old2=new1+'excluded-two\n',new2=old2.replace('\ng\n','\nG\n');
 const wanted=pub.replace('\ne\n','\nE\n').replace('\ng\n','\nG\n');
 const testText='import assert from "node:assert/strict";\nassert.ok(true);\n';
 const workflowText='name: coffee example\non: push\n';
 const data=new Map(),put=(r,path,t)=>data.set(r+':'+path,t);
 for(const [r,t] of [[p,pub],[a,old1],[m,new1],[b,old2],[n,new2],[ref,new2],[dev,new2],['HEAD',wanted]])put(r,runtime,t);
 for(const r of [m,ref,dev,'HEAD'])put(r,testPath,testText);
 for(const r of [m,ref,dev])put(r,workflow,workflowText);
 const paths1={[runtime]:[hash(old1),hash(new1)],[testPath]:[null,hash(testText)],[workflow]:[null,hash(workflowText)]};
 const paths2={[runtime]:[hash(old2),hash(new2)]};
 const s1={id:'DIC-Q-33-example-one',merge:m,parent:a,paths:paths1},s2={id:'DIC-Q-33-example-two',merge:n,parent:b,paths:paths2};
 const spec={published:p,reference:ref,sources:[s1,s2],runtime_results:{[runtime]:hash(wanted)}};
 const patch=(before,after,start,lines)=>'diff --git a/'+runtime+' b/'+runtime+'\nindex '+hash(before).slice(7)+'..'+hash(after).slice(7)+' 100644\n--- a/'+runtime+'\n+++ b/'+runtime+'\n@@ -'+start+',7 +'+start+',7 @@\n'+lines+'\n';
 const patches=new Map([[m,patch(old1,new1,2,' b\n c\n d\n-e\n+E\n f\n g\n h')],
 [n,patch(old2,new2,4,' d\n E\n f\n-g\n+G\n h\n i\n j')]]);
 const readers={developmentSourceSha:dev,dev,
  sourceObjectAt:(r,path)=>data.has(r+':'+path)?hash(data.get(r+':'+path)):null,
  sourceTextAt:(r,path)=>data.get(r+':'+path),readGitText:(r,path)=>data.get(r+':'+path),
  firstParentChangedPaths:r=>Object.keys(r===m?paths1:paths2),firstParentPatch:r=>patches.get(r),
  readParents:r=>[r===m?a:b],isAncestor:()=>true};
 return {spec,readers,data,patches,put,dev,ref,p,m,n,a,b,pub,wanted};
}
test('reconstructs selected full patches while excluding unrelated original-parent source',()=>{
 const f=fixture(),p=reconstructCoffeeSelectedObjects(f.spec,f.readers);
 assert.equal(p.texts[runtime],f.wanted);
 assert.ok(!p.texts[runtime].includes('excluded-'));
 assert.equal(p.objects[workflow],null);
 assert.equal(p.objects[testPath],f.readers.sourceObjectAt(f.m,testPath));
 assert.deepEqual(p.runtimeObjects,{[runtime]:hash(f.wanted)});
 assert.equal(assertCoffeeSelectedCandidate(p,{candidateSha:f.dev,sourceObjectAt:(r,path)=>f.readers.sourceObjectAt('HEAD',path)}),true);
});
test('component requires every selected shared source and the exact immutable queues',()=>{
 assert.throws(()=>proveCoffeeSelectedSource({selectedIds:[REVIEWED_COFFEE_IDS[0]]}),/partial reviewed/);
 assert.throws(()=>proveCoffeeSelectedSource({selectedIds:REVIEWED_COFFEE_IDS,sourceObjectAt:()=>null}),/queue object mismatch/);
 assert.equal(proveCoffeeSelectedSource({selectedIds:[]}),null);
});
test('serialized or caller-constructed receipts cannot authorize source or queue overrides',()=>{
 const context={developmentSourceSha:S(1),publishedSourceSha:S(2),selectedIds:REVIEWED_COFFEE_IDS};
 assert.throws(()=>checkedCoffeeSourceProof(null,context),/exact recomputed/);
 assert.throws(()=>checkedCoffeeSourceProof({ids:REVIEWED_COFFEE_IDS,receipt:{}},context),/exact recomputed/);
 assert.throws(()=>applyCoffeeReviewedQueueDelta({items:[]},{ids:REVIEWED_COFFEE_IDS}),/unverified queue/);
 assert.equal(checkedCoffeeSourceProof(null,{...context,selectedIds:[]}),null);
 assert.ok(Object.isFrozen(REVIEWED_COFFEE_COMPONENT.sources[0].paths));
 assert.ok(Object.isFrozen(REVIEWED_COFFEE_COMPONENT.r408_relocation.hunks[0]));
});
for(const [name,mutate] of [
 ['changed parent',f=>{f.readers.readParents=()=>[S(9)];}],
 ['missing selected original executable',f=>{f.readers.firstParentChangedPaths=()=>[runtime];}],
 ['unexpected original executable',f=>{const old=f.readers.firstParentChangedPaths;f.readers.firstParentChangedPaths=r=>[...old(r),'src/server/unowned.mjs'];}],
 ['wrong original blob',f=>{f.put(f.m,runtime,'wrong\n');}],
 ['unreviewed live drift',f=>{f.put(f.dev,runtime,'later unknown\n');}],
 ['altered immutable blob reader',f=>{const old=f.readers.sourceObjectAt;f.readers.sourceObjectAt=(r,p)=>r===f.a&&p===runtime?'100644:'+'f'.repeat(40):old(r,p);}],
 ['missing historical hunk',f=>{f.patches.set(f.m,f.patches.get(f.m).replace(' e\n','').replace('-e\n',''));}],
 ['source contaminated final expectation',f=>{f.spec.runtime_results[runtime]=f.readers.sourceObjectAt(f.dev,runtime);}],
 ['published selected workflow',f=>{f.put(f.p,workflow,'name: not allowed\n');}],
 ['selected test drift',f=>{f.put(f.dev,testPath,'changed assertion\n');}],
 ['source not integrated',f=>{f.readers.isAncestor=()=>false;}]
])test('rejects '+name,()=>{const f=fixture();mutate(f);assert.throws(()=>reconstructCoffeeSelectedObjects(f.spec,f.readers),/COFFEE_SELECTED_SOURCE_HOLD/);});
test('rejects candidate unselected source and missing selected assertions',()=>{
 const f=fixture(),p=reconstructCoffeeSelectedObjects(f.spec,f.readers);
 for(const path of [runtime,testPath,workflow]){
  assert.throws(()=>assertCoffeeSelectedCandidate(p,{candidateSha:f.dev,sourceObjectAt:(r,x)=>x===path?'100644:'+'f'.repeat(40):p.objects[x]}),/candidate byte/);
 }
});
function relocationFixture(){
 const path=runtime,before='unselected\nanchor-top\na\nb\nc\nd\ne\nf\ng\nh\nanchor-bottom\nexcluded-bottom\ni\nj\n';
 const after=before.replace('anchor-top\n','top-addition\nanchor-top\n').replace('anchor-bottom\n','anchor-bottom\nbottom-addition\n');
 const published=before.replace('unselected\n','').replace('excluded-bottom\n','');
 const selected=published,wanted=after.replace('unselected\n','').replace('excluded-bottom\n','');
 const spec={path,original_parent_blob:hash(before).slice(7),original_merge_blob:hash(after).slice(7),
  selected_eight_blob:hash(selected).slice(7),selected_nine_blob:hash(wanted).slice(7),hunks:[
   {hunk:1,inserted_lines:1,anchor:'anchor-top\n',insertion:'top-addition\n',side:'before_exact_following_published_anchor'},
   {hunk:2,inserted_lines:1,anchor:'g\nh\nanchor-bottom\n',insertion:'bottom-addition\n',side:'after_exact_preceding_published_anchor'}]};
 const patch='diff --git a/'+path+' b/'+path+'\nindex '+hash(before).slice(7)+'..'+hash(after).slice(7)+' 100644\n--- a/'+path+'\n+++ b/'+path+'\n'+
  '@@ -1,4 +1,5 @@\n unselected\n+top-addition\n anchor-top\n a\n b\n'+
  '@@ -9,5 +10,6 @@\n g\n h\n anchor-bottom\n+bottom-addition\n excluded-bottom\n i\n';
 return {spec,values:{before,after,selected,published,patch},wanted};
}
test('reviewed two insertion relocation retains complete selected delta without excluded surrounding code',()=>{
 const f=relocationFixture();assert.equal(relocate(f.spec,f.values),f.wanted);
 assert.ok(!f.wanted.includes('unselected'));assert.ok(!f.wanted.includes('excluded-bottom'));
});
for(const [name,change] of [
 ['altered exact original source',f=>{f.values.before+='extra\n';}],
 ['changed original full-index header',f=>{f.values.patch=f.values.patch.replace('index ','index 000');}],
 ['missing original second hunk',f=>{f.values.patch=f.values.patch.split('@@ -9,5')[0];}],
 ['unreviewed extra original hunk',f=>{f.values.patch+='@@ -14,1 +16,1 @@\n-j\n+J\n';}],
 ['wrong original insertion chunk',f=>{f.spec.hunks[0].insertion='invented\n';}],
 ['unreviewed relocation side',f=>{f.spec.hunks[0].side='after_exact_preceding_published_anchor';}],
 ['missing published anchor',f=>{f.values.published=f.values.published.replace('anchor-top\n','other\n');}],
 ['duplicate published anchor',f=>{f.values.published+='anchor-top\n';}],
 ['missing selected preimage anchor',f=>{f.values.selected=f.values.selected.replace('anchor-top\n','other\n');}],
 ['duplicate selected preimage anchor',f=>{f.values.selected+='anchor-top\n';}],
 ['partially selected original insertion',f=>{f.values.selected='top-addition\n'+f.values.selected;}],
 ['unproved resulting blob',f=>{f.spec.selected_nine_blob='e'.repeat(40);}]
])test('reviewed relocation rejects '+name,()=>{const f=relocationFixture();change(f);assert.throws(()=>relocate(f.spec,f.values));});
