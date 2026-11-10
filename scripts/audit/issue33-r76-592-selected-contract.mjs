// Issue #33 R76: direct selected Woodshed Honduran Decaf source evidence only.
// This does not modify the parser, frozen oracle, member coffee or queue.
const normalize=value=>String(value||'').normalize('NFKD').replace(/\p{M}/gu,'')
  .replace(/&(?:reg|#174|#xae);/giu,'®').replace(/&(?:amp);/giu,'&')
  .replace(/[^a-z0-9]+/giu,' ').trim().toLowerCase();
const ownText=markup=>String(markup||'')
  .replace(/<!--[\s\S]*?-->/gu,' ')
  .replace(/<(script|style|template|noscript|aside|nav|footer|header|form)\b[^>]*>[\s\S]*?<\/\1>/giu,' ')
  .replace(/<[^>]{0,2000}>/gu,' ')
  .replace(/&(?:nbsp|#160|#xa0);/giu,' ')
  .replace(/&(?:reg|#174|#xae);/giu,'®')
  .replace(/&amp;/giu,'&').replace(/\s+/gu,' ').trim();
export function selectedWoodshed592DirectFacts(markup,headings){
  const selectedIdentity=Array.isArray(headings)&&headings.length===1&&
    normalize(headings[0])===normalize('Honduran Decaf | Swiss Water® Processed');
  const text=ownText(markup);
  const introduction=text.split(/\bRegular price\b|\bRoast Level\b/iu)[0];
  return {
    selectedIdentity,
    directCopanContext:/\bThe region of Copan lies in a fertile valley,\s*known for its cool temperatures\b/iu.test(introduction),
    directHondurasSensory:/\bOur Decaf\s*Honduras is citrus forward,\s*a fruity sweetness with a syrup-?y body\b/iu.test(introduction),
    directSwissWaterDecaffeination:/\bThe Swiss Water®?\s*Process is a chemical free decaffeination process\b/iu.test(introduction)
  };
}
