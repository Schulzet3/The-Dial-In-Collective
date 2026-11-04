import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {lastRecipeContextShot} from '../site/lib/ui.js';

const context={style:'Turbo',basketId:'basket-18',feedMode:'slow'};
const version={id:'setup-v2',calibrationId:'grind-cal-2'};
function shot(id,timestamp,overrides={}){
 return {id,coffeeId:'coffee-a',setupVersionId:'setup-v2',
  calibrationId:'grind-cal-2',basketId:'basket-18',
  style:'Turbo',feedMode:'slow',timestamp,hidden:false,
  doseG:18,yieldG:36,timeS:16,grindSetting:1.2,
  tasteScales:{extraction:3,body:3,clarity:5,sweetness:4,astringency:1},
  notes:'Private original note',...overrides};
}

test('#455 wrong newer feed/basket/calibration cannot overwrite latest feedback for visible recipe',()=>{
 const shots=[
  shot('newer-other-feed','2026-11-04T13:00:00Z',{feedMode:'standard'}),
  shot('newer-other-basket','2026-11-04T12:00:00Z',{basketId:'basket-20'}),
  shot('newer-other-calibration','2026-11-04T11:00:00Z',{calibrationId:'grind-cal-1'}),
  shot('correct','2026-11-04T10:00:00Z')
 ];
 const original=structuredClone(shots);
 // Old real card selector used only setupVersionId and style.
 assert.equal(shots.filter(sh=>sh.setupVersionId===version.id&&sh.style===context.style)[0].id,'newer-other-feed');
 assert.equal(lastRecipeContextShot(shots,'coffee-a',context,version)?.id,'correct');
 assert.equal(lastRecipeContextShot(shots,'coffee-a',{...context,feedMode:'standard'},version)?.id,'newer-other-feed');
 assert.equal(lastRecipeContextShot(shots,'coffee-a',{...context,basketId:'basket-20'},version)?.id,'newer-other-basket');
 assert.deepEqual(shots,original,'feedback filtering must not mutate measured shots, taste or private notes');
});

test('#455 feedback selection excludes other coffee, setup, style, calibration, hidden and unknown timestamps',()=>{
 const invalid=[
  shot('other-coffee','2026-11-04T13:00:00Z',{coffeeId:'coffee-b'}),
  shot('old-setup','2026-11-04T13:00:00Z',{setupVersionId:'setup-v1'}),
  shot('other-style','2026-11-04T13:00:00Z',{style:'Fast-Flow'}),
  shot('calibration-old','2026-11-04T13:00:00Z',{calibrationId:'grind-cal-1'}),
  shot('hidden','2026-11-04T13:00:00Z',{hidden:true}),
  shot('no-time',null),
  shot('good-old','2026-11-02T13:00:00Z'),
  shot('good-new','2026-11-03T13:00:00Z')
 ];
 assert.equal(lastRecipeContextShot(invalid,'coffee-a',context,version)?.id,'good-new');
 assert.equal(lastRecipeContextShot(invalid.filter(sh=>sh.id!=='good-new'&&sh.id!=='good-old'),'coffee-a',context,version),null);
 assert.equal(lastRecipeContextShot(invalid,'coffee-b',context,version)?.id,'other-coffee');
});

test('#455 no assumed comparable shot when context or history is absent, and real card invokes scoped helper',()=>{
 assert.equal(lastRecipeContextShot([], 'coffee-a',context,version),null);
 assert.equal(lastRecipeContextShot(null,'coffee-a',context,version),null);
 assert.equal(lastRecipeContextShot([shot('only','2026-11-04T10:00:00Z')],'coffee-a',null,version),null);
 assert.equal(lastRecipeContextShot([shot('only','2026-11-04T10:00:00Z')],'coffee-a',context,{id:'setup-v2'}),null);
 const cloud=readFileSync(new URL('../site/cloud/main.js',import.meta.url),'utf8');
 assert.match(cloud,/U\.lastRecipeContextShot\(shots,c\.id,rec,v\)/);
 assert.doesNotMatch(cloud,/const local=shots\.filter\(sh=>sh\.setupVersionId===v\.id&&sh\.style===p\.style\),last=local\[0\]/);
});

