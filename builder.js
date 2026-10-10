import { BUILDER_ENABLED, basesFor, ingredientMeta, extrasFor, isRemoval, toggleIngredient, builderPrice, builderSelection } from "./builder-model.js?v=20261010-builder";

const safe = value => String(value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);
const money = value => `${new Intl.NumberFormat("ru-RU").format(value)} ₽`;

function glyph(option) {
  const {kind,color} = ingredientMeta(option);
  const shapes = {
    tomato:'<path d="M24 10c-14-3-21 8-17 19 4 13 21 16 30 5 9-11 1-25-13-24Z" fill="#ed593e"/><path d="m23 13-9-6 9 3 5-7 1 8 10-1-10 6Z" fill="#4a8d48"/><path d="M13 23c0-4 3-7 6-8" fill="none" stroke="#ff9a70" stroke-width="3" stroke-linecap="round"/>',
    onion:'<ellipse cx="24" cy="26" rx="19" ry="15" fill="#bb79bc"/><ellipse cx="24" cy="26" rx="14" ry="10" fill="#f8e3ec"/><ellipse cx="24" cy="26" rx="9" ry="6" fill="#bb79bc"/><ellipse cx="24" cy="26" rx="5" ry="3" fill="#f8e3ec"/>',
    meat:'<path d="M7 21c-3 8 3 18 17 18s23-10 17-19C34 9 17 9 7 21Z" fill="#995432"/><path d="m13 20 19 9M18 15l18 9M9 27l15 8" stroke="#613a27" stroke-width="3" stroke-linecap="round"/>',
    chicken:'<path d="M10 17c10-13 31-4 29 11-1 12-12 15-22 8L8 41l-5-6 9-8c-3-3-4-7-2-10Z" fill="#d38d40"/><path d="m20 14 8 17m-1-18 8 15" stroke="#a66b2c" stroke-width="3" stroke-linecap="round"/>',
    cheese:'<path d="m6 18 33-7 5 25-34 7Z" fill="#f6bd36"/><path d="m6 18 33-7-7-5L6 13Z" fill="#ffe292"/><circle cx="17" cy="25" r="3" fill="#df9925"/><circle cx="32" cy="32" r="4" fill="#df9925"/><circle cx="33" cy="19" r="2" fill="#df9925"/>',
    lettuce:'<path d="M23 9c-8-9-18 2-15 8C-3 22 2 34 13 34c-3 10 13 13 18 6 12 2 17-12 9-17 8-10-6-20-12-13Z" fill="#79ae55"/><path d="m24 17-1 23m0-13-10-5m10 11 12-6" stroke="#4d853c" stroke-width="2.5" stroke-linecap="round"/>',
    cucumber:'<ellipse cx="22" cy="27" rx="17" ry="14" transform="rotate(-20 22 27)" fill="#529149"/><ellipse cx="22" cy="27" rx="13" ry="10" transform="rotate(-20 22 27)" fill="#c3d98b"/><path d="m15 25 3-1m8-2 2 2m-8 7 3 1m5-4 3 1" stroke="#76aa55" stroke-width="2" stroke-linecap="round"/>',
    pepper:'<path d="M35 10C19 7 29 30 6 35c16 13 38-3 33-21" fill="#57964d"/><path d="M35 11c0-5 4-6 7-5" fill="none" stroke="#43763c" stroke-width="3" stroke-linecap="round"/>',
    mushroom:'<path d="m19 22-3 18c5 4 14 3 18-1l-4-18Z" fill="#ead5b2"/><path d="M4 25C1 3 43-2 45 24c-10 5-29 7-41 1Z" fill="#b9875a"/><path d="M12 17c1-5 7-9 12-9" fill="none" stroke="#d9b184" stroke-width="3" stroke-linecap="round"/>',
    egg:'<path d="M17 6C7 9 4 21 6 31c3 15 29 18 36 4 4-9-4-17-10-20-5-3-5-12-15-9Z" fill="#fff8e3" stroke="#e7dabb"/><circle cx="24" cy="26" r="10" fill="#f6bd36"/>',
    sauce:`<path d="M7 25h34l-4 16H12Z" fill="#f8e8d2" stroke="#d8c0a1"/><ellipse cx="24" cy="25" rx="17" ry="6" fill="${color}"/><path d="M21 3c-1 7-8 10-6 15 2 7 14 6 15 0 1-5-5-8-6-15Z" fill="${color}"/>`
  };
  return `<svg viewBox="0 0 48 48" aria-hidden="true">${shapes[kind]}</svg>`;
}

