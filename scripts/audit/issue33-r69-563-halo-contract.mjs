// Audit-only current selected-product direct facts; not a replacement for parser or source identity.
const clean=s=>String(s||'').replace(/<!--[\s\S]*?-->/gu,' ')
 .replace(/<(?:script|style|template|noscript)\b[^>]*>[\s\S]*?<\/(?:script|style|template|noscript)>/giu,' ')
 .replace(/<[^>]*>/gu,' ').replace(/&(?:nbsp|amp|quot|apos|#39|#x27);/giu,' ')
 .replace(/\s+/gu,' ').trim();
export function selectedHalo563DirectFacts(html){
 const page=String(html||'');
 if(page.length<300||page.length>2_000_000)return null;
 const roots=[...page.matchAll(/<section\b[^>]{0,850}\bdata-section-type\s*=\s*(['"])product\1[^>]{0,850}>/giu)]
  .filter(m=>/\bcontent_product_coffee\b/u.test(m[0]));
 if(roots.length!==1)return null;
 const start=roots[0].index+roots[0][0].length,bio=page.indexOf('ABOUT HALO HARTUME',start);
 if(bio<start||bio-start>110000)return null;
 let scope=page.slice(start,bio);
 const related=scope.search(/<h[2-6]\b[^>]*>\s*(?:Related Products|Related Coffees|You May Also Like|Recommended For You)\s*<\/h[2-6]>/iu);
 if(related>=0)scope=scope.slice(0,related);
 const heroes=[...scope.matchAll(/<div\b[^>]{0,500}\bclass\s*=\s*(['"])[^'"]*\bcoffee_title\s+coffee_title(Mobile|Desktop)\b[^'"]*\1[^>]*>([\s\S]{0,1800}?)<\/div>/giu)]
  .map(m=>({which:m[2],text:clean(m[3])}));
 const selectedHero=heroes.length===2&&new Set(heroes.map(h=>h.which)).size===2&&
  heroes.every(h=>h.text==='Halo Hartume 2ND SELECTION ETHIOPIAN LANDRACE - WASHED Ethiopia');
 const visible=clean(scope),details={};
 for(const m of scope.matchAll(/<div\b[^>]{0,300}\bclass\s*=\s*(['"])coffee_technicalDetails_detail\1[^>]*>([\s\S]{0,1600}?)<\/div>/giu)){
  const title=m[2].match(/<span\b[^>]{0,400}\bclass\s*=\s*(['"])coffee_technicalDetails_detail_title\1[^>]*>([\s\S]{0,300}?)<\/span>/iu)?.[2];
  const value=m[2].match(/<p\b[^>]{0,400}\bclass\s*=\s*(['"])coffee_technicalDetails_detail_description\1[^>]*>([\s\S]{0,1100}?)<\/p>/iu)?.[2];
  if(title&&value){const key=clean(title).toUpperCase();if(Object.hasOwn(details,key))return null;details[key]=clean(value);}
 }
 return {
  selectedHero,
  notes:/\bIn the cup we find melon, plum, and lemon verbena\b/iu.test(visible)&&
   !/\b(?:nectarine|lemongrass|jasmine and honeysuckle|fresh peach)\b/iu.test(visible),
  selectedRegion:details.REGION==='Gedeb, Yirgacheffe',
  selectedVariety:details.VARIETAL==='Ethiopian Landrace',
  selectedElevation:details.ALTITUDE==='1,900 - 2,210 masl',
  selectedHarvest:details.HARVEST==='January 2026',
  selectedWashedProcess:/\bHand-picked at peak ripeness\b/iu.test(details.PROCESSING||'')&&
   /\bDry-fermented\b/iu.test(details.PROCESSING||'')&&
   /\bWet-fermented\b/iu.test(details.PROCESSING||'')&&
   /\bhand-washed\b/iu.test(details.PROCESSING||''),
  directFactsBeforeStationHistory:bio>start,
  historicalStationNotLotOrigin:!visible.includes('Worka Sakaro')
 };
}
