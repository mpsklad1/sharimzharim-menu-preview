import { INGREDIENT_PHOTOS } from "./builder-photo-manifest.js?v=20261010-details";
// Photographs generated with imagegen. CSS crops preserve the approved camera angle.
export const TRAYS = "./assets/saladbar-trays-20261010.webp";
export const BOTTLES = "./assets/saladbar-bottle-atlas-20261010.webp";
export const LAYERS = "./assets/saladbar-food-layers-20261010.webp";
const crop = (src,rect,size=1536) => {
  const [x,y,w,h] = rect, height = src === TRAYS ? 1024 : 1280;
  return `background-image:url('${src}');background-size:${size/w*100}% ${height/h*100}%;background-position:${x/(size-w)*100}% ${y/(height-h)*100}%;`;
};
const foodRects = [
  [54,260,123,65],[198,260,128,65],[353,261,130,63],[511,261,123,63],[660,261,123,63],
  [51,355,125,65],[205,355,125,65],[356,355,123,65],[506,355,128,65],[658,355,125,65],
  [16,486,143,63],[180,485,133,65],[331,485,139,65],[487,485,135,65],[645,486,142,65],
  [4,590,151,60],[176,590,136,61],[330,590,139,60],[484,590,147,61],[650,590,142,61],
  [5,721,120,52],[154,721,120,52],[294,720,117,52],[435,720,119,52],[584,720,118,53],
  [737,720,136,49],[909,722,75,47]
];
const bottleRects = Array.from({length:16},(_,i) => [(i%4)*320+70,Math.floor(i/4)*320,180,320]);
const layerRects = [
  [9,95,306,190],[335,132,281,151],[635,132,295,155],[950,143,294,148],
  [14,415,299,147],[331,386,295,199],[646,417,283,149],[951,405,295,158],
  [15,696,299,168],[334,693,286,185],[636,700,299,187],[955,694,284,183],
  [13,969,298,206],[331,980,294,194],[646,997,281,156],[951,985,291,173]
];
export const FOUNDATION_LAYER = {bun:1,lettuce:5,lavash:14,pita:15};
export function layerStyle(index) {return crop(LAYERS,layerRects[index],1280);}
export function foundationStyle(id) {return layerStyle(FOUNDATION_LAYER[id]);}
export function categoryStyle(kind) {
  const rect = kind === "burger" ? [41,114,807,655] : [914,146,817,612];
  return photoStyle({src:"./assets/menu-meals-20261010.webp",size:[1774,887],rect})+`--meal-ratio:${rect[2]/rect[3]};`;
}
export function photoStyle(photo) {
  const [sw,sh] = photo.size, [x,y,w,h] = photo.rect;
  return `background-image:url('${photo.src}');background-size:${sw/w*100}% ${sh/h*100}%;background-position:${x/(sw-w)*100}% ${y/(sh-h)*100}%;`;
}
const widths = [174,169,177,174,177,177,177,160,185,148,174,163,162,186,162,166,168,168,170,166,158,161,150,161,155,176,112];
const lifts = [19,21,23,21,12,12,18,25,10,20,15,12,12,19,21,29,14,14,17,17,19,22,13,23,16,22,6];
const order = [10,12,14,14,22,22,24,12,30,31,50,52,53,40,41,42,55,56,57,58,32,33,59,60,61,62,70];
export function ingredientArt(option) {
  const id = option[0];
  const photo = INGREDIENT_PHOTOS[id];
  // Never display a different ingredient as a fallback for a missing photograph.
  if (!photo) return null;
  if (id >= 1001 && id <= 1027) return {id,photo,style:crop(TRAYS,foodRects[id-1001]),fillingStyle:photoStyle(photo),
    width:widths[id-1001],lift:lifts[id-1001],order:order[id-1001],sauce:false};
  if (id >= 1101 && id <= 1116) return {id,photo,style:crop(BOTTLES,bottleRects[id-1101],1280),fillingStyle:photoStyle(photo),
    width:126,lift:8,order:100+id-1101,sauce:true};
  return null;
}