function chef() {
  return `<svg class="builder-chef" viewBox="0 0 220 300" aria-hidden="true">
    <ellipse cx="110" cy="282" rx="71" ry="10" fill="#35291a" opacity=".08"/>
    <path d="M55 175q55-25 110 0l10 105H46Z" fill="#d7322a"/>
    <path d="M72 178v28h76v-28l17 10-3 91H58l-3-91Z" fill="#f7dfae"/>
    <path d="M89 149v26q21 15 43 0v-27" fill="#d99c70"/>
    <ellipse cx="110" cy="113" rx="47" ry="54" fill="#efbc8c"/>
    <path d="M63 108V91q-4-45 46-45 53 0 49 46l-3 22-9-24q-24 3-48-12L75 100Z" fill="#382922"/>
    <path d="M58 73q-2-39 58-37 44 0 46 36Z" fill="#d7322a"/>
    <path d="M64 69q66-13 105 2l-8 10q-58-9-100 2Z" fill="#ae261f"/>
    <rect x="93" y="43" width="39" height="15" rx="6" fill="#fff0d4"/><path d="M104 46v8m8-9v9m-10-6h15m-15 4h15" stroke="#d7322a" stroke-width="2"/>
    <path d="M80 109q7-5 14 0m32 0q7-5 14 0" stroke="#382922" stroke-width="4" stroke-linecap="round" fill="none"/>
    <path d="m108 115-5 14h12" fill="none" stroke="#cf8d60" stroke-width="3" stroke-linecap="round"/>
    <path d="M96 140q15 12 29-1" fill="none" stroke="#79472f" stroke-width="3" stroke-linecap="round"/>
    <circle cx="80" cy="129" r="7" fill="#eaa17b"/><circle cx="143" cy="129" r="7" fill="#eaa17b"/>
    <path d="M51 189 28 225q-6 15 9 21l48 13 7-20-35-16 17-21m92-13 23 36q6 15-9 21l-48 13-7-20 35-16-17-21" fill="#efbc8c" stroke="#d99c70" stroke-width="2"/>
    <path d="m56 174-16 20 24 19 18-24m82-15 16 20-24 19-18-24" fill="#d7322a"/>
    <text x="110" y="205" text-anchor="middle" font-size="11" font-weight="900" fill="#8a442a">#ШАРИМЖАРИМ</text>
  </svg>`;
}

function layer(kind, y, index) {
  const transform = `translate(0 ${y})`;
  const colors = {meat:"#88482c",chicken:"#d89240",cheese:"#ffc23f",sauce:"#e99b33",tomato:"#ec5840",onion:"#b47bb3",cucumber:"#64a34c",pepper:"#589345",lettuce:"#76aa55",mushroom:"#bc8c5d",egg:"#fff1c8"};
  const shape = kind === "cheese"
    ? '<path d="m19 0 107 1-9 8-19-3-12 6-26-7-18 3Z"/>'
    : ["lettuce","onion"].includes(kind)
      ? '<path d="M21 2q10-7 21-1t20 0 20 0 20 0 22 0l-4 8q-11 4-22-1T78 8 58 8 38 8 20 8Z"/>'
      : '<rect x="22" width="100" height="9" rx="5"/>';
  return `<g class="builder-food-layer" data-layer="${index}" transform="${transform}" fill="${colors[kind] || colors.lettuce}">${shape}</g>`;
}

