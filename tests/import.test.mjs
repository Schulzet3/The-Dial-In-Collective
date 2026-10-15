import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fixture} from './import-fixture.js';
import {parseImport,previewMarkup,MAX_IMPORT_BYTES} from '../site/cloud/import-preview.js';
import {createCloudClient} from '../site/cloud/client.js';
import {installNativeImport} from '../site/cloud/import-integration.js';
const parse = d => parseImport(JSON.stringify(d));
test('valid personal prototype has accurate coffee and shot counts',()=>{const r=parse(fixture());assert.equal(r.summary.coffees.length,2);assert.equal(r.summary.shots,3);assert.equal(r.summary.currentCoffee,'Sample One');});
test('parser retains source and legacy metadata without rewriting',()=>{const d=fixture();const r=parse(d);assert.deepEqual(r.document,d);assert.deepEqual(d,fixture());});
test('null grind remains distinct from measured zero',()=>{const r=parse(fixture());assert.equal(r.summary.missingGrind,1);assert.equal(r.document.data.shots[0].grindSetting,null);assert.equal(r.document.data.shots[1].grindSetting,0);});
test('unknown feed is counted without claiming Standard Feed',()=>{const r=parse(fixture());assert.equal(r.summary.unknownFeed,3);assert.ok(r.document.data.shots.every(s=>s.feedMode===null));});
test('unlogged coffee is included but not pinned',()=>{const r=parse(fixture());assert.equal(r.summary.coffees[1].shots,0);assert.equal(r.summary.coffees[1].current,false);assert.equal(r.summary.coffees[1].estimated,true);});
test('out-of-style times and advisory dose variance are allowed',()=>{assert.doesNotThrow(()=>parse(fixture()));});
test('invalid JSON is not imported',()=>{assert.throws(()=>parseImport('{bad'),/valid JSON/);});
test('original raw export needs conversion instead of guessing',()=>{assert.throws(()=>parse({format:1,personal:{}}),/conversion/);});
test('demo records are rejected',()=>{const d=fixture();d.data.mode='demo';assert.throws(()=>parse(d),/personal/);});
test('oversized file rejected before parse',()=>{assert.throws(()=>parseImport(' '.repeat(MAX_IMPORT_BYTES+1)),/2 MB/);});
test('nested credential data rejected without echoing its value',()=>{const d=fixture();d.data.legacyArchive.access_token='sensitive-value';assert.throws(()=>parse(d),e=>/credential/.test(e.message)&&!e.message.includes('sensitive-value'));});
test('prototype pollution keys blocked',()=>{assert.throws(()=>parseImport('{"__proto__":{"polluted":true}}'),/unsafe/);assert.equal({}.polluted,undefined);});
test('duplicate primary IDs blocked',()=>{const d=fixture();d.data.shots.push(d.data.shots[0]);assert.throws(()=>parse(d),/Duplicate/);});
test('duplicate legacy IDs blocked even when converted IDs differ',()=>{const d=fixture();d.data.shots[1].legacyId=d.data.shots[0].legacyId;assert.throws(()=>parse(d),/Duplicate legacy/);});
test('broken historical snapshots are rejected rather than overwritten',()=>{const d=fixture();d.data.shots[0].snapshot.basketDoseG=20;assert.throws(()=>parse(d),/snapshot/);});
test('invalid numeric strings are not coerced into measurements',()=>{const d=fixture();d.data.shots[0].doseG='18';assert.throws(()=>parse(d),/recorded numbers/);});
test('missing taste rating is not fabricated',()=>{const d=fixture();delete d.data.shots[0].tasteScales.body;assert.throws(()=>parse(d),/rating/);});
test('fractional taste rating is rejected',()=>{const d=fixture();d.data.shots[0].tasteScales.body=2.5;assert.throws(()=>parse(d),/whole numbers/);});
test('multi-version export is blocked without silently dropping versions',()=>{const d=fixture();d.data.setups[0].versions.push({...d.data.setups[0].versions[0],id:'v2'});assert.throws(()=>parse(d),/Multiple equipment versions/);});
test('experiment data is blocked without silent loss',()=>{const d=fixture();d.data.experiments.push({id:'e'});assert.throws(()=>parse(d),/Experiment migration/);});
test('current unlogged coffee is rejected',()=>{const d=fixture();d.data.setups[0].workspaces.v.currentCoffeeId='c2';assert.throws(()=>parse(d),/unlogged/);});
test('preview escapes coffee names and explains save gate',()=>{const summary=parse(fixture()).summary;summary.coffees[0].name='<img src=x onerror=alert(1)>';const page=previewMarkup(summary,{ok:true,canImport:false,blockReason:'Recovery pending'});assert.doesNotMatch(page,/<img/);assert.match(page,/&lt;img/);assert.match(page,/Recovery pending/);assert.match(page,/No changes have been saved/);});
function sdkFixture(){const calls=[];const sdk={auth:{onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})},async rpc(name,p){calls.push({name,p});return {data:{ok:true},error:null};}};return {sdk,calls};}
test('preview and commit APIs bind original owner and reviewed hash',async()=>{const f=sdkFixture(),client=createCloudClient(f.sdk,{assertSecure(){}}),doc=fixture();await client.previewImport('a',doc);await client.commitImport('a',doc,'hash',true);assert.deepEqual(f.calls.map(c=>c.name),['dic_preview_import','dic_commit_import']);assert.equal(f.calls[0].p.expected_owner,'a');assert.equal(f.calls[1].p.review_hash,'hash');assert.equal(f.calls[1].p.recovery_saved,true);});
test('missing identity rejected before any import network request',async()=>{const f=sdkFixture(),client=createCloudClient(f.sdk,{assertSecure(){}});await assert.rejects(client.previewImport(null,fixture()),/Sign in/);assert.equal(f.calls.length,0);});
test('insecure import cannot call SDK',async()=>{const f=sdkFixture(),client=createCloudClient(f.sdk,{assertSecure(){throw Error('HTTPS required');}});await assert.rejects(client.previewImport('a',fixture()),/HTTPS/);assert.equal(f.calls.length,0);});
test('settings integration is installed once and preserves standard clicks',async()=>{
 const nodes=[];const links={firstChild:null,querySelector:()=>nodes.find(n=>n.dataset?.action==='import-backup'),insertBefore:n=>nodes.push(n)};
 const dom={querySelector:()=>links,createElement:()=>({dataset:{}})};
 class App {settings(){this.shown=(this.shown||0)+1;}click(){this.clicked=true;}error(e){this.lastError=e;}}
 class Panel{constructor(app){this.app=app;}async open(){this.app.opened=(this.app.opened||0)+1;}}
 installNativeImport(App,dom,Panel);installNativeImport(App,dom,Panel);const app=new App();app.settings();app.settings();assert.equal(nodes.length,1);assert.equal(app.shown,2);
 await app.click({target:{closest:()=>({dataset:{action:'import-backup'}})}});assert.equal(app.opened,1);
 app.click({target:{closest:()=>({dataset:{action:'log'}})}});assert.equal(app.clicked,true);
});
test('beta entry starts the app without mounting manual Recovery UI',async()=>{const code=await readFile(new URL('../site/cloud/import-entry.js',import.meta.url),'utf8');assert.match(code,/import '\.\/main\.js'/);assert.doesNotMatch(code,/installNativeImport\(CloudApp\)/);});
