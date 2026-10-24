// Strict audit comparison only. This never changes the extractor's output.
// Layout punctuation may vary, but a numeric qualifier is a source claim:
// >1600m, ~1600m, 1600m+ and 1600m are not interchangeable assertions.
export function normalizeCoffeeAuditValue(value){
 const text=String(value??'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase()
  .replace(/[’‘`]/g,"'").replace(/[–—−]/g,'-').replace(/&/g,' and ')
  .replace(/≥/g,'>=').replace(/≤/g,'<=').replace(/≈/g,'~')
  .replace(/(?<=\d)\s*([.,:/-])\s*(?=\d)/g,'$1');
 return [...text.matchAll(/[\p{L}\p{N}]+|[<>]=?|[=+±~%]|(?<=\d)[.,:/-](?=\d)|(?<![\p{L}\p{N}])-(?=\d)/gu)]
  .map(match=>match[0]).join(' ');
}
