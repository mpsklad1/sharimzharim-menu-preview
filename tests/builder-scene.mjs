import assert from 'node:assert/strict';
import {INGREDIENT_PHOTOS} from '../builder-photo-manifest.js';
import {ingredientArt,foundationStyle,categoryStyle} from '../builder-art.js';
import {recipeScene,PITA_POCKET} from '../builder-scene.js';
const pairs=Object.entries(INGREDIENT_PHOTOS).map(([id,p])=>[Number(id),p.name,0]);
assert.equal(pairs.length,43);
assert.equal(new Set(pairs.map(o=>{const p=ingredientArt(o).photo;return `${p.src}#${p.rect.join(',')}`;})).size,43);
for (const option of pairs) for (const base of ['bun','lettuce','lavash','pita']) {
 const scene=recipeScene(base,[option,option]);
 assert.equal(scene.layers.length,1,'one selected ID must produce one layer');
 assert.equal(scene.layers[0].id,option[0]);
 assert.equal(scene.layers[0].name,option[1]);
 const photo=INGREDIENT_PHOTOS[option[0]],layer=scene.layers[0];
 assert.deepEqual(layer.photo,photo);
 assert.ok(Math.abs(layer.height/layer.width-photo.rect[3]/photo.rect[2])<1e-10,'photo must retain natural proportions');
 assert.ok([scene.top,scene.bottom,layer.x,layer.y].every(Number.isFinite));
}
const slaw=ingredientArt([1016,'Коул-слоу',0]);
const lettuce=ingredientArt([1014,'Латук',0]);
assert.notEqual(slaw.fillingStyle,lettuce.fillingStyle);
assert.equal(slaw.photo.name,'Коул-слоу');
assert.equal(ingredientArt([99999,'Неизвестная начинка',0]),null,'missing photos must not become lettuce');
assert.notEqual(categoryStyle('burger'),foundationStyle('bun'),'whole burger and lower bun must be different images');
for (const base of ['bun','lettuce','lavash','pita']) {
 const scene=recipeScene(base,pairs.slice(0,20));
 assert.equal(new Set(scene.layers.map(l=>l.id)).size,20);
 assert.ok(scene.top<scene.bottom);
}
for (const selection of [...pairs.map(p=>[p]),pairs.slice(0,20),pairs.slice(27,43)]) {
 const pita=recipeScene('pita',selection);
 assert.deepEqual(pita.pocket,PITA_POCKET);
 for (const layer of pita.layers) {
  const cx=layer.x+layer.width/2,cy=layer.y+layer.height/2;
  assert.ok((cx-120)**2/80**2+(cy-182)**2/31**2<1,'each ingredient must land inside the pita opening');
  assert.ok(layer.y>=pita.pocket.foundation.y && layer.y+layer.height<=pita.pocket.foundation.y+pita.pocket.foundation.height,'fillings must stay within the bread, not tower above it');
 }
}
assert.notEqual(recipeScene('pita',[pairs[0]]).layers[0].y,recipeScene('bun',[pairs[0]]).layers[0].y);
console.log('PASS: 43 distinct exact photographs; coleslaw differs from lettuce; all four bases; one layer per ID; native photo proportions; no wrong fallback; whole burger differs from lower bun.');
console.log('PASS: all individual fillings, 20 fillings and all sauces land inside the pita pocket.');