function food(product, selected, kind) {
  const options = (product.option_groups || []).flatMap(g => g.options);
  const removals = options.filter(o => selected.has(o[0]) && isRemoval(o)).map(o => ingredientMeta(o).kind);
  const extra = options.filter(o => selected.has(o[0]) && !isRemoval(o)).map(o => ingredientMeta(o).kind);
  const description = product.description.toLowerCase();
  const base = [/куриц|стрипс/.test(description) ? "chicken" : /фалафель/.test(description) ? "lettuce" : "meat",
    ...(/сыр|чеддер|дорблю/.test(description) ? ["cheese"] : []), "lettuce",
    ...(/томат|помидор/.test(description) ? ["tomato"] : []),
    ...(/огур/.test(description) ? ["cucumber"] : []),
    ...(/лук/.test(description) ? ["onion"] : []), "sauce"]
    .filter(k => !removals.includes(k));
  const layers = [...base, ...extra];
  const step = Math.min(10, 79 / layers.length);
  const start = 100 - layers.length * step;
  if (kind === "shawarma") return `<svg class="builder-food" viewBox="0 0 144 140" aria-hidden="true">
    <ellipse cx="72" cy="132" rx="66" ry="5" fill="#fffdf4" stroke="#d6c29f"/>
    <path d="M26 17q45-19 91 0l-6 93q-38 24-76 0Z" fill="#e9bb76" stroke="#ce9957" stroke-width="2"/>
    ${layers.map((k,i) => layer(k,start+i*step,i)).join("")}
    <path d="M26 43q31 28 84 46l-2 26q-35 23-71-1Z" fill="#f4d59e" stroke="#d9ad70" stroke-width="2"/>
    <path d="m36 79 66 25m-62-11 61 24" stroke="#bf844b" stroke-width="3" opacity=".6"/>
  </svg>`;
  return `<svg class="builder-food" viewBox="0 0 144 140" aria-hidden="true">
    <ellipse cx="72" cy="132" rx="66" ry="5" fill="#fffdf4" stroke="#d6c29f"/>
    <path d="M21 108h103q-5 20-48 20-45 0-55-20Z" fill="#e6a052"/>
    ${[...layers].reverse().map((k,i) => layer(k,start+i*step,i)).join("")}
    <g transform="translate(0 ${start-40})"><path d="M19 37q4-36 53-36t53 36Z" fill="#eaa855"/><path d="M29 21q11-16 31-17" fill="none" stroke="#ffd390" stroke-width="4" stroke-linecap="round"/><path d="m64 14 4 2m15-7 4 2m7 15 4-2m-44 1 4-2m27-6 4 2" stroke="#fff0c8" stroke-width="3" stroke-linecap="round"/><rect x="17" y="35" width="110" height="10" rx="5" fill="#dc923e"/></g>
  </svg>`;
}

