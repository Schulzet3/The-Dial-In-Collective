// Source-first contract for original603 #572; not a replacement for the parser.
// Input must be scoped, current selected product markup, not full menu/SEO.
export function selectedArichaDirectFacts(markup, headings) {
  const h1 = Array.isArray(headings) ? headings.map(v => String(v).trim()) : [];
  const selectedIdentity = h1.length === 1 && h1[0] === 'Ethiopia Aricha Natural';
  const withoutScripts = String(markup || '')
    .replace(/<(?:script|style|template|noscript)\b[^>]*>[\s\S]*?<\/(?:script|style|template|noscript)>/giu, ' ')
    .replace(/<[^>]*>/gu, ' ')
    .replace(/&(?:nbsp|amp|quot|#39);/giu, ' ')
    .replace(/\s+/gu, ' ').trim();
  const direct = withoutScripts.split(/\b(?:Related Products|You May Also Like|Recommended For You)\b/iu)[0];
  const region = /\bRegion\s*:\s*Gedeb\s*,\s*Yirgacheffe\b/iu.test(direct);
  const elevation = /\bElevation\s*:\s*1[\s,]*950\s*[-–]\s*2[\s,]*300\s*MASL\b/iu.test(direct);
  const variety = /\bVariety\s*:\s*JARC\s*74112\s*[,/&]\s*JARC\s*74110\b/iu.test(direct);
  const process = /\bProcess\s*:\s*Natural\b/iu.test(direct);
  const namedProducer = /\bAbiyot\s+Ageze\b/iu.test(direct);
  return {selectedIdentity, region, elevation, variety, process, namedProducer};
}
