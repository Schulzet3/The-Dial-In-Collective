import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {blankState,createSetup,addCoffee,workspace,visibleCoffees} from '../site/lib/model.js';
import {coffeeListEmptyState} from '../site/cloud/coffee-list-empty.js';

// Synthetic local state only. Never read members, saved sessions or production.
test('R344 active unmatched search shows a truthful noninteractive live empty state',()=>{
 const state=blankState();
 createSetup(state,{name:'Synthetic setup',basketDoseG:18,grinderMin:0,grinderMax:10});
 const coffee=addCoffee(state,{name:'Example Ethiopia',roaster:'Example Roaster',origin:'Ethiopia'});
 workspace(state).currentCoffeeId=coffee.id;
 assert.equal(visibleCoffees(state,'recent','unmatched-phrase').length,0);
 const html=coffeeListEmptyState('unmatched-phrase',state.coffees.some(c=>!c.hidden));
 assert.match(html,/role="status"/);
 assert.match(html,/No coffees match your search/);
 assert.doesNotMatch(html,/Add your first coffee|<button|<a |unmatched-phrase/);
 assert.deepEqual(visibleCoffees(state,'recent','example').map(c=>c.id),[coffee.id]);
 assert.equal(workspace(state).currentCoffeeId,coffee.id);
});

test('R344 genuine empty collection and whitespace-only input retain first-coffee guidance',()=>{
 const blank=blankState();
 assert.match(coffeeListEmptyState('',false),/Add your first coffee to get started/);
 assert.match(coffeeListEmptyState('anything',false),/Add your first coffee to get started/);
 assert.match(coffeeListEmptyState('   ',true),/Add your first coffee to get started/);
 assert.doesNotMatch(coffeeListEmptyState('   ',true),/No coffees match your search/);
 assert.equal(blank.coffees.length,0);
});

test('R344 live coffee-card rendering uses zero-results fallback, without changing filtering',()=>{
 const main=readFileSync(new URL('../site/cloud/main.js',import.meta.url),'utf8');
 assert.ok(main.includes("import {coffeeListEmptyState} from './coffee-list-empty.js';"));
 assert.match(main,/const list=M\.visibleCoffees\(s,this\.sort,this\.search,this\.tempCoffee\)/);
 assert.match(main,/\}\)\.join\(''\)\|\|coffeeListEmptyState\(this\.search,s\.coffees\.some\(c=>!c\.hidden\)\)/);
 assert.match(main,/this\.searchOpen\?\x60<div class=search-tools/);
 assert.match(main,/Shot History \(\$\{shots\.length\}\)/);
 const build=readFileSync(new URL('../build_cloud.mjs',import.meta.url),'utf8');
 assert.match(build,/'cloud\/coffee-list-empty\.js'/);
});

test('R344 isolated visual/offline browser adapter loads search helper before CloudApp main',()=>{
 const qa=readFileSync(new URL('../tests/browser/cloud_owner_qa.py',import.meta.url),'utf8');
 assert.match(qa,/'coffee-match-ui','coffee-list-empty','coffee-url-autofill'/);
});
