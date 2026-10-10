import assert from 'node:assert/strict';
import {INGREDIENT_PHOTOS} from '../builder-photo-manifest.js';
import {ingredientArt,foundationStyle,categoryStyle} from '../builder-art.js';
import {recipeScene} from '../builder-scene.js';
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
console.log('PASS: 43 distinct exact photographs; coleslaw differs from lettuce; all four bases; one layer per ID; native photo proportions; no wrong fallback; whole burger differs from lower bun.');
