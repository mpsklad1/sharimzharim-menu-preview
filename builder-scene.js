import { ingredientArt } from "./builder-art.js?v=20261010-details";

// A scene contains exactly one logical foundation and one photographed layer per chosen ID.
// All layer heights follow the photograph's proportions; no shared lettuce substitutes.
export function recipeScene(base,options) {
  const unique = [...new Map(options.map(o => [o[0],o])).values()];
  const arts = unique.map(o => ({option:o,art:ingredientArt(o)})).filter(o => o.art);
  const food = arts.filter(o => !o.art.sauce).sort((a,b) => a.art.order-b.art.order || a.option[0]-b.option[0]);
  const sauces = arts.filter(o => o.art.sauce);
  const compression = Math.min(1,105/Math.max(1,food.reduce((sum,o) => sum+o.art.lift,0)));
  const layers = [];
  let cursor = 183;
  for (const {option,art} of food) {
    const height = art.width*art.photo.rect[3]/art.photo.rect[2];
    layers.push({id:option[0],name:option[1],style:art.fillingStyle,width:art.width,height,
      x:(240-art.width)/2,y:cursor-height,z:layers.length+1,photo:art.photo,sauce:false});
    cursor -= art.lift*compression;
  }
  const foodTop = layers.length ? Math.min(...layers.map(l => l.y)) : 164;
  for (const {option,art} of sauces) {
    const height = art.width*art.photo.rect[3]/art.photo.rect[2];
    layers.push({id:option[0],name:option[1],style:art.fillingStyle,width:art.width,height,
      x:(240-art.width)/2,y:foodTop-8-(layers.length-food.length)*8,z:layers.length+1,photo:art.photo,sauce:true});
  }
  const ingredientTop = layers.length ? Math.min(...layers.map(l => l.y)) : 185;
  const bunTop = (layers.length ? ingredientTop+12 : 185)-87;
  return {base,layers,bunTop,top:Math.min(base === "bun" ? layers.length ? bunTop : 177 : 164,ingredientTop),bottom:244};
}
