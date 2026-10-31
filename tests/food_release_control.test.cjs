'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const base=path.resolve(__dirname,'..');
const source=JSON.parse(fs.readFileSync(path.join(base,'meal-plan-data.json'),'utf8'));
const servedText=fs.readFileSync(path.join(base,'assets/js/data.js'),'utf8');
const marker='window.MEAL_PLAN_DATA = ';
const served=JSON.parse(servedText.slice(servedText.indexOf(marker)+marker.length,servedText.lastIndexOf(';')));
const docx=JSON.parse(fs.readFileSync(path.join(base,'data/canonical/docx-diet-recipes-canon.v1.json'),'utf8'));
test('served recipe payload and authoritative source match byte for byte after JSON parse',()=>assert.deepEqual(served,source));
test('never use cooked beans as a nutrient reference for plantain variety',()=>{
 const ingredient=docx.ingredients.find(x=>x.id==='platano_bizcochito');
 assert.ok(ingredient);
 assert.equal(ingredient.foodCompositionRef,null);
 assert.equal(ingredient.compositionStatus,'unmatched_variety_requires_reference');
});
test('sous-vide egg 63C for 45min never promises jammy yolks or pasteurization',()=>{
 const eggs=source.recipes.filter(r=>/sous.vide eggs|birria ramen/i.test(r.name));
 assert.equal(eggs.length,2);
 for(const r of eggs){
  const blob=JSON.stringify(r).toLowerCase();
  assert.ok(blob.includes('63 °c'));
  assert.ok(blob.includes('45 min'));
  assert.ok(blob.includes('runny yolks')||blob.includes('yolk remains runny'));
  assert.ok(!blob.includes('for jammy yolks'));
  assert.ok(!blob.includes('custardy yolks'));
  assert.ok(blob.includes('pasteurized eggs')||blob.includes('not a verified pasteurization process'));
 }
});
test('all source-family lengths remain unchanged and measured cooked yields are not fabricated',()=>{
 assert.equal(source.recipes.length,29);
 assert.equal(docx.recipes.length,4);
 const weighed=JSON.parse(fs.readFileSync(path.join(base,'nutrition-reviewed.json'),'utf8'));
 assert.equal(weighed.curatedRecipes.length,7);
});
