import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {rawFixture} from './cloud-fixtures/raw.js';
import {hydrate,customTargetsFromRaw,customTargetsForSave} from '../site/cloud/mapping.js';
import {recommendation} from '../site/lib/engine.js';
import {coffeeState} from '../site/lib/model.js';
import {ACTIONS,independentMutations} from '../site/cloud/outbox.js';

const target={ratio:2.4,time_low_s:24,time_high_s:32,temperature_c:92.36};
test('Custom targets persist through hydration and drive one current Custom recipe',()=>{
 const raw=rawFixture();raw.workspaceCoffees[0].selected_style='Custom';raw.workspaceCoffees[0].custom_targets={...target};
 raw.setupPreferences[0].track_temperature=true;
 const state=hydrate(raw),p=coffeeState(state,'coffee'),rec=recommendation(state,'coffee');
 assert.deepEqual(p.custom,{ratioLow:2.4,ratioHigh:2.4,timeLow:24,timeHigh:32,tempC:92.36});
 assert.equal(p.style,'Custom');assert.equal(rec.style,'Custom');
 assert.equal(rec.ratio.center,2.4);assert.equal(rec.time.low,24);assert.equal(rec.time.high,32);
 assert.equal(rec.tempC,92.36);assert.equal(rec.yield.center,43.2);
 assert.equal(rec.source,'Your Custom starting targets');
 assert.equal(state.families.length,0);
});
test('switching away preserves saved Custom targets without changing other styles',()=>{
 const raw=rawFixture();raw.workspaceCoffees[0].selected_style='Traditional';raw.workspaceCoffees[0].custom_targets={...target};
 const state=hydrate(raw),p=coffeeState(state,'coffee'),traditional=recommendation(state,'coffee');
 assert.equal(p.style,'Traditional');assert.equal(p.custom.timeHigh,32);
 assert.equal(traditional.style,'Traditional');assert.notEqual(traditional.ratio.center,2.4);
 const custom=recommendation(state,'coffee',{style:'Custom'});assert.equal(custom.ratio.center,2.4);
});
test('malformed, stale or out-of-range Custom cache objects are never used',()=>{
 for(const bad of [undefined,{},[],{...target,ratio:'2.4'},{...target,time_high_s:24},{...target,temperature_c:101},{...target,ratio:4.6},{...target,time_low_s:4}])
  assert.equal(customTargetsFromRaw(bad),null);
 assert.equal(customTargetsFromRaw({...target,temperature_c:null}).tempC,null);
});
test('Custom saves validate exactly the backend bounds without silent coercion',()=>{
 assert.deepEqual(customTargetsForSave({ratio:'2.4',time_low_s:'24',time_high_s:'32',temperature:''}),{...target,temperature_c:null});
 for(const bad of [
  {ratio:'',time_low_s:'24',time_high_s:'32'},
  {ratio:'4.51',time_low_s:'24',time_high_s:'32'},
  {ratio:'2.4',time_low_s:'0',time_high_s:'32'},
  {ratio:'2.4',time_low_s:'24',time_high_s:'24'},
  {ratio:'2.4',time_low_s:'24',time_high_s:'61'}
 ])assert.throws(()=>customTargetsForSave(bad));
 assert.throws(()=>customTargetsForSave({ratio:'2',time_low_s:'24',time_high_s:'32',temperature:'215'},{unit:'F'}));
});
test('unchanged rounded Fahrenheit value retains precise Celsius stored target',()=>{
 const previous=customTargetsFromRaw(target);
 const form={ratio:'2.5',time_low_s:'25',time_high_s:'35',temperature:'198.2'};
 const output=customTargetsForSave(form,{unit:'F',previous});
 assert.equal(output.temperature_c,previous.tempC);assert.equal(output.ratio,2.5);
 assert.equal(customTargetsForSave({...form,temperature:''},{unit:'F',previous}).temperature_c,null);
 assert.equal(customTargetsForSave({ratio:'2.5',time_low_s:'25',time_high_s:'35'},{unit:'F',previous}).temperature_c,92.36);
});
test('Custom target changes use protected owner-bound outbox and cannot bypass a held dependency',()=>{
 assert.equal(ACTIONS.has('save_custom_targets'),true);
 assert.equal(independentMutations({action:'save_shot',payload:{id:'one'}},{action:'save_custom_targets',payload:{library_entry_id:'coffee'}}),false);
 const main=readFileSync(new URL('../site/cloud/main.js',import.meta.url),'utf8');
 assert.doesNotMatch(main,/supabase\\.from\\(['"]workspace_coffees/);
});
