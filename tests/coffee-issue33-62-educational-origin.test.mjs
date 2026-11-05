// #33 original603 #62: selected Organic Peru's general national education
// does not establish the specific Andes producing region for this lot.
import test from 'node:test';
import assert from 'node:assert/strict';
import {countrywideEducationalOriginCorrection as refine} from '../src/server/coffee-countrywide-context-guard.mjs';
const national='Located in western South America, Peru is one of the leading producers of organic and Fair Trade certified coffee. Most of the coffee grown in Peru is cultivated on small farms (less than 1-2 acres) found high in the Andes Mountains between 3000-6000 feet above sea level.';
function blocks(heading='Organic Peru',body=national,extras=[]){
 return [{tag:'h1',text:heading},{tag:'p',text:body},...extras];
}
test('only country survives current selected product generalized national growing geography',()=>{
 const v=refine({name:'Organic Peru',origin:'Andes, Peru',blocks:blocks()});
 assert.equal(v?.origin,'Peru');assert.equal(v?.excluded_region,'Andes');
 assert.match(v.source_excerpt,/Most of the coffee grown in Peru/);
});
test('direct selected lot explicitly grown in mountain region is not suppressed',()=>{
 const b=blocks('Organic Peru',national,[{tag:'p',text:'This coffee is sourced from the Andes Mountains in Peru.'}]);
 assert.equal(refine({name:'Organic Peru',origin:'Andes, Peru',blocks:b}),null);
});
test('selected labeled origin takes precedence over general background',()=>{
 const b=blocks('Organic Peru',national,[{tag:'p',text:'Origin: Andes, Peru'}]);
 assert.equal(refine({name:'Organic Peru',origin:'Andes, Peru',blocks:b}),null);
});
test('another country background cannot downgrade selected coffee region',()=>{
 const b=blocks('Organic Colombia',national);
 assert.equal(refine({name:'Organic Colombia',origin:'Andes, Colombia',blocks:b}),null);
});
test('other mountain or country unrelated to extracted region cannot downgrade',()=>{
 const b=blocks('Organic Peru',national.replace('Andes Mountains','Alps Mountains'));
 assert.equal(refine({name:'Organic Peru',origin:'Andes, Peru',blocks:b}),null);
});
test('unrelated selected H1 or competing product H1 cannot donate text',()=>{
 assert.equal(refine({name:'Organic Peru',origin:'Andes, Peru',blocks:blocks('Organic Kenya')}),null);
 assert.equal(refine({name:'Organic Peru',origin:'Andes, Peru',blocks:[...blocks(),{tag:'h1',text:'Other Product'}]}),null);
});
test('unqualified broad origin remains unchanged',()=>{
 assert.equal(refine({name:'Organic Peru',origin:'Peru',blocks:blocks()}),null);
});
test('selected current-lot specific sourced geography is preserved absent broad generic context',()=>{
 const b=blocks('Organic Peru','Our current coffee lot is sourced from the Andes Mountains in Peru.');
 assert.equal(refine({name:'Organic Peru',origin:'Andes, Peru',blocks:b}),null);
});
