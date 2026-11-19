import test from 'node:test';
import assert from 'node:assert/strict';
import {hydrate} from '../site/cloud/mapping.js';
import {rawFixture} from './cloud-fixtures/raw.js';

// The provider's JSON aggregate does not order calibrations. These are synthetic
// historical rows, not production records or a new calibration-management flow.
test('#509 newest matching calibration fallback is independent of provider row order',()=>{
 const raw=rawFixture(),base=raw.calibrations[0];
 const older={...base,id:'cal-older',created_at:'2026-08-01T00:00:00Z',finest_setting:1,coarsest_setting:6};
 const newest={...base,id:'cal-newest',created_at:'2026-09-01T01:00:00+01:00',finest_setting:2,coarsest_setting:7};
 const differentGear={...base,id:'other-gear',grinder_model:'Another grinder',created_at:'2026-10-01T00:00:00Z',finest_setting:4,coarsest_setting:9};
 raw.setupPreferences[0].calibration_id=null;
 for(const order of [[newest,differentGear,older],[older,newest,differentGear],[differentGear,older,newest]]){
  raw.calibrations=order;
  const version=hydrate(raw).setups[0].versions[0];
  assert.equal(version.calibrationId,'cal-newest');
  assert.equal(version.grinderMin,2);
  assert.equal(version.grinderMax,7);
  assert.deepEqual(version.calibrations.map(c=>c.id),['cal-older','cal-newest']);
 }
 raw.setupPreferences[0].calibration_id='cal-older';
 assert.equal(hydrate(raw).setups[0].versions[0].calibrationId,'cal-older','explicit historical pin must win');
});

test('#509 equal or missing calibration dates select a stable fallback without dropping history',()=>{
 const raw=rawFixture(),base=raw.calibrations[0];
 raw.setupPreferences[0].calibration_id=null;
 const a={...base,id:'a',created_at:'2026-09-01T00:00:00Z',finest_setting:1};
 const b={...base,id:'b',created_at:'2026-09-01T00:00:00+00:00',finest_setting:2};
 const undated={...base,id:'z',created_at:null,finest_setting:3};
 for(const order of [[b,undated,a],[a,b,undated]]){
  raw.calibrations=order;
  const version=hydrate(raw).setups[0].versions[0];
  assert.equal(version.calibrationId,'b');
  assert.deepEqual(version.calibrations.map(c=>c.id),['z','a','b']);
 }
});
