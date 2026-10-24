// Compare explicitly stated cultivar lists without changing the roaster's
// display text or treating a cultivar's genetic parents as product evidence.
export function equivalentCoffeeVarieties(a,b){
 const key=value=>[...new Set(String(value||'').normalize('NFKD')
  .replace(/[\u0300-\u036f]/g,'').toLowerCase()
  .replace(/\bgeisha\b/g,'gesha').replace(/\bsl\s+(\d{2})\b/g,'sl$1')
  .split(/\s*(?:,|;|\+|&|\/|\band\b)\s*/i)
  .map(part=>part.replace(/[^a-z0-9]/g,'')).filter(Boolean))].sort().join('|');
 const first=key(a),second=key(b);
 return !!first&&first===second;
}
