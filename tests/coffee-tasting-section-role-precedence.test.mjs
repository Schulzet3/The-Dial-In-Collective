import test from 'node:test';
import assert from 'node:assert/strict';
import {extractPublicCoffeeFacts,explicitCoffeeNotesSeparateFromBrewingTags} from '../src/server/coffee-page-metadata.mjs';
const url='https://roaster.example.test/products/current';
const note='Fresh Coffee Cherry, Dried Cascara, Mellow Cocoa, Warm Spice';
const tasting=value=>({field:'tasting_notes',label:'Tasting Notes',section:'Tasting Notes',source_type:'html',value});
const brewing=value=>({field:'tasting_notes',label:'Flavors',section:'Brewing Recommendations',source_type:'html',value});

test('separately scoped tasting and brewing taxonomy do not compete as two tasting lists',()=>{
 const facts=[tasting(note),brewing('Chocolate, Spice, Roasted Fruit'),tasting('Fresh Coffee Cherry Dried Cascara Mellow Cocoa Warm Spice'),brewing('Chocolate Spice Roasted Fruit')];
 assert.equal(explicitCoffeeNotesSeparateFromBrewingTags(facts),note);
});
test('never let conflicting direct tasting lists, unscoped flavors or unknown provenance be suppressed',()=>{
 const facts=[tasting(note),brewing('Chocolate, Spice, Roasted Fruit')];
 for(const addition of [
  tasting('Strawberry, mint, citrus'),
  {field:'tasting_notes',label:'Flavors',section:'Tasting Notes',source_type:'html',value:'Chocolate, Spice, Roasted Fruit'},
  {field:'tasting_notes',label:'Flavors',section:'',source_type:'html',value:'Chocolate, Spice, Roasted Fruit'},
  {field:'tasting_notes',label:'Tasting Notes',section:'Tasting Notes',source_type:'product_json',value:note},
 ])assert.equal(explicitCoffeeNotesSeparateFromBrewingTags([...facts,addition]),null);
 assert.equal(explicitCoffeeNotesSeparateFromBrewingTags([tasting(note),{...brewing('Chocolate, Spice'),section:'A Different Coffee'}]),null);
 assert.equal(explicitCoffeeNotesSeparateFromBrewingTags([tasting(note)]),null);
});
test('a named source section and identical complete words are mandatory',()=>{
 assert.equal(explicitCoffeeNotesSeparateFromBrewingTags([tasting('Cherry'),brewing('Fruit, Juice')]),null);
 assert.equal(explicitCoffeeNotesSeparateFromBrewingTags([tasting('Mellow cocoa, warm spice'),brewing('Chocolate')]),null);
 assert.equal(explicitCoffeeNotesSeparateFromBrewingTags([tasting(note),tasting('Fresh Coffee Cherry, Dried Cascara, Mellow Cocoa'),brewing('Chocolate')]),null);
});
test('unrelated conflicting flavor lists in product body still withhold tasting notes',()=>{
 const result=extractPublicCoffeeFacts('<main><h1>Current Coffee</h1><p>Tasting Notes: Cherry, apple, plum</p><p>Flavor: Mango, citrus, hazelnut</p></main>',{source_url:url});
 assert.equal(result.fields.tasting_notes,undefined);
 assert.ok(result.conflicts?.includes('tasting_notes'));
});
