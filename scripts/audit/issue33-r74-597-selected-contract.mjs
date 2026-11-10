// Issue #33 R74: strict direct selected original603 #597 official evidence. Audit-only;
// this helper NEVER populates extractor fields or reinterprets the frozen oracle.
const norm = v => String(v || '').normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const visible = html => String(html || '')
  .replace(/<!--[\s\S]*?-->/gu, ' ')
  .replace(/<(?:script|style|template|noscript|aside|nav|footer|form)\b[^>]*>[\s\S]*?<\/(?:script|style|template|noscript|aside|nav|footer|form)>/giu, ' ')
  .replace(/<[^<>]{0,2000}>/gu, ' ')
  .replace(/&(?:nbsp|#160);/giu, ' ')
  .replace(/&amp;/giu, '&')
  .replace(/&(?:quot|apos|#39|#x27);/giu, "'")
  .replace(/\s+/gu, ' ').trim();

export function selectedNkumariR74DirectEvidence(scopedHtml, headings) {
  const identity = Array.isArray(headings) && headings.length === 1 &&
    norm(headings[0]) === norm('Kenya Nkumari, P1 C');
  const t = visible(scopedHtml);
  return {
    identity,
    selectedTasting: /\bTastes Like:\s*Floral,\s*grapefruit aroma with bright,\s*tangy acidity\.\s*Round,\s*almost savory,\s*caramel low balance\b/iu.test(t),
    directlyWashedAndRaisedBed: /\bWashed Process\.\s*Dried on raised beds\b/iu.test(t),
    selectedVarieties: /\bVariety:\s*SL28 and Ruiru\s*11\b/iu.test(t),
    exactFarmProducerRegionElevation: /\bFarm:\s*Nkumari\.\s*Producer:\s*Naman Meme\.\s*Region:\s*Meru\.\s*Elevation:\s*1400 meters above sea level\b/iu.test(t),
    namedCurrentManager: /\bProducer Naman Meme manages the well-ordered Nkumari Estate in Kenya['’]s Meru region\b/iu.test(t),
    relativeNotCategoricalRoast: /\bRoast level:\s*lightest roast on the menu\b/iu.test(t),
    gradingNotVariety: /\bThis limited selection comes in at a C,\s*or 14 screen\b/iu.test(t)
  };
}
