// Issue #33: required official current-product probe acceptance, not manual certification.
// Pure, fixture-testable predicate. UNAVAILABLE/ERROR/identity mismatch must not become
// a green CI result merely because no FETCHED record was eligible for the old guard.
export function requiredFocusedSourceFailures(targetNumbers,records,{negativeIdentityNumbers=[]}={}){
 const failures=[];
 if(!Array.isArray(records))return [{reason:'records_missing'}];
 const negativeIdentityCases=new Set(negativeIdentityNumbers);
 for(const n of negativeIdentityCases){
  if(!targetNumbers.includes(n))failures.push({number:n,reason:'negative_identity_case_not_requested'});
 }
 if(records.length!==targetNumbers.length){
  failures.push({reason:'unexpected_record_count',expected:targetNumbers.length,actual:records.length});
 }
 for(const number of targetNumbers){
  const matches=records.filter(r=>r?.number===number);
  if(matches.length!==1){
   failures.push({number,reason:'case_missing_or_duplicated',actual:matches.length});
   continue;
  }
  const r=matches[0];
  if(r.status!=='FETCHED'){
   failures.push({number,status:r.status??'UNKNOWN',reason:'required_official_source_not_fetched'});
   continue;
  }
  if(r.parser_ok!==true)failures.push({number,reason:'selected_product_parser_not_verified'});
  if(negativeIdentityCases.has(number)){
   // Explicit negative receipt: current selected product is NOT the archived
   // original coffee. This is never a positive original-603 certification.
   const selectedName=String(r.current_fields?.name||'').trim().toLocaleLowerCase();
   const archivedName=String(r.archived_coffee||'').trim().toLocaleLowerCase();
   const liveHeadings=Array.isArray(r.selected_h1)?r.selected_h1:[];
   if(r.selected_h1_present_in_scoped_html!==true ||
      r.selected_heading_identity_verified!==false ||
      !selectedName || !archivedName || selectedName===archivedName ||
      !liveHeadings.some(h=>String(h).trim().toLocaleLowerCase()===selectedName))
    failures.push({number,reason:'expected_changed_original_identity_not_established'});
  }else if(r.selected_h1_present_in_scoped_html===true&&r.selected_heading_identity_verified!==true)
   failures.push({number,reason:'selected_original_product_heading_identity_unverified'});
  if(r.add_coffee_ui_rendered!==true)failures.push({number,reason:'add_coffee_preview_not_rendered'});
  if(r.source_review_rendered!==true)failures.push({number,reason:'source_review_not_rendered'});
  if(r.selected_price_badge_accepted===false)failures.push({number,reason:'selected_price_badge_rejected'});
 }
 return failures;
}