// A restored legacy shot may preserve its original rating and private notes
// without a trustworthy timestamp. It must not become the current recipe's
// latest feedback just because it is the only otherwise matching record.
test('#455 legacy blank timestamps never supply current recipe feedback',()=>{
 const missing=[
  shot('empty',''),
  shot('whitespace','   '),
  shot('null-time',null)
 ];
 const before=structuredClone(missing);
 assert.equal(lastRecipeContextShot(missing,'coffee-a',context,version),null);
 const dated=shot('dated','2026-11-04T10:00:00Z');
 assert.equal(lastRecipeContextShot([...missing,dated],'coffee-a',context,version)?.id,'dated');
 assert.deepEqual(missing,before,'keep original ratings, measurements and private notes intact');
});

test('#455 recipe engine abstains from advice on an undated legacy shot but uses dated feedback',async()=>{
 const [{hydrate},{rawFixture},{recommendation},{activeVersion}]=await Promise.all([
  import('../site/cloud/mapping.js'),
  import('./cloud-fixtures/raw.js'),
  import('../site/lib/engine.js'),
  import('../site/lib/model.js')
 ]);
 const s=hydrate(rawFixture()),v=activeVersion(s);
 const sh={id:'legacy-blank',coffeeId:'coffee',setupVersionId:v.id,
  calibrationId:v.calibrationId,basketId:'basketv',style:'Turbo',feedMode:'standard',
  doseG:18,yieldG:36,timeS:10,grindSetting:1.2,tempC:93,
  timestamp:'',hidden:false,dialedIn:false,
  tasteScales:{extraction:2,body:3,clarity:4,sweetness:4,astringency:1},
  notes:'Keep private original legacy note'};
 s.shots.push(sh);
 const before=structuredClone(s.shots);
 const baseline=recommendation(s,'coffee',{style:'Turbo',basketId:'basketv',feedMode:'standard'});
 assert.ok(baseline);
 assert.notEqual(baseline.source,'Adjustment from your latest taste rating');
 assert.deepEqual(s.shots,before,'no rewrite or deletion of legacy shots');
 sh.timestamp='2026-11-04T10:00:00Z';
 const rated=recommendation(s,'coffee',{style:'Turbo',basketId:'basketv',feedMode:'standard'});
 assert.equal(rated.source,'Adjustment from your latest taste rating');
 assert.equal(sh.notes,'Keep private original legacy note');
 assert.equal(sh.tasteScales.sweetness,4);
});

test('#455 legacy whitespace timestamps cannot establish grind-time sensitivity',async()=>{
 const {learnSensitivity}=await import('../site/lib/engine.js');
 const common={coffeeId:'coffee-a',setupVersionId:'setup-v2',calibrationId:'grind-cal-2',
  basketId:'basket-18',style:'Turbo',feedMode:'slow',doseG:18,yieldG:36,hidden:false};
 const measured=(id,timestamp,grindSetting,timeS)=>({
  ...common,id,timestamp,grindSetting,timeS,
  notes:'Original private measurement',tasteScales:{extraction:3,body:3,clarity:5,sweetness:4,astringency:1}
 });
 const untrusted=measured('undated','   ',4,12);
 const datedA=measured('dated-a','2026-11-04T10:00:00Z',3,18);
 const datedB=measured('dated-b','2026-11-04T11:00:00Z',2,24);
 const mixed=[untrusted,datedA,datedB],before=structuredClone(mixed);
 assert.equal(learnSensitivity(mixed),null,'one valid dated pair does not establish a calibrated slope');
 assert.deepEqual(mixed,before,'do not rewrite private notes, sensory ratings or old shots');
 const datedC=measured('dated-c','2026-11-04T12:00:00Z',1,30);
 assert.deepEqual(learnSensitivity([datedA,datedB,datedC]),{secondsPerUnit:-6,samples:2},
  'three chronological comparable dated shots still calibrate two negative slopes');
});

