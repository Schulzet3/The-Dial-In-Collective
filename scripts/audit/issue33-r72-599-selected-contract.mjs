// Strict audit-only selected-source facts. Never used to populate coffee fields.
const clean=markup=>String(markup||'')
 .replace(/<!--[\s\S]*?-->/gu,' ')
 .replace(/<(?:script|style|template|noscript|aside|nav|footer)\b[^>]*>[\s\S]*?<\/(?:script|style|template|noscript|aside|nav|footer)>/giu,' ')
 .replace(/<[^>]{0,2000}>/gu,' ')
 .replace(/&(?:nbsp|#160);/giu,' ')
 .replace(/&amp;/giu,'&').replace(/&(?:quot|apos|#39|#x27);/giu,"'")
 .replace(/\s+/gu,' ').trim();
export function selectedYellowstone599DirectFacts(scopedMarkup,headings){
 const hs=Array.isArray(headings)?headings:[];
 const selectedIdentity=hs.length===1&&hs[0].trim().toUpperCase()==='COLOMBIA HUILA';
 const txt=clean(scopedMarkup);
 // The labels must follow the selected product details, not generic store marketing.
 const detail=txt.match(/\bOrigin\s+Huila,\s*Colombia\s+Process\s+Washed and Sun Dried\s+Cooperative\s+Small co-ops in Salado Blanco\b/iu);
 const beforeDetails=detail?txt.slice(0,detail.index):txt;
 return {
  selectedIdentity,
  directRoast:/\bJuicy\s*&\s*Dynamic\s*[-–—]\s*Medium-Light Roast\b/iu.test(beforeDetails),
  directNotes:/\bNOTES\s*:\s*DRIED CHERRY\s*,\s*CITRUS\s*,\s*CUSTARD\b/iu.test(beforeDetails),
  labeledCurrentOrigin:Boolean(detail),
  labeledWashedSunDried:Boolean(detail),
  labeledSaladoBlancoCoops:Boolean(detail),
  selectedTownNarrative:/\bsmall town of Salado Blanco\b/iu.test(beforeDetails)&&/\bHuila region\b/iu.test(beforeDetails)
 };
}
