// Country-first single-origin product identity can corroborate an explicitly
// named geographic region only when a bounded *present selected* description
// independently repeats that exact coffee. The small recognized-region gate
// prevents cultivars, grades, brand names and flavor/roast tags becoming places.
// Values always come from the selected H1/description; this is NOT a gazetteer
// to fill a missing source claim.
const compact=value=>String(value||'').normalize('NFKD')
 .replace(/\p{M}/gu,'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,'');
const escapeRegex=value=>String(value).replace(/[.*+?^$()|[\]{}\\]/g,'\\$&');
const known=new Map([
 ['Ethiopia',new Set(['Yirgacheffe','Sidama','Guji','Harrar'])],
 ['Colombia',new Set(['Huila','Nariño','Cauca'])]
]);
const disallowed=/\b(?:other coffees?|related products?|recommended|you may also like|customer reviews?|education|brew guide|past releases?)\b/iu;
const stale=/\b(?:historically|previously|formerly|prior(?:\s+lot)?|last year|different coffee|another coffee|other coffee|old lot|not from|no longer|used to|hypothetical|for example|could be|may be)\b/iu;
export function selectedCountryFirstCurrentRegion({name='',origin='',blocks=[]}={}){
 if(typeof name!=='string'||name.length<12||name.length>140||
  typeof origin!=='string'||origin.length>50||origin.includes(',')||
  !Array.isArray(blocks)||blocks.length>2500||
  /\b(?:blend|sampler|assortment|decaf|flavou?r|roast|variety|organic|process)\b/iu.test(name))return null;
 const country=[...known.keys()].find(value=>compact(value)===compact(origin));
 if(!country)return null;
 const selected=[...known.get(country)].filter(region=>
  compact(name)===compact(country+' '+region));
 if(selected.length!==1)return null;
 const region=selected[0];
 const h1=blocks.filter(b=>b?.tag==='h1');
 if(h1.length!==1||compact(h1[0].text)!==compact(name))return null;
 const identity=new RegExp('\\b(?:our|this)\\b.{0,100}\\b'+escapeRegex(country)+'\\s+'+escapeRegex(region)+'\\b.{0,70}\\b(?:is roasted|is grown|is sourced|are roasted|are grown|are sourced)\\b','iu');
 const proofs=new Map();
 for(const block of blocks){
  if(!block||block.tag!=='p'||block.educational||
   typeof block.text!=='string'||block.text.length>1300||
   disallowed.test(block.section||''))continue;
  for(const sentence of block.text.split(/(?<=[.!?])\s+/u)){
   if(sentence.length>900||stale.test(sentence)||
    !/\bsingle[ -]origin\b/iu.test(sentence)||!identity.test(sentence))continue;
   proofs.set(compact(sentence),sentence);
  }
 }
 return proofs.size===1?{value:region+', '+country,quote:[...proofs.values()][0].slice(0,520)}:null;
}
