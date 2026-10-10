import { BUILDER_ENABLED, MAX_INGREDIENTS, FOUNDATIONS, basesFor, optionsFor, validSelection, toggleIngredient, builderPrice, builderSelection } from "./builder-model.js?v=20261010-saladbar";
import { ingredientArt, layerStyle, foundationStyle } from "./builder-art.js?v=20261010-saladbar";

const safe = value => String(value).replace(/[&<>"']/g,c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);
const money = value => `${new Intl.NumberFormat("ru-RU").format(value)} ₽`;
const DRAFT_KEY = "sharimzharim-saladbar-draft-v1";

export function createMealBuilder({dialog,entry,getProducts,onOrder,toast,telegram}) {
  let kind = "burger", product = null, selected = new Set(), trigger = null;
  const drafts = {burger:{base:"bun",ids:[]},shawarma:{base:"lavash",ids:[]}};
  try {
    const saved = JSON.parse(localStorage.getItem(DRAFT_KEY) || "null");
    for (const k of Object.keys(drafts)) if (saved?.[k] && Array.isArray(saved[k].ids) &&
      FOUNDATIONS[k].some(b => b.id === saved[k].base)) drafts[k] = saved[k];
  } catch {}
  const $ = selector => dialog.querySelector(selector);
  const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const chosen = () => optionsFor(product).filter(o => selected.has(o[0]));
  function persist() {
    drafts[kind] = {base:product.builder_base,ids:[...selected]};
    try {localStorage.setItem(DRAFT_KEY,JSON.stringify(drafts));} catch {}
  }
  function optionButton(option,sauce) {
    const art = ingredientArt(option);
    return `<button type="button" class="salad-option ${sauce ? "salad-bottle" : "salad-pan"}" data-builder="ingredient" data-option="${option[0]}" aria-pressed="${selected.has(option[0])}">
      <span class="salad-option-photo" aria-hidden="true" style="${art.style}"></span>
      <span class="salad-option-label">${safe(option[1])}</span>
      ${option[2] ? `<small>+${money(option[2])}</small>` : ""}<span class="salad-check" aria-hidden="true">✓</span>
    </button>`;
  }
  function render() {
    const sauces = product.option_groups.filter(g => g.title === "Соусы");
    const groups = product.option_groups.filter(g => g.title !== "Соусы");
    const bases = basesFor(getProducts(),kind);
    dialog.innerHTML = `<div class="sheet-layout salad-layout">
      <header class="sheet-header builder-header"><button type="button" class="icon-button" data-builder="close" aria-label="Вернуться в меню"><span class="icon icon-back" aria-hidden="true"></span></button><strong>#Шарим<span>Жарим</span></strong><span class="salad-header-caption">Твой рецепт</span></header>
      <p class="builder-feedback" role="alert" hidden></p>
      <div class="sheet-scroll builder-scroll">
        <div class="salad-welcome"><h1>Приготовь по-своему</h1></div>
        <div class="salad-categories" role="group" aria-label="Что приготовим">${[["burger","Бургер","bun"],["shawarma","Шаурма","lavash"]].map(([id,label,base]) => `<button type="button" data-builder="kind" data-kind="${id}" aria-pressed="${kind === id}" ${basesFor(getProducts(),id).length ? "" : "disabled"}><span aria-hidden="true" class="salad-base-photo" style="${foundationStyle(base)}"></span>${label}</button>`).join("")}</div>
        <div class="salad-foundations" role="group" aria-label="${kind === "burger" ? "Основа бургера" : "Основа шаурмы"}">${FOUNDATIONS[kind].map(base => `<button type="button" data-builder="base" data-base="${base.id}" aria-pressed="${product.builder_base === base.id}" ${bases.some(p => p.builder_base === base.id) ? "" : "disabled"}><span class="salad-base-photo" aria-hidden="true" style="${foundationStyle(base.id)}"></span>${base.label}</button>`).join("")}</div>
        <p class="salad-instruction">Нажимай на начинки и соусы — соберём твой рецепт</p>
        <section class="salad-sauce-station" aria-labelledby="salad-sauce-title"><div class="salad-section-title"><h2 id="salad-sauce-title">Соусы</h2><span>Листай →</span></div><div class="salad-sauce-rack">${sauces.flatMap(g => g.options).map(o => optionButton(o,true)).join("")}</div></section>
        <div class="salad-steel-bar" aria-label="Салат-бар">${groups.map((g,index) => `<section class="salad-section" aria-labelledby="salad-group-${index}"><div class="salad-section-title"><h2 id="salad-group-${index}">${safe(g.title)}</h2></div><div class="salad-pans">${g.options.map(o => optionButton(o,false)).join("")}</div></section>`).join("")}</div>
        <section class="builder-recipe" id="salad-recipe"><div class="builder-recipe-heading"><h2>Твой состав</h2><button type="button" data-builder="reset" hidden>Очистить</button></div><p class="salad-base-name"></p><p class="builder-recipe-empty">Выбери начинку по вкусу</p><div class="builder-selected"></div></section>
        <p class="builder-status" role="status" aria-live="polite"></p>
      </div>
      <div class="salad-dock"><div class="salad-preview" role="img" aria-label=""></div><div class="salad-dock-copy"><strong class="salad-meal-title"></strong><button type="button" data-builder="recipe" class="salad-recipe-link">Выбери начинки</button><span class="salad-dock-subtitle"></span></div></div>
      <footer class="sheet-footer builder-footer"><div><small>Итого</small><strong id="builder-price"></strong></div><button type="button" class="primary-button" data-builder="order" disabled>Заказать<span class="icon icon-promo-arrow" aria-hidden="true"></span></button></footer>
    </div>`;
    update();
  }
  function foodLayer(index,top,height,z,extra="") {
    return `<span class="salad-food-layer" style="${layerStyle(index)}top:${top}px;height:${height}px;z-index:${z};${extra}"></span>`;
  }
  function renderFood() {
    const fillings = chosen().filter(o => !ingredientArt(o).sauce);
    const sauces = chosen().filter(o => ingredientArt(o).sauce);
    const step = Math.min(12,100/Math.max(1,fillings.length));
    const base = product.builder_base;
    const baseLayer = base === "bun" ? 1 : base === "lettuce" ? 5 : base === "lavash" ? 14 : 15;
    let html = '<span class="salad-plate"></span>' + foodLayer(baseLayer,base === "bun" ? 177 : 164,base === "bun" ? 50 : 74,0);
    fillings.forEach((o,i) => {
      const art = ingredientArt(o);
      html += foodLayer(art.layer,154-i*step,art.layer === 3 ? 29 : art.layer === 5 ? 34 : 43,i+1);
    });
    sauces.forEach((o,i) => {
      html += `<span class="salad-sauce-drizzle" style="top:${164-fillings.length*step-i*3}px;background:${ingredientArt(o).color};z-index:${fillings.length+i+1}"></span>`;
    });
    if (base === "bun") html += foodLayer(0,106-fillings.length*step,87,50);
    if (base === "lettuce" && fillings.length) html += foodLayer(5,133-fillings.length*step,38,50);
    if (base === "lavash" || base === "pita") html += foodLayer(baseLayer,167,67,50);
    const preview = $(".salad-preview");
    const top = base === "bun" ? 106-fillings.length*step : base === "lettuce" && fillings.length ? 133-fillings.length*step : fillings.length ? 154-(fillings.length-1)*step : 164;
    const width = preview.clientWidth || (window.innerWidth < 640 ? 132 : 144);
    const height = preview.clientHeight || (window.innerWidth < 360 ? 91 : window.innerWidth < 640 ? 103 : 115);
    const scale = Math.min(.6,width/240,height/(244-top+8));
    preview.innerHTML = `<div class="salad-food-canvas" style="left:${(width-240*scale)/2}px;top:${4-top*scale}px;transform:scale(${scale})">${html}</div>`;
    $(".salad-preview").setAttribute("aria-label",`${product.name}: ${chosen().map(o => o[1]).join(", ") || "без начинки"}`);
  }
  function update() {
    const items = chosen();
    $(".builder-feedback").hidden = true;
    dialog.querySelectorAll('[data-option]').forEach(button => button.setAttribute("aria-pressed",String(selected.has(Number(button.dataset.option)))));
    $("#builder-price").textContent = money(builderPrice(product,selected));
    $('[data-builder="order"]').disabled = !items.length;
    $('[data-builder="reset"]').hidden = !items.length;
    $(".builder-recipe-empty").hidden = items.length > 0;
    $(".salad-base-name").textContent = `Основа: ${FOUNDATIONS[kind].find(b => b.id === product.builder_base).label.toLowerCase()}`;
    $(".builder-selected").innerHTML = items.map(o => `<button type="button" data-builder="ingredient" data-option="${o[0]}" aria-label="Убрать ${safe(o[1])}">${safe(o[1])}<span aria-hidden="true">×</span></button>`).join("");
    $(".salad-meal-title").textContent = kind === "burger" ? "Твой бургер" : "Твоя шаурма";
    $('[data-builder="recipe"]').textContent = items.length ? `Состав · ${items.length} ${items.length === 1 ? "ингредиент" : items.length < 5 ? "ингредиента" : "ингредиентов"}` : "Выбери начинки";
    $(".salad-dock-subtitle").textContent = items.length ? items.slice(-2).map(o => o[1]).join(" · ") : "Можно собрать с нуля";
    renderFood(); persist();
  }
  function changeKind(nextKind) {
    persist();
    const bases = basesFor(getProducts(),nextKind);
    if (!bases.length) return;
    kind = nextKind;
    product = bases.find(p => p.builder_base === drafts[kind].base) || bases[0];
    selected = validSelection(product,drafts[kind].ids);
    render();
  }
  function fly(button,option) {
    if (reduced() || !button.classList.contains("salad-option")) return;
    const from = button.getBoundingClientRect(), to = $(".salad-preview").getBoundingClientRect(), frame = dialog.getBoundingClientRect();
    const ghost = document.createElement("span");
    ghost.className = "salad-flying"; ghost.setAttribute("aria-hidden","true");
    const art = ingredientArt(option);
    if (art.sauce) ghost.innerHTML = `<span class="salad-flying-drop" style="background:${art.color}"></span>`;
    else ghost.style.cssText = layerStyle(art.layer);
    ghost.style.left = `${from.left-frame.left+from.width/2-28}px`; ghost.style.top = `${from.top-frame.top+from.height/2-28}px`;
    dialog.append(ghost);
    const animation = ghost.animate([{transform:"translate(0,0) scale(1)",opacity:1},{transform:`translate(${to.left+to.width/2-from.left-from.width/2}px,${to.top+to.height/2-from.top-from.height/2}px) scale(.8)`,opacity:0}],{duration:250,easing:"cubic-bezier(.23,1,.32,1)"});
    animation.onfinish = () => ghost.remove(); animation.oncancel = () => ghost.remove();
  }
  function open(nextKind,from) {
    const bases = basesFor(getProducts(),nextKind);
    if (!bases.length) {toast("Конструктор пока загружается. Попробуй ещё раз");return;}
    kind = nextKind; trigger = from;
    product = bases.find(p => p.builder_base === drafts[kind].base) || bases[0];
    selected = validSelection(product,drafts[kind].ids);
    render(); dialog.showModal(); renderFood(); document.body.classList.add("modal-open");
    telegram?.BackButton?.show?.(); telegram?.setHeaderColor?.("#161310"); telegram?.setBackgroundColor?.("#161310");
  }
  entry.hidden = !BUILDER_ENABLED;
  entry.addEventListener("click",event => {
    const button = event.target.closest("[data-build-meal]");
    if (button && BUILDER_ENABLED) open(button.dataset.buildMeal,button);
  });
  dialog.addEventListener("click",event => {
    const button = event.target.closest("[data-builder]");
    if (!button) return;
    switch (button.dataset.builder) {
      case "close": dialog.close();break;
      case "kind": {
        changeKind(button.dataset.kind);
        if (event.detail === 0) $(`[data-kind="${kind}"]`)?.focus();
        break;
      }
      case "base": {
        const next = basesFor(getProducts(),kind).find(p => p.builder_base === button.dataset.base);
        if (!next) return;
        product = next; selected = validSelection(product,[...selected]); render();
        if (event.detail === 0) $(`[data-base="${product.builder_base}"]`)?.focus();
        break;
      }
      case "recipe": $("#salad-recipe").scrollIntoView({behavior:reduced() || event.detail === 0 ? "instant" : "smooth",block:"center"});break;
      case "reset": selected.clear();update();$(".builder-status").textContent = "Состав очищен";$(".builder-recipe h2").setAttribute("tabindex","-1");$(".builder-recipe h2").focus({preventScroll:true});break;
      case "ingredient": {
        const id = Number(button.dataset.option), option = optionsFor(product).find(o => o[0] === id);
        const result = toggleIngredient(product,selected,id);
        if (!result.changed) {
          $(".builder-feedback").textContent = result.total ? `Можно выбрать до ${MAX_INGREDIENTS} ингредиентов. Убери одну начинку, чтобы добавить другую.` : result.limit ? `В этой группе можно выбрать до ${result.limit}.` : "Этот ингредиент сейчас недоступен";
          $(".builder-feedback").hidden = false;return;
        }
        if (result.added && event.detail > 0) fly(button,option);
        const fromRecipe = button.closest(".builder-selected");
        update();
        if (fromRecipe) {
          const next = $('[data-builder="reset"]:not([hidden])') || $(".builder-recipe h2");
          if (next.tagName === "H2") next.setAttribute("tabindex","-1");
          next.focus({preventScroll:true});
        }
        $(".builder-status").textContent = `${option[1]}: ${result.added ? "добавлено" : "убрано"}`;
        telegram?.HapticFeedback?.selectionChanged?.();
        break;
      }
      case "order": if (selected.size) {const line = builderSelection(product,selected);dialog.close();onOrder(line);}break;
    }
  });
  dialog.addEventListener("close",() => {
    if (document.querySelector("dialog[open]")) telegram?.BackButton?.show?.();
    else telegram?.BackButton?.hide?.();
    telegram?.setHeaderColor?.("#ffffff"); telegram?.setBackgroundColor?.("#ffffff");
    if (!document.querySelector("dialog[open]")) trigger?.focus();
    dialog.querySelectorAll(".salad-flying").forEach(el => el.remove());
  });
  window.addEventListener("resize",() => {if (dialog.open) renderFood();});
  return {close:() => {if (dialog.open) dialog.close();}};
}
