// A selected, fully decaffeinated coffee can have one decaffeination method.
// This is independent of green-coffee Processing (Washed/Natural/Honey/etc.).
export const DECAFFEINATION_METHODS=Object.freeze(['Water Process','Sugar Process','Carbon Dioxide (CO2)']);
const fold=value=>String(value||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/\u2082/g,'2').toLowerCase().replace(/\s+/g,' ').trim();
const fullyDecaf=value=>/\b(?:decaf(?:feinated|feination)?|caffeine[ -]?free|without caffeine)\b/i.test(fold(value));
const mixedCaffeine=value=>/\b(?:half[ -]?caf(?:f|feinated)?|semi[ -]?decaf(?:feinated)?|partially[ -]?decaf(?:feinated)?|regular\s*(?:and|\+)\s*decaf|decaf\s*(?:and|\+)\s*regular)\b/i.test(fold(value));
const exclusions=/\b(?:not|never|without|instead of|rather than|unlike|other than|no)\s+(?:(?:the|a|an)\s+)?(?:swiss[ -]?water|mountain[ -]?water|water[ -]?process|sugar(?:cane|[ -]?cane|[ -]?process)|ethyl[ -]?acetate|e\.?a\.?\s+decaf|co2|carbon[ -]?dioxide)\b/i;
function methodsIn(raw){
 const v=fold(raw);if(!v||exclusions.test(v))return [];
 const results=[];
 if(/\b(?:swiss[ -]?water|mountain[ -]?water|water[ -]?(?:based\s+)?(?:decaf(?:feination|feinated)?|process(?:ed|ing)?(?:\s+decaf)?|method(?:\s+decaf)?)|h2o\s+decaf)\b/.test(v))results.push('Water Process');
 if(/\b(?:sugar[ -]?cane|sugar[ -]?process|ethyl[ -]?acetate|e\.?a\.?\s*(?:decaf(?:feination|feinated)?|process(?:ed)?(?:\s+decaf)?|method)|natural[ -]?ea)\b/.test(v))results.push('Sugar Process');
 if(/\b(?:co\s*[- ]?2|carbon[ -]?dioxide|supercritical\s+co\s*2|liquid\s+co\s*2)\b/.test(v))results.push('Carbon Dioxide (CO2)');
 return results;
}
// The caller supplies only exact selected-product method evidence, never
// generic roaster education, related products, unrelated catalog entries.
export function inferDecaffeinationMethod({name='',processingDetail='',selectedMethod='',conflicting=false,selectedCurrentDecafIdentity=false}={}){
 // A page may discuss a different decaf coffee. Its prose must never
 // turn an explicitly regular product into a decaffeinated coffee.
 if(name&&!fullyDecaf(name)&&!selectedCurrentDecafIdentity)return '';
 if(conflicting||mixedCaffeine(name)||mixedCaffeine(processingDetail)||mixedCaffeine(selectedMethod))return '';
 const explicitlyDecaf=selectedCurrentDecafIdentity||fullyDecaf(name)||/\bdecaffeination\s*:/i.test(processingDetail)||
  fullyDecaf(processingDetail)||fullyDecaf(selectedMethod);
 if(!explicitlyDecaf)return '';
 const found=new Set([...methodsIn(selectedMethod),...methodsIn(processingDetail),...methodsIn(name)]);
 return found.size===1?[...found][0]:'';
}
export function decafOnlyCoffee(name,isDecaf=false){return !mixedCaffeine(name)&&(isDecaf===true||fullyDecaf(name));}