export function createMealBuilder({dialog, entry, getProducts, onOrder, toast, telegram}) {
  let kind = "burger", product = null, selected = new Set(), variant = null;
  let category = "Все", page = 0, trigger = null;
  const $ = selector => dialog.querySelector(selector);
  const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const allOptions = () => (product.option_groups || []).flatMap(g => g.options);
  const currentExtras = () => extrasFor(product).filter(o => category === "Все" || ingredientMeta(o).category === category);

  function title() { return kind === "burger" ? "Приготовь бургер" : "Приготовь шаурму"; }
  function render() {
    const bases = basesFor(getProducts(), kind);
    dialog.innerHTML = `<div class="sheet-layout">
      <header class="sheet-header builder-header"><button type="button" class="icon-button" data-builder="close" aria-label="Вернуться в меню"><span class="icon icon-back" aria-hidden="true"></span></button><strong>${title()}</strong><span class="builder-test">ТЕСТ</span></header>
      <div class="sheet-scroll builder-scroll">
        <p class="builder-intro">Твой рецепт. Твои правила.</p>
        <label class="builder-base"><span>Основа</span><select id="builder-base">${bases.map(p => `<option value="${p.id}" ${p.id === product.id ? "selected" : ""}>${safe(p.name)}</option>`).join("")}</select></label>
        ${product.id === 34 && product.variants.some(v => v.id === "xl") ? '<div class="builder-size" role="group" aria-label="Размер шаурмы"><button type="button" data-builder="size" data-variant="" aria-pressed="true">Стандарт</button><button type="button" data-builder="size" data-variant="xl" aria-pressed="false">XL</button></div>' : ""}
        <div class="builder-stage"><div class="builder-orbit" aria-hidden="true"></div>${chef()}<div class="builder-dish"></div><div class="builder-ingredients" aria-label="Доступные ингредиенты"></div></div>
        <p class="builder-instruction">Нажми на ингредиент — добавим в блюдо</p>
        <p class="builder-feedback" role="alert" hidden></p>
        <div class="builder-filters" aria-label="Группы ингредиентов">${["Все",...new Set(extrasFor(product).map(o => ingredientMeta(o).category))].map(c => `<button type="button" data-builder="filter" data-category="${safe(c)}" aria-pressed="${c === category}">${safe(c)}</button>`).join("")}</div>
        <div class="builder-pages"></div>
        <section class="builder-recipe"><div class="builder-recipe-heading"><h2>Твой состав</h2><button type="button" data-builder="reset" class="builder-reset" hidden>Сбросить допы</button></div><p class="builder-recipe-empty">${safe(product.name)}. Добавь что-нибудь по вкусу.</p><div class="builder-selected"></div></section>
        ${allOptions().some(isRemoval) ? `<section class="builder-removals"><h2>Убрать из основы</h2><div>${allOptions().filter(isRemoval).map(o => `<button type="button" data-builder="ingredient" data-option="${o[0]}" aria-pressed="false">${safe(o[1])}<span aria-hidden="true">✓</span></button>`).join("")}</div></section>` : ""}
        <details class="builder-composition"><summary>Что входит в основу</summary><p>${safe(product.description)}</p></details>
        <p class="builder-status" role="status" aria-live="polite"></p>
      </div>
      <footer class="sheet-footer builder-footer"><div><small>Твой ${kind === "burger" ? "бургер" : "ролл"}</small><strong id="builder-price"></strong></div><button type="button" class="primary-button" data-builder="order">Заказать<span class="icon icon-promo-arrow" aria-hidden="true"></span></button></footer>
    </div>`;
    update();
  }

  function renderIngredients() {
    const options = currentExtras();
    const pageCount = Math.max(1, Math.ceil(options.length / 6));
    page = Math.min(page, pageCount - 1);
    $(".builder-ingredients").innerHTML = options.slice(page*6,page*6+6).map((o,i) => `<button type="button" class="builder-ingredient slot-${i}" data-builder="ingredient" data-option="${o[0]}" aria-pressed="${selected.has(o[0])}" style="--float-delay:${-i*0.7}s"><span class="builder-ingredient-art">${glyph(o)}<span class="builder-ingredient-check" aria-hidden="true">✓</span></span><span class="builder-ingredient-name">${safe(o[1])}</span>${o[2] ? `<small>+${money(o[2])}</small>` : ""}</button>`).join("");
    $(".builder-pages").innerHTML = pageCount > 1 ? `<button type="button" data-builder="page" data-step="-1" aria-label="Предыдущие ингредиенты" ${page === 0 ? "disabled" : ""}><span class="icon icon-back" aria-hidden="true"></span></button><span>${page+1} / ${pageCount} <small>Все допы: ${options.length}</small></span><button type="button" data-builder="page" data-step="1" aria-label="Следующие ингредиенты" ${page === pageCount-1 ? "disabled" : ""}><span class="icon icon-promo-arrow" aria-hidden="true"></span></button>` : `<span>Доступно ${options.length} ${kind === "shawarma" ? "добавок" : "ингредиентов"}</span>`;
  }

  function update() {
    $(".builder-feedback").hidden = true;
    renderIngredients();
    $(".builder-dish").innerHTML = food(product, selected, kind);
    $("#builder-price").textContent = money(builderPrice(product, selected, variant));
    const chosen = allOptions().filter(o => selected.has(o[0]));
    $(".builder-recipe-empty").hidden = chosen.length > 0;
    $('[data-builder="reset"]').hidden = chosen.length === 0;
    $(".builder-selected").innerHTML = chosen.map(o => `<button type="button" data-builder="ingredient" data-option="${o[0]}" aria-label="${isRemoval(o) ? "Вернуть" : "Убрать"} ${safe(o[1])}">${safe(o[1])}<span aria-hidden="true">×</span></button>`).join("");
    dialog.querySelectorAll('.builder-removals [data-option]').forEach(b => b.setAttribute("aria-pressed", String(selected.has(Number(b.dataset.option)))));
    dialog.querySelectorAll('[data-builder="size"]').forEach(b => b.setAttribute("aria-pressed", String((b.dataset.variant || null) === variant)));
  }

  function fly(button, option) {
    if (reduced() || !button.classList.contains("builder-ingredient")) return;
    const stage = $(".builder-stage"), dish = $(".builder-dish");
    const from = button.querySelector(".builder-ingredient-art").getBoundingClientRect();
    const frame = stage.getBoundingClientRect(), to = dish.getBoundingClientRect();
    const flying = document.createElement("span");
    flying.className = "builder-flying"; flying.setAttribute("aria-hidden", "true"); flying.innerHTML = glyph(option);
    flying.style.left = `${from.left-frame.left}px`; flying.style.top = `${from.top-frame.top}px`;
    stage.append(flying);
    const animation = flying.animate([
      {transform:"translate(0,0) rotate(-12deg) scale(1)",opacity:1},
      {transform:`translate(${to.left+to.width/2-from.left-24}px,${to.top+to.height/2-from.top-24}px) rotate(14deg) scale(.6)`,opacity:0}
    ],{duration:280,easing:"cubic-bezier(.23,1,.32,1)"});
    animation.onfinish = () => flying.remove(); animation.oncancel = () => flying.remove();
  }

  function open(nextKind, from) {
    const bases = basesFor(getProducts(), nextKind);
    if (!bases.length) { toast("Загружаем меню. Попробуй ещё раз"); return; }
    kind = nextKind; product = bases[0]; selected = new Set(); variant = null; category = "Все"; page = 0; trigger = from;
    render(); dialog.showModal(); document.body.classList.add("modal-open");
    telegram?.BackButton?.show?.();
  }
  entry.hidden = !BUILDER_ENABLED;
  entry.addEventListener("click", event => {
    const button = event.target.closest("[data-build-meal]");
    if (button && BUILDER_ENABLED) open(button.dataset.buildMeal, button);
  });
  dialog.addEventListener("change", event => {
    if (event.target.id !== "builder-base") return;
    product = basesFor(getProducts(), kind).find(p => p.id === Number(event.target.value));
    selected = new Set(); variant = null; category = "Все"; page = 0; render();
    $("#builder-base").focus();
  });
  dialog.addEventListener("click", event => {
    const button = event.target.closest("[data-builder]");
    if (!button) return;
    switch (button.dataset.builder) {
      case "close": dialog.close(); break;
      case "filter": category = button.dataset.category; page = 0; renderIngredients(); dialog.querySelectorAll('[data-builder="filter"]').forEach(b => b.setAttribute("aria-pressed",String(b.dataset.category === category))); break;
      case "page": {
        const step = button.dataset.step;
        page += Number(step); renderIngredients();
        if (event.detail === 0) {
          const next = dialog.querySelector(`.builder-pages [data-step="${step}"]:not(:disabled)`) || dialog.querySelector('.builder-pages button:not(:disabled)');
          next?.focus();
        }
        $(".builder-status").textContent = `Ингредиенты: страница ${page+1}`; break;
      }
      case "size": variant = button.dataset.variant || null; update(); break;
      case "reset": selected.clear(); update(); $(".builder-status").textContent = "Все допы убраны"; break;
      case "ingredient": {
        const id = Number(button.dataset.option), option = allOptions().find(o => o[0] === id);
        const result = toggleIngredient(product, selected, id);
        if (!result.changed) {
          const message = result.limit ? `Можно выбрать до ${result.limit} добавок. Сначала убери одну.` : "Этот ингредиент недоступен";
          $(".builder-feedback").textContent = message; $(".builder-feedback").hidden = false;
          return;
        }
        // Capture the tapped ingredient before update replaces the orbit buttons.
        if (result.added && event.detail > 0) fly(button, option);
        update();
        if (event.detail === 0) {
          const next = dialog.querySelector(`.builder-ingredients [data-option="${id}"]`) ||
            dialog.querySelector(`.builder-removals [data-option="${id}"]`) ||
            dialog.querySelector('.builder-selected button') || $('[data-builder="order"]');
          next?.focus();
        }
        $(".builder-status").textContent = `${option[1]}: ${result.added ? "выбрано" : "убрано"}`;
        telegram?.HapticFeedback?.selectionChanged?.();
        break;
      }
      case "order": {
        const selection = builderSelection(product, selected, variant);
        dialog.close(); onOrder(selection); break;
      }
    }
  });
  dialog.addEventListener("close", () => {
    telegram?.BackButton?.hide?.();
    if (!document.querySelector('dialog[open]')) trigger?.focus();
    dialog.querySelectorAll(".builder-flying").forEach(el => el.remove());
  });
  return {close: () => {if (dialog.open) dialog.close();}};
}
