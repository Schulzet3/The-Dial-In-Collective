import {relocateCoffeeSelectedQa as relocate} from './helpers/release-published-restoration.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {reconstructCoffeeSelectedQa,verifyReviewedCoffeeSelectedQa} from './helpers/release-published-restoration.mjs';
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
test('independent QA reconstructs selected source and binds candidate/tests/workflow absence',()=>{
 const f=fixture(),p=reconstructCoffeeSelectedQa(f.spec,f.readers);
 assert.equal(p.objects[runtime],hash(f.wanted));
 assert.deepEqual(p.runtimePaths,[runtime]);
 assert.equal(p.objects[workflow],null);
 assert.ok(p.protectedPaths.includes(testPath));
});
test('independent QA rejects partial component and unselected claimed receipt',()=>{
 assert.throws(()=>verifyReviewedCoffeeSelectedQa({addedIds:['DIC-Q-33-r311-original63-selected-sourcing-province'],manifest:{}}),/partial coffee/);
 assert.throws(()=>verifyReviewedCoffeeSelectedQa({addedIds:[],manifest:{reviewed_coffee_source_component:{}}}));
 assert.equal(verifyReviewedCoffeeSelectedQa({addedIds:[],manifest:{}}),null);
});
for(const [name,mutate] of [
 ['wrong parent',f=>{f.readers.readParents=()=>[S(9)];}],
 ['missing original selected test',f=>{f.readers.firstParentChangedPaths=()=>[runtime,workflow];}],
 ['extra original executable',f=>{const old=f.readers.firstParentChangedPaths;f.readers.firstParentChangedPaths=r=>[...old(r),'scripts/unknown.mjs'];}],
 ['historical object tampering',f=>{f.put(f.a,runtime,'different parent\n');}],
 ['later live drift',f=>{f.put(f.dev,runtime,'new change\n');}],
 ['truncated selected patch',f=>{f.patches.set(f.m,f.patches.get(f.m).replace('-e\n',''));}],
 ['candidate unselected contamination',f=>{f.put('HEAD',runtime,f.wanted+'unselected-new\n');}],
 ['candidate missing selected test',f=>{f.data.delete('HEAD:'+testPath);}],
 ['candidate unreviewed workflow',f=>{f.put('HEAD',workflow,'name: unreviewed\n');}],
 ['changed published workflow',f=>{f.put(f.p,workflow,'name: not absent\n');}],
 ['false output hash',f=>{f.spec.runtime_results[runtime]=f.readers.sourceObjectAt(f.dev,runtime);}],
 ['unintegrated original source',f=>{f.readers.isAncestor=()=>false;}]
])test('independent QA rejects '+name,()=>{const f=fixture();mutate(f);assert.throws(()=>reconstructCoffeeSelectedQa(f.spec,f.readers));});
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
