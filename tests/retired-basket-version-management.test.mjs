import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {hydrate,shotPayload} from '../site/cloud/mapping.js';
import {basketDoseAdvisory} from '../site/cloud/dose-advisory.js';
import {rawFixture,rawShot} from './cloud-fixtures/raw.js';

const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const taste={extraction:3,body:3,clarity:5,sweetness:5,astringency:1};

test('no member-facing basket or equipment-version controls are offered',()=>{
 const main=source('site/cloud/main.js'),outbox=source('site/cloud/outbox.js');
 assert.ok(main.includes("field('Basket Dose (g)','basket_dose_g'"));
 assert.ok(main.includes("button('Rename','rename-setup'"));
 assert.ok(main.includes('Add Another Setup'));
 assert.ok(main.includes('Advanced Setup Options'));
 for(const action of ['add-basket','correct-basket','archive-basket','reactivate-basket','select-basket','restore-version','new-equipment-version','recalibrate-grinder']){
  assert.ok(!main.includes("'"+action+"'"),action+' is not a member control');
  assert.ok(!outbox.includes("'"+action+"'"),action+' is not a queued mutation');
 }
 assert.ok(source('docs/MASTER_SPECIFICATION.md').includes('UX-RETIRE-BASKET-EQUIPMENT-VERSION-MANAGEMENT-20261026'));
});

test('historical equipment snapshots and IDs survive a later synthetic new setup version',()=>{
 const raw=rawFixture();
 raw.shots=[rawShot({id:'historical-shot'})];
 raw.notes=[{shot_id:'historical-shot',notes:'Private historical note'}];
 const first=hydrate(raw).shots[0],snap=structuredClone(first.snapshot);
 raw.versions.push({...raw.versions[0],id:'future-version',machine_model:'Replacement machine'});
 raw.setups[0].active_version_id='future-version';
 raw.basketVersions.push({...raw.basketVersions[0],id:'future-basket-version',basket_dose_g:21});
 raw.setupPreferences.push({...raw.setupPreferences[0],setup_version_id:'future-version',default_basket_version_id:'future-basket-version'});
 raw.workspaceCoffees.push({...raw.workspaceCoffees[0],setup_version_id:'future-version',basket_version_id:'future-basket-version'});
 const next=hydrate(raw),shot=next.shots.find(x=>x.id==='historical-shot');
 assert.deepEqual(shot.snapshot,snap);
 assert.equal(shot.setupVersionId,'version');
 assert.equal(shot.basketId,'basketv');
 assert.equal(shot.calibrationId,'cal');
 assert.equal(shot.doseG,18);
 assert.equal(shot.notes,'Private historical note');
 assert.equal(next.setups[0].activeVersionId,'future-version');
 assert.equal(next.setups[0].versions[1].baskets.find(b=>b.id==='future-basket-version').doseG,21);
});

test('simple shot retains measured dose and internal basket/calibration references',()=>{
 const state=hydrate(rawFixture());
 const p=shotPayload(state,'coffee',{id:'test-shot',style:'Turbo',basketId:'basketv',doseG:20,yieldG:40,timeS:25,grindSetting:2,tempC:null,feedMode:'standard',tasteScales:taste,notes:'Private'});
 assert.equal(p.dose_g,20);
 assert.equal(p.basket_version_id,'basketv');
 assert.equal(p.calibration_id,'cal');
 assert.equal(p.setup_version_id,'version');
 assert.equal(p.notes,'Private');
 assert.equal(state.setups[0].versions[0].baskets[0].doseG,18);
});

test('existing >2 g warning is new-shot-only, dismissible and not validation',()=>{
 for(const dose of [16,18,20])assert.equal(basketDoseAdvisory(dose,18),null);
 assert.match(basketDoseAdvisory(20.1,18),/more than 2 g/);
 assert.match(basketDoseAdvisory(15.9,18),/more than 2 g/);
 assert.equal(basketDoseAdvisory(20.1,18,{editing:true}),null);
 const main=source('site/cloud/main.js');
 assert.ok(main.includes('this.editing||this.dismissedDoseAdvisories'));
 assert.ok(main.includes('dismiss-dose-advisory'));
});
