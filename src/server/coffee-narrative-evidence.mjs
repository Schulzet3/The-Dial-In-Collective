// Conservative, bounded, selected-product narrative supplement; no guessing or remote AI.
import {productMarkup} from './coffee-product-scope.mjs';
const tidy=s=>String(s||'').replace(/<[^>]*>/g,' ').replace(/&amp;/gi,'&').replace(/&#39;|&apos;/gi,"'").replace(/&nbsp;/gi,' ').replace(/\s+/g,' ').trim();
export function extractNarrativeCoffeeEvidence(html,{name='',fields={}}={}){
 if(typeof html!=='string'||html.length>1_000_000||!name)return {fields:{},details:{}};
 const page=productMarkup(html),h1=/<h1\b[^>]*>[\s\S]{0,12000}?<\/h1>/i.exec(page);
 if(!h1)return {fields:{},details:{}};
 const after=page.slice(h1.index+h1[0].length,h1.index+h1[0].length+18000);
 const cutoff=after.search(/<h[2-6]\b[^>]*>[\s\S]{0,250}?(?:you may also like|related products|more coffees|shop similar|customer reviews)/i);
 const body=cutoff>=0?after.slice(0,cutoff):after;
 const headings=[...body.matchAll(/<h([2-6])\b[^>]*>([\s\S]{1,400}?)<\/h\1>/gi)].map(m=>tidy(m[2]).slice(0,180));
 const paragraphs=[...body.matchAll(/<p\b[^>]*>([\s\S]{1,3500}?)<\/p>/gi)].map(m=>tidy(m[1]).slice(0,2000)).filter(Boolean);
 const text=paragraphs.join(' ').slice(0,8000),output={},details={};
 for(const heading of headings.slice(0,8)){
  const loc=heading.match(/\b((?:Finca|Hacienda|Farm|Estate)\s+[\p{L}\p{M}][\p{L}\p{M}'’.-]*(?:\s+[\p{L}\p{M}'’.-]+){0,4})\s*,\s*(Panama|Ethiopia|Colombia|Kenya|Brazil|Guatemala|Costa Rica|Honduras|El Salvador|Nicaragua|Peru|Rwanda|Burundi|Mexico|Ecuador|Bolivia|Indonesia|Uganda|Tanzania|Yemen|India)\b/iu);
  if(loc){
   if(!fields.origin)output.origin=loc[2];
   if(!fields.producer)output.producer=loc[1];
   details.farm=loc[1];break;
  }
 }
 const method=headings.find(s=>/\b(?:carbonic maceration|co[ -]?ferment(?:ation|ed)?|lactic fermentation|thermal shock|double fermentation|anaerobic fermentation)\b/i.test(s));
 if(method){
  details.processing_detail=method;
  if(!fields.process&&/\bcarbonic maceration\b/i.test(method))output.process='Anaerobic';
 }
 const grower=text.match(/\b([A-Z][a-z]+\s+[A-Z][a-z]+)\s+has\s+(?:taken|created|produced|developed)\b[^.!?]{0,230}?\b(?:variet(?:y|ies)|coffees?|process(?:ing)?)\b/i);
 if(grower)details.named_producer=grower[1];
 if(!fields.variety&&/\b(?:gesha|geisha)\b/i.test(name)&&/\b(?:gesha|geisha)s?\b/i.test(text))output.variety='Gesha';
 if(!details.processing_detail){
  const sentence=text.match(/[^.!?]{0,100}\b(?:carbonic maceration|anaerobic|co-ferment(?:ed|ation)?|cascara infused|thermal shock)\b[^.!?]{0,160}[.!?]?/i);
  if(sentence)details.processing_detail=sentence[0].trim().slice(0,190);
 }
 if(details.processing_detail&&/\bcarbonic maceration\b/i.test(details.processing_detail)&&!fields.process)output.process='Anaerobic';
 if(/\bbefore (?:the coffee is |being )?washed\b/i.test(text)&&details.processing_detail)
  details.processing_detail=(details.processing_detail+'; washed finish').slice(0,190);
 return {fields:output,details};
}
