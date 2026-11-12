import test from 'node:test';
import assert from 'node:assert/strict';
import {selected99Source,chosen99} from '../scripts/audit/issue33-r131-99-check.mjs';
import {selectedDirectProductCredits} from '../src/server/coffee-direct-product-prose.mjs';
import {inferDecaffeinationMethod} from '../src/server/coffee-decaffeination-method.mjs';
const desc='<p>Shade-grown Guatemala decaf with bonbon-like caramel, clementine sparkle, crisp green apple notes.</p><p>ROAST: Medium</p><p>Dekáf&#39;d by way of Swiss Water® Process</p><p>Finca Santa Isabel cultivated by Keller family.</p>';
const page=(body=desc,title=chosen99.name,related='',seo='Stale Other Coffee')=>'<html><head><title>'+seo+'</title></head><body><main><article class="product"><h1>'+title+'</h1><section class="product__description">'+body+'</section></article>'+related+'</main></body></html>';
test('selected #99 complete direct-source contract',()=>{const s=selected99Source(page());assert.equal(s.correctH1,true);assert.ok(Object.values(s.direct).every(Boolean),JSON.stringify(s.direct));});
test('changed selected H1 cannot inherit original or SEO identity',()=>assert.equal(selected99Source(page(desc,'Other Seasonal Coffee','','Guatemala Finca Santa Isabel')).correctH1,false));
test('generic Swiss Water education is not a chosen coffee method',()=>assert.equal(selected99Source(page(desc.replace('Dekáf&#39;d by way of Swiss Water® Process','Swiss Water was pioneered in Switzerland'))).direct.selectedDecaf,false));
test('nav, aside, footer cannot repair absent chosen notes/method',()=>{const r=selected99Source(page(desc.replace('green apple','unpublished').replace('Dekáf&#39;d by way of Swiss Water® Process','not listed'),chosen99.name,'<nav>'+desc+'</nav><aside>'+desc+'</aside><footer>'+desc+'</footer>'));assert.equal(r.direct.notes,false);assert.equal(r.direct.selectedDecaf,false);});
test('related product cannot repair missing own roast/farm',()=>{const r=selected99Source(page(desc.replace('ROAST: Medium','roast unpublished').replace('Keller family','family unknown'),chosen99.name,'<aside>'+desc+'</aside>'));assert.equal(r.direct.medium,false);assert.equal(r.direct.farm,false);});
test('old metadata cannot replace changed current selected product',()=>assert.equal(selected99Source(page(desc,'Current Replacement Coffee','','Guatemala Finca Santa Isabel')).correctH1,false));

const ownMarkup=(intro='this decaf single origin gem delivers caramel and fruit.',method="Dekáf'd by way of Swiss Water® Process",h1=chosen99.name,more='')=>
 '<html><body><div class="product__info-container"><h1>'+h1+'</h1>'+
 '<p>'+intro+'</p><details><summary><span class="accordion__title">'+method+
 '</span></summary><p>The treatment uses water and time.</p></details></div>'+more+'</body></html>';
const clean=html=>html.replace(/<[^>]{0,2000}>/g,' ').replace(/&#39;/g,"'").replace(/\s+/g,' ').trim();
const credit=html=>selectedDirectProductCredits(html,{name:chosen99.name,clean,optionHtml:html});
test('real direct-product parser: own decaf single origin gem plus own Swiss Water accordion yields separate Water Process',()=>{
 const result=credit(ownMarkup());
 assert.equal(result.selected_current_decaf_identity,true,JSON.stringify(result));
 assert.ok(result.decaffeination_method_evidence?.some(s=>/Swiss Water/i.test(s)),JSON.stringify(result));
 assert.equal(inferDecaffeinationMethod({name:chosen99.name,
   selectedMethod:result.decaffeination_method_evidence.join('\n'),selectedCurrentDecafIdentity:true}),'Water Process');
});
test('real direct parser: plain regular coffee with Swiss Water education does not infer decaf identity',()=>{
 const result=credit(ownMarkup('this regular coffee is excellent.','Swiss Water® Process'));
 assert.equal(result.selected_current_decaf_identity,undefined);
 assert.equal(result.decaffeination_method_evidence,undefined);
});
test('real direct parser: half-caf own intro cannot qualify as whole decaf',()=>{
 const result=credit(ownMarkup('this half-caf decaf single origin gem is a blend.'));
 assert.equal(result.selected_current_decaf_identity,undefined);
 assert.equal(result.decaffeination_method_evidence,undefined);
});
test('real direct parser: different chosen H1 cannot certify archived product method',()=>{
 const result=credit(ownMarkup('this decaf single origin gem is delicious.',"Dekáf'd by way of Swiss Water® Process",'Another Coffee'));
 assert.equal(result.decaffeination_method_evidence,undefined);
});
test('real direct parser: only related sidebar describes decaf; selected regular coffee remains unqualified',()=>{
 const result=credit(ownMarkup('this regular coffee is not decaf.','Brewing Information',
 chosen99.name,'<aside><p>this decaf single origin gem</p><span>Dekáf&#39;d by way of Swiss Water® Process</span></aside>'));
 assert.equal(result.selected_current_decaf_identity,undefined);
 assert.equal(result.decaffeination_method_evidence,undefined);
});
test('real direct parser: explicit other method name must not become a Swiss Water method',()=>{
 const result=credit(ownMarkup('this decaf single origin gem is delicious.',"Dekáf'd by way of Sugar Cane Process"));
 const method=inferDecaffeinationMethod({name:chosen99.name,
   selectedMethod:(result.decaffeination_method_evidence||[]).join('\n'),
   selectedCurrentDecafIdentity:result.selected_current_decaf_identity===true});
 assert.notEqual(method,'Water Process');
});
