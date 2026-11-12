import test from 'node:test';
import assert from 'node:assert/strict';
import {selectedVictus} from '../scripts/audit/issue33-r84-victus-397-399-check.mjs';
const products=[
  [397,'Nero - Dark Roast Blend','Fuel your mornings with our bold dark roast blend, Nero. Filled with deep chocolatey notes, this coffee has a heavy body and a sweet lingering finish.'],
  [398,'Veloce - Light Roast Blend','Boasting an intensely aromatic experience with sweet chocolatey and fruity notes our light roast blend, Veloce, offers a delightful sweetness, medium body, and lingering finish.'],
  [399,'Victoria - Medium Roast Blend','Victoria is our popular medium roasted blend. Full of smooth milk chocolate and fruity notes, this blend is ideal for those who enjoy espresso based drinks.']
];
const page=(name,story)=>'<main><h1>'+name+'</h1><section><p>'+story+'</p></section></main>';
for(const [n,name,own]of products){
  test(n+' own selected description, notes and roast true',()=>assert.deepEqual(
    Object.values(selectedVictus(page(name,own),[name],n)),Array(5).fill(true)));
  test(n+' missing or duplicate selected heading fails',()=>{
    assert.equal(selectedVictus(page(name,own),[],n).uniqueSelected,false);
    assert.equal(selectedVictus(page(name,own),[name,name],n).uniqueSelected,false);
  });
  test(n+' neighboring product heading is rejected',()=>{
    const other=products.find(x=>x[0]!==n)[1];
    assert.equal(selectedVictus(page(other,own),[other],n).uniqueSelected,false);
  });
  test(n+' nav/script/sidebar/footer cannot supply missing flavor',()=>{
    const deceptive=page(name,'')+'<nav>'+own+'</nav><script>'+own+'</script><aside>'+own+'</aside><footer>'+own+'</footer>';
    const x=selectedVictus(deceptive,[name],n);
    assert.equal(x.selectedNarrative,false);
    assert.equal(x.selectedTasting,false);
    assert.equal(x.selectedSensory,false);
  });
  test(n+' unrelated flavor paragraph cannot replace own literal',()=>{
    const other=products.find(x=>x[0]!==n)[2];
    assert.equal(selectedVictus(page(name,other),[name],n).selectedTasting,false);
  });
  test(n+' roast phrase of another coffee is not this product roast',()=>{
    const other=products.find(x=>x[0]!==n)[2];
    assert.equal(selectedVictus(page(name,other),[name],n).selectedRoast,false);
  });
}
