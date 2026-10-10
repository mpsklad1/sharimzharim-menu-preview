import { ingredientArt } from "./builder-art.js?v=20261010-button-polish";

// The opening and bread lip share one coordinate system, including the flight endpoint.
export const PITA_POCKET = {
  foundation:{x:25,y:110,width:190,height:190*173/291},
  clip:"ellipse(80px 31px at 120px 182px)",
  backClip:"polygon(0 0,100% 0,100% 53%,90% 76%,75% 87%,50% 92%,25% 87%,10% 76%,0 53%)",
  frontClip:"polygon(0 53%,10% 76%,25% 87%,50% 92%,75% 87%,90% 76%,100% 53%,100% 100%,0 100%)"
};
const pitaSlots = [[99,181],[142,181],[120,172],[86,188],[151,188],[110,187]];

// A scene contains exactly one logical foundation and one photographed layer per chosen ID.
// All layer heights follow the photograph's proportions; no shared lettuce substitutes.
export function recipeScene(base,options) {
  const unique = [...new Map(options.map(o => [o[0],o])).values()];
  const arts = unique.map(o => ({option:o,art:ingredientArt(o)})).filter(o => o.art);
  const food = arts.filter(o => !o.art.sauce).sort((a,b) => a.art.order-b.art.order || a.option[0]-b.option[0]);
  const sauces = arts.filter(o => o.art.sauce);
  if (base === "pita") {
    const layers = [...food,...sauces].map(({option,art},index) => {
      const ratio = art.photo.rect[3]/art.photo.rect[2];
      const width = Math.min(art.sauce ? 74 : 105,art.width*.6,50/ratio);
      const height = width*ratio;
      const [cx,cy] = art.sauce ? [120,180+(index-food.length)%3*4] : pitaSlots[index%pitaSlots.length];
      return {id:option[0],name:option[1],style:art.fillingStyle,width,height,x:cx-width/2,y:cy-height/2,
        z:index+1,photo:art.photo,sauce:art.sauce};
    });
    return {base,layers,pocket:PITA_POCKET,top:PITA_POCKET.foundation.y,bottom:244};
  }
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
