import test from 'node:test';
import assert from 'node:assert/strict';
import {hydrate} from '../site/cloud/mapping.js';
import {rawFixture} from './cloud-fixtures/raw.js';
import {activeVersion} from '../site/lib/model.js';

// Exercise actual CloudApp Log Shot HTML with synthetic in-memory state only.
const root={innerHTML:''};
const sheet={close(){},querySelector(){return null;}};
globalThis.document={querySelector:selector=>selector==='#app'?root:sheet};
const {CloudApp}=await import('../site/cloud/main.js');
delete globalThis.document;

function logMarkup(trackTemperature){
 const app=new CloudApp({},{});
 app.state=hydrate(rawFixture());
 activeVersion(app.state).advanced.temperature=trackTemperature;
 let html='';
 app.show=(_title,markup)=>{html=markup;};
 app.updateDoseAdvisory=()=>{};
 app.showLog('coffee');
 return html;
}
const actionButton=(html,action)=>{
 const match=html.match(new RegExp('<button\\b[^>]*data-action="'+action+'"[^>]*>Use Recommendation<\\/button>'));
 return match?.[0]||'';
};
const accessibleName=tag=>tag.match(/aria-label="([^"]+)"/)?.[1]||'';

test('two visible Use Recommendation actions have different screen-reader names when temperature is tracked',()=>{
 const html=logMarkup(true);
 const grind=actionButton(html,'use-grind'),temp=actionButton(html,'use-temp');
 assert.ok(grind,'the Locked grind copy action must remain');
 assert.ok(temp,'the optional temperature copy action must remain');
 assert.equal(accessibleName(grind),'Use Recommendation for Grind Setting');
 assert.equal(accessibleName(temp),'Use Recommendation for Temperature');
 assert.notEqual(accessibleName(grind),accessibleName(temp));
 assert.match(html,/name="grindSetting"/);
 assert.match(html,/name="temperature"/);
});

test('without temperature tracking only the grind copy action is offered',()=>{
 const html=logMarkup(false);
 assert.equal(accessibleName(actionButton(html,'use-grind')),'Use Recommendation for Grind Setting');
 assert.equal(actionButton(html,'use-temp'),'');
 assert.match(html,/data-scale="extraction"/);
 assert.match(html,/data-scale="body"/);
 assert.match(html,/data-scale="clarity"/);
 assert.match(html,/data-scale="sweetness"/);
 assert.match(html,/data-scale="astringency"/);
});
