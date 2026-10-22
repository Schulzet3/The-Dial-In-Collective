import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {suggestedStyle} from '../site/lib/engine.js';
const source=readFileSync(new URL('../site/cloud/main.js',import.meta.url),'utf8');
test('roast and stated preference drive an editable suggested shot style',()=>{
 assert.equal(suggestedStyle({roastLevel:'Light'},'floral clarity').style,'Turbo');
 assert.equal(suggestedStyle({roastLevel:'Dark'},'body texture').style,'Traditional');
 assert.match(source,/select\('Starting Shot Style','starting_style'/);
 assert.match(source,/Recommended for you:/);
});
test('roast and URL autofill never override a manual style choice',()=>{
 assert.match(source,/choice\.dataset\.manuallyChosen!=='true'/);
 assert.match(source,/ev\.target\.name==='starting_style'\)ev\.target\.dataset\.manuallyChosen='true'/);
 assert.match(source,/applyCoffeeUrlFields\(form,found\);this\.refreshAddStyle\(\)/);
});
test('style is never treated as a canonical coffee fact and survives possible-match dialog',()=>{
 assert.match(source,/const \{starting_style,\.\.\.coffee\}=d/);
 assert.match(source,/findCoffeeMatches\(coffee\)/);
 assert.match(source,/this\.addCoffeeDraft=coffee/);
 assert.match(source,/this\.addCoffeeStartingStyle=starting_style/);
});
test('persist style only through admitted owner-scoped revision guarded set_style mutation',()=>{
 assert.match(source,/existing\?\.selected_style===style/);
 assert.match(source,/library_entry_id:libraryId,style,expected_revision:Number\(rev\)/);
 assert.match(source,/this\.mutate\('set_style',\{setup_id:setup\.id,setup_version_id:version\.id,/);
 assert.match(source,/warning=await tryStyle\(library\?\.id\)/);
 assert.match(source,/warning=await tryStyle\(lid\)/);
 assert.match(source,/Coffee was saved, but its starting style was not confirmed/);
});