test('#455 Log Shot prefill excludes undated legacy rows without changing saved shots',async()=>{
 const [{hydrate},{rawFixture},{prefill}]=await Promise.all([
  import('../site/cloud/mapping.js'),
  import('./cloud-fixtures/raw.js'),
  import('../site/lib/engine.js')
 ]);
 const s=hydrate(rawFixture());
 const common={coffeeId:'coffee',setupVersionId:'version',calibrationId:'cal',
  basketId:'basketv',style:'Turbo',feedMode:'standard',hidden:false,
  yieldG:36,timeS:18,notes:'Preserve private original shot note',
  tasteScales:{extraction:3,body:3,clarity:5,sweetness:4,astringency:1}};
 s.shots=[
  {...common,id:'missing-time',timestamp:null,doseG:20,grindSetting:4.5},
  {...common,id:'blank-time',timestamp:'   ',doseG:19,grindSetting:4.0},
  {...common,id:'dated',timestamp:'2026-11-04T12:00:00Z',doseG:18,grindSetting:2.2}
 ];
 const original=structuredClone(s.shots);
 const entered=prefill(s,'coffee',{style:'Turbo',basketId:'basketv',feedMode:'standard'});
 assert.equal(entered.doseG,18,'use the latest dated dose, not an unorderable legacy measurement');
 assert.equal(entered.grindSetting,2.2,'use the latest dated same-calibration grind');
 assert.equal(entered.yieldG,'','do not silently turn history into a measured new shot');
 assert.equal(entered.timeS,'');
 assert.deepEqual(s.shots,original,'preserve every stored shot, all five tastes and private notes');
 s.shots=s.shots.filter(sh=>sh.id!=='dated');
 const empty=prefill(s,'coffee',{style:'Turbo',basketId:'basketv',feedMode:'standard'});
 assert.equal(empty.doseG,18,'without dated records retain configured basket starting dose');
 assert.equal(empty.grindSetting,'','do not assert a calibrated grind from undated history');
});

test('#455 cloud hydration retains legacy shots but only dated observations derive latest feedback',async()=>{
 const [{hydrate},{rawFixture,rawShot}]=await Promise.all([
  import('../site/cloud/mapping.js'),
  import('./cloud-fixtures/raw.js')
 ]);
 const raw=rawFixture();
 raw.shots=[
  rawShot({id:'dated-old',pulled_at:'2026-11-03T10:00:00Z'}),
  rawShot({id:'legacy-null',pulled_at:null}),
  rawShot({id:'legacy-whitespace',pulled_at:'   '}),
  rawShot({id:'dated-new',pulled_at:'2026-11-04T10:00:00Z'})
 ];
 raw.notes=[{shot_id:'legacy-null',notes:'Private archival note'}];
 const original=structuredClone(raw);
 const state=hydrate(raw);
 const byId=id=>state.shots.find(s=>s.id===id);
 assert.equal(state.shots.length,4,'preserve every original measurement');
 assert.equal(byId('legacy-null').timestamp,null);
 assert.equal(byId('legacy-null').notes,'Private archival note');
 assert.equal(byId('legacy-whitespace').timestamp,'   ');
 assert.equal(byId('legacy-null').suggestion,undefined,'do not derive live advice from undated rows');
 assert.equal(byId('legacy-whitespace').suggestion,undefined);
 assert.equal(byId('dated-old').suggestion,undefined,'only the genuinely latest row gets restored feedback');
 assert.ok(byId('dated-new').suggestion,'retain valid latest dated advice');
 assert.deepEqual(raw,original,'hydration must not mutate raw cloud data');
 const withoutDated=hydrate({...raw,shots:raw.shots.filter(sh=>sh.id.startsWith('legacy-'))});
 assert.equal(withoutDated.shots.length,2);
 assert.ok(withoutDated.shots.every(sh=>sh.suggestion===undefined));
});
