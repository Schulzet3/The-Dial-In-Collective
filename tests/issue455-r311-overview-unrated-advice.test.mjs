import test from 'node:test';
import assert from 'node:assert/strict';
import {lastRecipeContextShot} from '../site/lib/ui.js';
import {tastesComplete} from '../site/lib/constants.js';

// R311 synthetic archived feedback selection. No member, database, or network use.
const recipe={style:'Turbo',basketId:'basket',feedMode:'standard'};
const version={id:'v',calibrationId:'cal',grinderMin:0,grinderMax:10};
const five={extraction:2,body:3,clarity:5,sweetness:4,astringency:1};
const row=(id,time,patch={})=>({
 id,coffeeId:'coffee',setupVersionId:'v',calibrationId:'cal',basketId:'basket',
 style:'Turbo',feedMode:'standard',timestamp:time,hidden:false,
 doseG:18,yieldG:40,timeS:16,grindSetting:4,tempC:null,
 tasteScales:{...five},notes:'Original private '+id,
 suggestion:{title:'Synthetic',next:{grindSetting:4,yieldCenter:45}},...patch
});
const pick=shots=>lastRecipeContextShot(shots,'coffee',recipe,version);

test('R311 newer partly unrated measured History cannot replace older five-rated overview feedback',()=>{
 const rated=row('rated','2026-11-15T12:00:00Z');
 const newer=row('unrated','2026-11-16T12:00:00Z',{
  tasteScales:{...five,sweetness:null},
  suggestion:{title:'Stale imported suggestion',next:{grindSetting:4,yieldCenter:90}}
 });
 const shots=[newer,rated],before=structuredClone(shots);
 assert.equal(tastesComplete(newer.tasteScales),false);
 assert.equal(pick(shots)?.id,'rated');
 assert.deepEqual(shots,before,'original measurements, private notes and partial ratings unchanged');
});

test('R311 no full ratings means no false selected feedback; partial remains in History',()=>{
 for(const taste of [null,{}, {...five,body:null},{...five,clarity:'5'},{...five,astringency:0}]){
  const imported=row('imported','2026-11-16T12:00:00Z',{tasteScales:taste});
  const before=structuredClone(imported);
  assert.equal(pick([imported]),null);
  assert.deepEqual(imported,before);
 }
});

test('R311 latest genuinely rated non-green shot wins; original context boundaries remain',()=>{
 const earlier=row('earlier','2026-11-14T12:00:00Z');
 const newest=row('newest','2026-11-16T12:00:00Z');
 const wrong=row('wrong','2026-11-17T12:00:00Z',{style:'Fast-Flow'});
 assert.equal(pick([earlier,newest,wrong])?.id,'newest');
 assert.equal(pick([earlier,newest,{...wrong,style:'Turbo',hidden:true}])?.id,'newest');
 assert.equal(pick([earlier,newest,{...wrong,style:'Turbo',basketId:'other'}])?.id,'newest');
});
