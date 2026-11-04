// A country-wide coffee education paragraph is not the selected lot's farm
// region. Retain its literal text for review, but never promote a mountain
// named only as the general growing area of MOST national coffee production.
const compact=value=>String(value||'').normalize('NFKD')
 .replace(/\p{M}/gu,'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,'');
const escapeRegex=value=>String(value).replace(/[.*+?^$()|[\]{}\\]/g,'\\$&');
export function countrywideEducationalOriginCorrection({origin='',name='',blocks=[]}={}){
 const tuple=String(origin).match(/^([\p{L}\p{M}'’ -]{3,65}),\s*([\p{L}\p{M}'’ -]{3,55})$/u);
 if(!tuple||!Array.isArray(blocks)||blocks.length>2500)return null;
 const region=tuple[1].trim(),country=tuple[2].trim();
 if(region===country||!new RegExp('(?:^|\\W)'+escapeRegex(country)+'(?:\\W|$)','iu').test(name))return null;
 const headings=blocks.filter(block=>block.tag==='h1');
 if(headings.length!==1||compact(headings[0].text)!==compact(name))return null;
 const countryPattern=escapeRegex(country),regionPattern=escapeRegex(region);
 const general=new RegExp('\\bMost\\s+of\\s+the\\s+coffee\\s+grown\\s+in\\s+'+countryPattern+
  '\\b[^.!?]{15,240}\\b(?:in|on)\\s+the\\s+'+regionPattern+'\\s+Mountains?\\b','iu');
 const explicit=new RegExp(
  '\\b(?:Origin|Growing\\s+Region|Region|Location)\\s*[:=]\\s*'+regionPattern+'\\b|'+
  '\\b(?:this|our|the current|the selected)\\s+(?:coffee|lot|beans?)\\b[^.!?]{0,130}'+
  '\\b(?:grown|sourced|cultivated|produced|from)\\b[^.!?]{0,90}\\b'+regionPattern+'\\b','iu');
 if(blocks.some(block=>['p','li','dd','div','span'].includes(block.tag)&&
  explicit.test(String(block.text||''))))return null;
 const educational=blocks.find(block=>['p','li','div','span'].includes(block.tag)&&
  general.test(String(block.text||'')));
 return educational?{origin:country,excluded_region:region,
  source_excerpt:String(educational.text).slice(0,520)}:null;
}
