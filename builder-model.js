export const BUILDER_ENABLED = true;

export function basesFor(products, kind) {
  return products.filter(p => p.status === "active" && (kind === "shawarma"
    ? p.category === "Шаверма" : ["На булке", "Бургеры"].includes(p.category)));
}

export function isRemoval(option) { return /^Без\s/i.test(option[1]); }

export function ingredientMeta(option) {
  const name = option[1].toLocaleLowerCase("ru-RU");
  if (/соус|кетчуп|горчиц/.test(name)) return {kind:"sauce", category:"Соусы", color:/чили|шрирач|барбекю/.test(name) ? "#ce4933" : "#efb83b"};
  if (/сыр/.test(name)) return {kind:"cheese", category:"Сыр", color:/дорблю/.test(name) ? "#eddfad" : "#f6bd36"};
  if (/котлет|мяс|куриц|стрипс|бекон|яйцо/.test(name)) return {kind:/яйцо/.test(name) ? "egg" : /куриц|стрипс/.test(name) ? "chicken" : "meat", category:"Мясо", color:"#995432"};
  if (/томат|помидор/.test(name)) return {kind:"tomato", category:"Овощи", color:"#ed593e"};
  if (/лук/.test(name)) return {kind:"onion", category:"Овощи", color:"#b476ba"};
  if (/огур/.test(name)) return {kind:"cucumber", category:"Овощи", color:"#66a552"};
  if (/халапеньо|перец/.test(name)) return {kind:"pepper", category:"Овощи", color:"#59954a"};
  if (/гриб/.test(name)) return {kind:"mushroom", category:"Овощи", color:"#ba895b"};
  return {kind:"lettuce", category:"Овощи", color:"#76aa55"};
}

export function extrasFor(product) {
  const options = (product.option_groups || []).flatMap(g => g.options).filter(o => !isRemoval(o));
  // Start with one of each main ingredient, then expose every remaining option.
  const first = ["tomato", "onion", "meat", "cheese", "lettuce", "sauce"]
    .map(kind => options.find(o => ingredientMeta(o).kind === kind)).filter(Boolean);
  return [...first,...options.filter(o => !first.includes(o))];
}

export function toggleIngredient(product, selected, id) {
  const group = (product.option_groups || []).find(g => g.options.some(o => o[0] === id));
  if (!group) return {changed:false};
  if (selected.has(id)) { selected.delete(id); return {changed:true, added:false}; }
  if (group.options.filter(o => selected.has(o[0])).length >= group.limit) return {changed:false, limit:group.limit};
  selected.add(id);
  return {changed:true, added:true};
}

export function builderPrice(product, selected, variant = null) {
  const base = product.variants?.find(v => v.id === variant)?.price ?? product.price;
  return base + (product.option_groups || []).flatMap(g => g.options)
    .filter(o => selected.has(o[0])).reduce((total,o) => total + o[2],0);
}

export function builderSelection(product, selected, variant = null) {
  const valid = new Set((product.option_groups || []).flatMap(g => g.options).map(o => o[0]));
  return {itemId:product.id, optionIds:[...selected].filter(id => valid.has(id)).sort((a,b) => a-b),
    half:false, xl:product.id === 34 && variant === "xl", count:1};
}
