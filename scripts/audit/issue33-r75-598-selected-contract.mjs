// Issue #33 R75: strict audit-only current selected official original603 #598 evidence.
// Never populates fields or changes frozen oracle. Actual parser is checked separately.
const visible = markup => String(markup||'')
  .replace(/<!--[\s\S]*?-->/gu,' ')
  .replace(/<(?:script|style|template|noscript|aside|nav|footer|form)\b[^>]*>[\s\S]*?<\/(?:script|style|template|noscript|aside|nav|footer|form)>/giu,' ')
  .replace(/<[^>]{0,2000}>/gu,' ')
  .replace(/&(?:nbsp|#160);/giu,' ').replace(/&amp;/giu,'&')
  .replace(/&(?:quot|apos|#39|#x27);/giu,"'")
  .replace(/\s+/gu,' ').trim();
const norm=v=>String(v||'').normalize('NFKD').replace(/\p{M}/gu,'').toUpperCase().replace(/[^A-Z0-9]+/gu,' ').trim();
export function selectedYellowstone598DirectFacts(markup,headings){
  const selectedIdentity=Array.isArray(headings)&&headings.length===1&&
    norm(headings[0])===norm('BOLIVIA LA PAZ - ORGANIC');
  const text=visible(markup);
  // Specific coherent current selected typed block, not generic "small farm" footer.
  const labels=text.match(/\bOrigin\s+La Paz,\s*Bolivia\s+Process\s+Washed and Sun Dried\s+Cooperative\s+Cooperativa Agropecuaria Alto Sajama\b/iu);
  const hero=labels?text.slice(0,labels.index):text;
  return {
    selectedIdentity,
    directlyDarkRoast:/\bLow Acid\s*&\s*Mellow\s*[-–—]\s*Dark Roast\b/iu.test(hero),
    directlyCherryJamAllspice:/\bNOTES\s*:\s*CHERRY\s*,\s*JAM\s*,\s*ALLSPICE\b/iu.test(hero),
    namedCooperativePartnership:/\bfarmers in partnership with Cooperativa Agropecuaria Alto Sajama\b/iu.test(hero),
    labeledLaPazOrigin:Boolean(labels),
    labeledWashedSunDried:Boolean(labels),
    labeledNamedCooperative:Boolean(labels)
  };
}
