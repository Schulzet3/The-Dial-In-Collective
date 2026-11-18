// A search miss is not an empty coffee collection. Keep this text independent
// of member-provided search content and avoid adding actions or changing pinning.
export function coffeeListEmptyState(search,hasVisibleCoffee=false){
 return hasVisibleCoffee&&String(search??'').trim()
  ? '<p class="helper space-top" role="status">No coffees match your search. Change or clear the search to see saved coffees.</p>'
  : '<p class="helper space-top">Add your first coffee to get started.</p>';
}
