// R73 exact selected Zeke's description evidence, audit-only. Never fills app fields.
const bare=v=>String(v||'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const visible=html=>String(html||'')
 .replace(/<!--[\s\S]*?-->/g,' ')
 .replace(/<(?:script|style|template|noscript|aside|nav|footer|form)\b[^>]*>[\s\S]*?<\/(?:script|style|template|noscript|aside|nav|footer|form)>/giu,' ')
 .replace(/<[^<>]{0,2000}>/g,' ')
 .replace(/&(?:nbsp|#160);/giu,' ')
 .replace(/&amp;/giu,'&')
 .replace(/&(?:quot|apos|#39|#x27);/giu,"'")
 .replace(/\s+/gu,' ').trim();
const title={
  601:'Colombia Huila, 1 lb (16 oz)',
  602:'Honduras Marcala Lenca, 1 lb (16 oz)',
  603:'Nicaragua Segovia, 1 lb (16 oz)'
};
export function selectedZekesR73DirectEvidence(number,scopedHtml,headings){
 const identity=Array.isArray(headings)&&headings.length===1&&bare(headings[0])===bare(title[number]||'')&&Boolean(title[number]);
 const t=visible(scopedHtml);
 if(number===601)return {
   identity,
   matchedAssociation:/\bThis coffee comes to us from Asociaci[oó]n Regional la Cascada de Bordones\b/iu.test(t),
   directHuilaGrowers:/\bfully washed lot\b[^.!?]{0,120}\bcoffee is grown in the department of Huila\b/iu.test(t),
   altitudeAndDrying:/\b1700\s*[-–]\s*1850\s*masl\b[^.!?]{0,65}\bpatio dried\b/iu.test(t),
   ownTasting:/\bnotes of molasses,\s*milk chocolate and lime\b/iu.test(t)
 };
 if(number===602)return {
   identity,
   directRoast:/\bThis medium-light roasted coffee is DIRECTLY TRADED\b/iu.test(t),
   directCurrentGarcias:/\bwith our friends,\s*The Garcias,\s*in Marcala,\s*Honduras\b/iu.test(t),
   directLencaFarm:/\bfourth generation of Garcias\b[^.!?]{0,130}\bLenca Farm grown coffee\b/iu.test(t)
 };
 if(number===603)return {
   identity,
   presentProducer:/\bOver 2,300 small-scale farmers\b[^.!?]{0,170}\bPRODECOOP\b/iu.test(t),
   millNotFarm:/\bSun-drying and final processing takes place at the coop['’]s dry mill,\s*Las Segovias,\s*located in the town of Palacaguina\b/iu.test(t),
   individualFarmProcessing:/\binitial coffee processing takes place on the individual farms\b/iu.test(t),
   ownTasting:/\bnotes of almond,\s*cocoa and caramel\b/iu.test(t)
 };
 return {identity:false};
}
