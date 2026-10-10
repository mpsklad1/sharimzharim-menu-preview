export const BUILDER_ENABLED = true;
export const MAX_INGREDIENTS = 20; // Checkout accepts at most 20 recipe names per item.
export const FOUNDATIONS = {
  burger: [{id:"bun",label:"Булка"},{id:"lettuce",label:"Листья"}],
  shawarma: [{id:"lavash",label:"Лаваш"},{id:"pita",label:"Пита"}]
};

export function basesFor(products, kind) {
  return products.filter(p => p.status === "active" && p.builder_kind === kind &&
    FOUNDATIONS[kind]?.some(base => base.id === p.builder_base));
}
export function optionsFor(product) { return (product?.option_groups || []).flatMap(g => g.options); }
export function extrasFor(product) { return optionsFor(product); }
export function isRemoval(option) { return /^Без\s/i.test(option[1]); }
export function toggleIngredient(product, selected, id) {
  const group = (product?.option_groups || []).find(g => g.options.some(o => o[0] === id));
  if (!group) return {changed:false};
  if (selected.has(id)) {selected.delete(id); return {changed:true,added:false};}
  if (selected.size >= MAX_INGREDIENTS) return {changed:false,limit:MAX_INGREDIENTS,total:true};
  if (group.options.filter(o => selected.has(o[0])).length >= group.limit) return {changed:false,limit:group.limit};
  selected.add(id); return {changed:true,added:true};
}
export function validSelection(product, ids) {
  const selected = new Set();
  for (const id of new Set(ids || [])) if (Number.isInteger(id)) toggleIngredient(product,selected,id);
  return selected;
}
export function builderPrice(product, selected) {
  return product.price + optionsFor(product).filter(o => selected.has(o[0])).reduce((sum,o) => sum + o[2],0);
}
export function builderSelection(product, selected) {
  return {itemId:product.id,optionIds:[...validSelection(product,[...selected])].sort((a,b) => a-b),half:false,xl:false,count:1};
}
