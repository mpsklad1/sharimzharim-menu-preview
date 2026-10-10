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
export const FOUNDATION_LAYER = {bun:0,lettuce:5,lavash:14,pita:15};
export function layerStyle(index) {return crop(LAYERS,layerRects[index],1280);}
export function foundationStyle(id) {return layerStyle(FOUNDATION_LAYER[id]);}
const layerMap = [2,11,12,12,7,7,9,13,3,3,4,8,8,5,5,5,6,6,6,6,10,10,8,4,5,12,10];
export function ingredientArt(option) {
  const id = option[0];
  if (id >= 1001 && id <= 1027) return {style:crop(TRAYS,foodRects[id-1001]),layer:layerMap[id-1001],sauce:false};
  if (id >= 1101 && id <= 1116) return {style:crop(BOTTLES,bottleRects[id-1101],1280),sauce:true,
    color:["#99a34c","#c43624","#532519","#d53220","#edb327","#e6ded0","#dc8c83","#ca3827","#512219","#c95631","#eee2c6","#f2e8d6","#e96826","#b32519","#d4a42a","#cdb084"][id-1101]};
  return {style:layerStyle(5),layer:5,sauce:false};
}
