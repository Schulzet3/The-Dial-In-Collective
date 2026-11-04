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
