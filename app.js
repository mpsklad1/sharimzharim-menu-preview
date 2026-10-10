import { imageFor } from "./menu-data.js";
import { MenuAccount, API_BASE } from "./account.js?v=20261008-password-auth";
import { createAccountAuth } from "./auth-ui.js?v=20261008-password-auth";
import { createReviews } from "./reviews.js?v=20261008-password-auth";

// No separate local catalog: website and Mini App read the same database.
let categories = [];
let products = [];
const optionGroupsFor = product => product.option_groups || [];
const optionsFor = product => optionGroupsFor(product).flatMap(group => group.options);

const telegram = window.Telegram?.WebApp;
telegram?.ready();
telegram?.expand();
telegram?.setHeaderColor?.("#ffffff");
telegram?.setBackgroundColor?.("#ffffff");

const byId = new Map(products.map(product => [product.id, product]));
const currency = amount => `${new Intl.NumberFormat("ru-RU").format(amount)} ₽`;
const safe = value => String(value).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
const $ = selector => document.querySelector(selector);

const categoryList = $("#category-list");
const menuSections = $("#menu-sections");
const appHeader = $(".app-header");
const search = $("#menu-search");
const productDialog = $("#product-dialog");
const reviewsDialog = $("#reviews-dialog");
const cartDialog = $("#cart-dialog");
const accountDialog = $("#account-dialog");
const builderDialog = $("#builder-dialog");
const gamePromo = $("#game-promo");
const gameView = $("#game-view");
const gameFrame = $("#game-frame");
const account = new MenuAccount(telegram);
let category = "Шаверма";
let cart = loadCart();
let selectedProduct = null;
let selectedOptions = new Set();
let quantity = 1;
let halfPortion = false;
let xlPortion = false;
let toastTimer;
let reviewProductAfterLogin = null;
const reviewProducts = new Map();
let catalogReady = false;
let cartSaveTimer;
let cartRequest = Promise.resolve();
let checkoutRequestId = null;
try {checkoutRequestId=localStorage.getItem("sharimzharim-checkout-id");}catch{}

function selectionLines() {
  return cart.map(line => ({item_id:line.itemId,count:line.count,option_ids:line.optionIds,
    variant:line.half ? "half" : line.xl ? "xl" : null}));
}

function queueCartSave() {
  if (!account.token || !catalogReady) return;
  const items=selectionLines();
  cartRequest=cartRequest.catch(()=>{}).then(()=>account.saveCart(items));
  void cartRequest.catch(()=>showToast("Корзина пока не синхронизирована. Проверьте соединение"));
}

function loadCart() {
  try {
    const saved = JSON.parse(localStorage.getItem("sharimzharim-cart") || "[]");
    if (!Array.isArray(saved)) return [];
    return saved.filter(line => byId.has(line.itemId) && Number.isInteger(line.count) && line.count > 0)
      .map(line => ({
        itemId: line.itemId,
        count: Math.min(line.count, 99),
        half: line.itemId === 30 && line.half === true,
        xl: line.itemId === 34 && line.xl === true,
        optionIds: Array.isArray(line.optionIds)
          ? line.optionIds.filter(id => optionsFor(byId.get(line.itemId)).some(option => option[0] === id)) : []
      }));
  } catch {
    return [];
  }
}

function saveCart() {
  checkoutRequestId = null;
  try {localStorage.removeItem("sharimzharim-checkout-id");}catch{}
  try { localStorage.setItem("sharimzharim-cart", JSON.stringify(cart)); } catch { /* private browsing */ }
  renderCartButton();
  clearTimeout(cartSaveTimer);
  cartSaveTimer=setTimeout(queueCartSave,500);
}

function photoStyle(index) {
  if (typeof index === "string" && index.startsWith(`${API_BASE}/catalog/images/`)) {
    return `style="background-image:url('${safe(index)}');--background-size:cover;--background-position:center"`;
  }
  const [name, columns, rows, position] = imageFor(index);
  const x = columns === 1 ? 0 : (position % columns) * 100 / (columns - 1);
  const y = rows === 1 ? 0 : Math.floor(position / columns) * 100 / (rows - 1);
  return `style="background-image:url('./assets/${name}.webp');--background-size:${columns * 100}% ${rows * 100}%;--background-position:${x}% ${y}%"`;
}

function renderCategories() {
  categoryList.innerHTML = categories.map(name =>
    `<button type="button" class="category-chip" data-category="${safe(name)}" aria-current="${name === category}">${safe(name)}</button>`
  ).join("");
}

function setActiveCategory(name) {
  if (category === name) return;
  category = name;
  categoryList.querySelectorAll("[data-category]").forEach(button => {
    button.setAttribute("aria-current", String(button.dataset.category === name));
  });
  const current = categoryList.querySelector('[aria-current="true"]');
  if (current) categoryList.scrollTo({
    left: current.offsetLeft - categoryList.offsetLeft - (categoryList.clientWidth - current.clientWidth) / 2,
    behavior: "smooth"
  });
}

function renderProductCards(items) {
  return items.map(product => `
    <article class="product-card">
      <button type="button" class="product-photo-button" data-open="${product.id}" aria-label="Открыть ${safe(product.name)}">
        <span class="product-photo" ${photoStyle(product.image_url || product.image)}></span>
      </button>
      <div class="product-name">${safe(product.name)}</div>
      <p class="product-weight">${safe(product.weight)}</p>
      ${reviewSummaryButton(product, "product-card-reviews")}
      <div class="product-bottom">
        <span class="product-price">${product.id === 30 ? "от " + currency(Math.min(product.price,...product.variants.map(v=>v.price))) : currency(product.price)}</span>
        <button type="button" class="product-add" data-open="${product.id}" aria-label="Настроить ${safe(product.name)}"><span class="icon icon-plus" aria-hidden="true"></span></button>
      </div>
    </article>`).join("");
}

function renderProducts() {
  const query = search.value.trim().toLocaleLowerCase("ru-RU");
  if (query) {
    const matches = products.filter(product => !product.builder_kind &&
      `${product.name} ${product.description}`.toLocaleLowerCase("ru-RU").includes(query));
    menuSections.innerHTML = `<section class="menu-section" aria-labelledby="search-results-title">
      <h1 id="search-results-title">Результаты поиска</h1>
      <div class="product-grid">${matches.length ? renderProductCards(matches) : '<p class="empty-search">По вашему запросу ничего не найдено</p>'}</div>
    </section>`;
    return;
  }
  menuSections.innerHTML = categories.map((name, index) => {
    const itemCategory = name === "Бургеры" ? "На булке" : name;
    const items = products.filter(product => product.category === itemCategory);
    return `<section class="menu-section" id="menu-section-${index}" aria-labelledby="menu-heading-${index}">
      <h1 id="menu-heading-${index}">${safe(name)}</h1>
      <div class="product-grid">${renderProductCards(items)}</div>
    </section>`;
  }).join("");
}

function syncActiveCategory() {
  if (search.value.trim()) return;
  const sections = menuSections.querySelectorAll(".menu-section");
  const threshold = appHeader.getBoundingClientRect().bottom + 16;
  let activeIndex = 0;
  sections.forEach((section, index) => {
    if (section.getBoundingClientRect().top <= threshold) activeIndex = index;
  });
  if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) activeIndex = sections.length - 1;
  setActiveCategory(categories[activeIndex]);
}

function optionPrice(option) { return option[2] ? `+${currency(option[2])}` : "Бесплатно"; }
function unitBasePrice(product, half = false, xl = false) {
  if (product.id === 30 && half) return product.variants.find(v=>v.id==="half")?.price ?? product.price;
  if (product.id === 34 && xl) return product.variants.find(v=>v.id==="xl")?.price ?? product.price;
  return product.price;
}
function portionWeight(product, half = false, xl = false) {
  if (product.id === 30 && half) return "1/2 шт.";
  if (product.id === 34 && xl) return "500 г";
  return product.weight;
}
function portionSuffix(line) {
  return line.half ? " · половина" : line.xl ? " · XL" : "";
}
function basePrice() { return unitBasePrice(selectedProduct, halfPortion, xlPortion); }
function selectedPrice() {
  return basePrice() + optionsFor(selectedProduct).filter(option => selectedOptions.has(option[0]))
    .reduce((sum, option) => sum + option[2], 0);
}

function pluralCount(count, forms) {
  const n = Math.max(0, Number(count) || 0);
  const lastTwo = n % 100, last = n % 10;
  const word = lastTwo >= 11 && lastTwo <= 14 ? forms[2] : last === 1 ? forms[0] : last >= 2 && last <= 4 ? forms[1] : forms[2];
  return `${new Intl.NumberFormat("ru-RU").format(n)} ${word}`;
}
function stars(rating) {
  const value = Math.max(0, Math.min(5, Number(rating) || 0));
  const filled = Math.round(value);
  return `<span class="review-stars" aria-label="${String(value).replace(".", ",")} из 5">${"★".repeat(filled)}${"☆".repeat(5 - filled)}</span>`;
}
function reviewSummaryMarkup(summary) {
  if (!summary) return '<span class="rating-line"><span class="rating-star" aria-hidden="true">☆</span><span>Оценки и отзывы</span></span><span class="rating-caption">Открыть <span aria-hidden="true">›</span></span>';
  const hasRatings = Number(summary.rating_count) > 0;
  return `<span class="rating-line"><span class="rating-star" aria-hidden="true">${hasRatings ? "★" : "☆"}</span>${hasRatings
    ? `<strong>${Number(summary.average).toFixed(1).replace(".", ",")}</strong><span class="rating-dot" aria-hidden="true">·</span><span>${pluralCount(summary.rating_count, ["оценка", "оценки", "оценок"])}</span>`
    : '<span>Пока нет оценок</span>'}</span><span class="rating-caption">${pluralCount(summary.review_count, ["отзыв", "отзыва", "отзывов"])} <span aria-hidden="true">›</span></span>`;
}
function reviewSummaryLabel(product) {
  const summary = product.review_summary;
  return `Оценки и отзывы: ${product.name}${summary ? `. ${summary.rating_count ? Number(summary.average).toFixed(1).replace(".", ",") + " из 5. " : ""}${pluralCount(summary.rating_count, ["оценка", "оценки", "оценок"])}. ${pluralCount(summary.review_count, ["отзыв", "отзыва", "отзывов"])}` : ""}`;
}
function reviewSummaryButton(product, className) {
  return `<button type="button" class="${className}" data-open-reviews="${product.id}" data-review-summary="${product.id}" aria-label="${safe(reviewSummaryLabel(product))}">${reviewSummaryMarkup(product.review_summary)}</button>`;
}
function updateReviewSummary(id, summary) {
  const product = byId.get(id);
  if (!product) return;
  product.review_summary = { rating_count: summary.rating_count, review_count: summary.review_count, average: summary.average };
  document.querySelectorAll(`[data-review-summary="${id}"]`).forEach(button => {
    button.innerHTML = reviewSummaryMarkup(product.review_summary);
    button.setAttribute("aria-label", reviewSummaryLabel(product));
  });
}
function openReviews(id, fallback = null) {
  const product = byId.get(id) || fallback || reviewProducts.get(id);
  if (!product) { showToast("Это блюдо пока недоступно в меню"); return; }
  reviewProducts.set(id, product);
  reviewUI.open(product);
  document.body.classList.add("modal-open");
  telegram?.BackButton?.show?.();
}

function openProduct(id) {
  const product = byId.get(id);
  if (!product) return;
  selectedProduct = product;
  selectedOptions = new Set();
  quantity = 1;
  halfPortion = false;
  xlPortion = false;
  const groups = optionGroupsFor(product);
  productDialog.innerHTML = `
    <div class="sheet-layout">
      <div class="sheet-header"><strong>Состав блюда</strong><button type="button" class="icon-button" data-action="close" aria-label="Закрыть"><span class="icon icon-x" aria-hidden="true"></span></button></div>
      <div class="sheet-scroll">
        <div class="sheet-photo" role="img" aria-label="${safe(product.name)}" ${photoStyle(product.image_url || product.image)}></div>
        <h2 class="sheet-title">${safe(product.name)}</h2>
        <p class="sheet-weight" id="detail-weight">${safe(product.weight)}</p>
        ${reviewSummaryButton(product, "product-rating-top")}
        <p class="sheet-description">${safe(product.description)}</p>
        ${product.id === 30 ? `
          <div class="section-heading"><h2>Порция</h2></div>
          <div class="portion-control" role="group" aria-label="Порция курицы">
            <button type="button" data-action="portion" data-half="false" aria-pressed="true">Целая</button>
            <button type="button" data-action="portion" data-half="true" aria-pressed="false">Половина</button>
          </div>
          <p class="portion-price" id="portion-price">Целая · ${currency(product.price)}</p>` : ""}
        ${product.id === 34 ? `
          <div class="section-heading"><h2>Размер</h2></div>
          <div class="portion-control" role="group" aria-label="Размер шавермы">
            <button type="button" data-action="size" data-xl="false" aria-pressed="true">Стандарт · 350 г</button>
            <button type="button" data-action="size" data-xl="true" aria-pressed="false">XL · 500 г</button>
          </div>
          <p class="portion-price" id="size-price">Стандарт · ${currency(product.price)}</p>` : ""}
        ${groups.map(group => `
          <div class="section-heading"><h2>${safe(group.title)}</h2><span>Выберите до ${group.limit}</span></div>
          <div class="option-list">${group.options.map(option => `
            <button type="button" class="option-row" data-action="option" data-option="${option[0]}" aria-pressed="false">
              <span><span class="option-name">${safe(option[1])}</span><span class="option-price">${optionPrice(option)}</span></span>
              <span class="option-check"><span class="icon icon-check" aria-hidden="true"></span></span>
            </button>`).join("")}</div>`).join("")}
      </div>
      <div class="sheet-footer">
        <div class="quantity-stepper" aria-label="Количество">
          <button type="button" data-action="decrease" aria-label="Уменьшить количество" disabled><span class="icon icon-minus" aria-hidden="true"></span></button>
          <span id="detail-quantity">1</span>
          <button type="button" data-action="increase" aria-label="Увеличить количество"><span class="icon icon-plus" aria-hidden="true"></span></button>
        </div>
        <button type="button" class="primary-button" data-action="add" id="detail-add">Добавить · ${currency(selectedPrice())}</button>
      </div>
    </div>`;
  productDialog.showModal();
  telegram?.BackButton?.show?.();
  document.body.classList.add("modal-open");

}

function updateProductTotal() {
  $("#detail-quantity").textContent = quantity;
  productDialog.querySelector('[data-action="decrease"]').disabled = quantity === 1;
  $("#detail-add").textContent = `Добавить · ${currency(selectedPrice() * quantity)}`;
  if (selectedProduct.id === 30) {
    $("#detail-weight").textContent = halfPortion ? "1/2 шт." : "1 шт.";
    $("#portion-price").textContent = `${halfPortion ? "Половина" : "Целая"} · ${currency(basePrice())}`;
    productDialog.querySelectorAll('[data-action="portion"]').forEach(button => {
      button.setAttribute("aria-pressed", String((button.dataset.half === "true") === halfPortion));
    });
  }
  if (selectedProduct.id === 34) {
    $("#detail-weight").textContent = portionWeight(selectedProduct, false, xlPortion);
    $("#size-price").textContent = `${xlPortion ? "XL" : "Стандарт"} · ${currency(basePrice())}`;
    productDialog.querySelectorAll('[data-action="size"]').forEach(button => {
      button.setAttribute("aria-pressed", String((button.dataset.xl === "true") === xlPortion));
    });
  }
}

function lineOptions(line) {
  return optionsFor(byId.get(line.itemId)).filter(option => line.optionIds.includes(option[0]));
}
function linePrice(line) {
  const product = byId.get(line.itemId);
  return unitBasePrice(product, line.half, line.xl) + lineOptions(line).reduce((sum, option) => sum + option[2], 0);
}
function cartCount() { return cart.reduce((sum, line) => sum + line.count, 0); }
function cartTotal() { return cart.reduce((sum, line) => sum + linePrice(line) * line.count, 0); }

function renderCartButton() {
  const count = cartCount();
  $("#cart-bar").hidden = count === 0;
  $("#header-cart-count").hidden = count === 0;
  $("#header-cart-count").textContent = count;
  $("#cart-bar-count").textContent = `Корзина · ${count}`;
  $("#cart-bar-total").textContent = currency(cartTotal());
}

function addToCart() {
  const optionIds = [...selectedOptions].sort((a, b) => a - b);
  const existing = cart.find(line => line.itemId === selectedProduct.id && line.half === halfPortion && line.xl === xlPortion &&
    JSON.stringify(line.optionIds) === JSON.stringify(optionIds));
  if (existing) existing.count = Math.min(99, existing.count + quantity);
  else cart.push({ itemId: selectedProduct.id, optionIds, half: halfPortion, xl: xlPortion, count: quantity });
  saveCart();
  productDialog.close();
  telegram?.HapticFeedback?.impactOccurred?.("light");
  showToast("Добавлено в корзину");
}

let mealBuilder = {close() {}};
// Keep the standard menu usable if the optional prototype cannot load.
if (builderDialog && $("#builder-entry")) void import("./builder.js?v=20261010-button-polish").then(({createMealBuilder}) => {
  mealBuilder = createMealBuilder({
  dialog: builderDialog, entry: $("#builder-entry"), getProducts: () => products,
  telegram, toast: showToast,
  onOrder: line => {
    const existing = cart.find(item => item.itemId === line.itemId && item.half === line.half && item.xl === line.xl &&
      JSON.stringify(item.optionIds) === JSON.stringify(line.optionIds));
    if (existing) existing.count = Math.min(99, existing.count + 1);
    else cart.push(line);
    saveCart(); openCart();
    telegram?.HapticFeedback?.impactOccurred?.("light");
  }
  });
}).catch(() => { $("#builder-entry").hidden = true; });

function showToast(message) {
  const toast = $("#toast");
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add("visible");
  toastTimer = setTimeout(() => toast.classList.remove("visible"), 2200);
}

function renderCart() {
  const hasItems = cart.length > 0;
  cartDialog.innerHTML = `
    <div class="sheet-layout">
      <div class="sheet-header"><strong>Корзина</strong>${hasItems ? `<button type="button" class="cart-clear" data-action="clear" aria-label="Очистить корзину"><span class="icon icon-trash" aria-hidden="true"></span></button>` : ""}<button type="button" class="icon-button" data-action="close" aria-label="Закрыть"><span class="icon icon-x" aria-hidden="true"></span></button></div>
      <div class="sheet-scroll">
        ${hasItems ? cart.map((line, index) => {
          const product = byId.get(line.itemId);
          const options = lineOptions(line);
          return `<div class="cart-line">
            <div class="cart-line-top">
              <div class="cart-line-photo" role="img" aria-label="${safe(product.name)}" ${photoStyle(product.image_url || product.image)}></div>
              <div class="cart-line-copy"><p class="cart-line-name">${safe(product.name)}${portionSuffix(line)}</p><p class="cart-line-meta">${safe(portionWeight(product, line.half, line.xl))} · ${currency(linePrice(line))}/шт.</p>${options.length ? `<p class="cart-line-options">${options.map(option => `${option[2] ? "+ " : ""}${safe(option[1])}`).join(" · ")}</p>` : ""}</div>
              <span class="cart-line-total">${currency(linePrice(line) * line.count)}</span>
            </div>
            <div class="cart-line-actions"><button type="button" data-action="line-decrease" data-index="${index}" aria-label="Уменьшить количество ${safe(product.name)}"><span class="icon icon-minus" aria-hidden="true"></span></button><strong>${line.count}</strong><button type="button" data-action="line-increase" data-index="${index}" aria-label="Увеличить количество ${safe(product.name)}"><span class="icon icon-plus" aria-hidden="true"></span></button></div>
          </div>`;
        }).join("") + `<p class="cart-note">${account.token ? "Демо-заказ сохранится в общей истории аккаунта. " : "Для сохранения в истории войдите в аккаунт. "}Оплата и отправка в ресторан не выполняются.${account.me?.discount_balance ? ` Доступная скидка: ${currency(account.me.discount_balance)}.` : ""}</p>` : `<div class="cart-empty"><span class="icon icon-bag" aria-hidden="true"></span><strong>Корзина пуста</strong><span>Выберите блюда из меню</span></div>`}
      </div>
      ${hasItems ? `<div class="sheet-footer"><div class="cart-summary"><small>Итого</small><strong>${currency(cartTotal())}</strong></div><button type="button" class="primary-button" data-action="checkout">${account.token ? "Оформить демо-заказ" : "Войти и сохранить демо-заказ"}</button></div>` : ""}
    </div>`;
}

function openCart() {
  renderCart();
  cartDialog.showModal();
  document.body.classList.add("modal-open");
  telegram?.BackButton?.show?.();
}

async function checkout() {
  const checkoutButton = cartDialog.querySelector('[data-action="checkout"]');
  if (checkoutButton?.disabled) return;
  if (checkoutButton) checkoutButton.disabled = true;
  if (!account.token) {
    showToast("Войдите в аккаунт, чтобы сохранить заказ в истории");
    if (checkoutButton) checkoutButton.disabled = false;
    cartDialog.close();
    void openAccount();
    return;
  }
  let number = String(Math.floor(80000 + Math.random() * 10000));
  if (account.token) {
    try {
      const items = cart.map(line => ({
        item_id: line.itemId,
        name: `${byId.get(line.itemId).name}${portionSuffix(line)}`,
        count: line.count,
        unit_price: linePrice(line),
        options: lineOptions(line).map(option => option[1]),
        option_ids: line.optionIds,
        variant: line.half ? "half" : line.xl ? "xl" : null
      }));
      clearTimeout(cartSaveTimer);
      await cartRequest.catch(()=>{});
      checkoutRequestId ||= crypto.randomUUID();
      try {localStorage.setItem("sharimzharim-checkout-id",checkoutRequestId);}catch{}
      const order = await account.saveDemoOrder(items, checkoutRequestId);
      number = order.id.slice(0, 8).toUpperCase();
    } catch {
      showToast("Не удалось сохранить демо-заказ");
      if (checkoutButton) checkoutButton.disabled = false;
      return;
    }
  }
  cart = [];
  saveCart();
  cartDialog.innerHTML = `<div class="sheet-layout">
    <div class="sheet-header"><strong>Демо-заказ</strong><button type="button" class="icon-button" data-action="close" aria-label="Закрыть"><span class="icon icon-x" aria-hidden="true"></span></button></div>
    <div class="sheet-scroll"><div class="order-confirmation"><span class="icon icon-check" aria-hidden="true"></span><h2>Демо-заказ №${number}</h2><p>${account.token ? "Он сохранён в истории аккаунта. " : ""}Ресторан не получил заказ, оплата не списана, купоны не использованы.</p><button type="button" class="primary-button" data-action="close">Вернуться в меню</button></div></div>
  </div>`;
  telegram?.HapticFeedback?.notificationOccurred?.("success");
}

categoryList.addEventListener("click", event => {
  const button = event.target.closest("[data-category]");
  if (!button) return;
  if (search.value) {
    search.value = "";
    renderProducts();
  }
  setActiveCategory(button.dataset.category);
  const section = $("#menu-section-" + categories.indexOf(button.dataset.category));
  window.scrollTo({
    top: window.scrollY + section.getBoundingClientRect().top - appHeader.offsetHeight - 12,
    behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth"
  });
});
search.addEventListener("input", () => {
  renderProducts();
  if (search.value.trim()) setActiveCategory(null);
  else syncActiveCategory();
  window.scrollTo({ top: 0, behavior: "auto" });
});
let scrollPending = false;
window.addEventListener("scroll", () => {
  if (scrollPending) return;
  scrollPending = true;
  requestAnimationFrame(() => {
    syncActiveCategory();
    scrollPending = false;
  });
}, { passive: true });
menuSections.addEventListener("click", event => {
  const button = event.target.closest("[data-open], [data-open-reviews]");
  if (button?.dataset.openReviews) openReviews(Number(button.dataset.openReviews));
  else if (button) openProduct(Number(button.dataset.open));
});
$("#header-cart").addEventListener("click", openCart);
$("#cart-bar").addEventListener("click", openCart);
function closeGame() {
  if (gameView.hidden) return;
  gameView.hidden = true;
  gameFrame.src = "about:blank";
  document.body.classList.remove("game-open");
  telegram?.BackButton?.hide?.();
  refreshAccountAfterReturn();
  gamePromo.focus();
}

gamePromo.addEventListener("click", event => {
  event.preventDefault();
  const ticket = account.takeHandoff();
  if (!ticket) {
    showToast(telegram?.initData ? "Подключаем аккаунт. Нажмите ещё раз" : "Откройте меню через Telegram, чтобы получить скидку");
    return;
  }
  const url = new URL(gamePromo.href);
  url.hash = new URLSearchParams({ handoff: ticket }).toString();
  clearTimeout(toastTimer);
  $("#toast").classList.remove("visible");
  gameFrame.src = url.href;
  gameView.hidden = false;
  document.body.classList.add("game-open");
  telegram?.BackButton?.show?.();
  $("#game-back").focus();
});
$("#game-back").addEventListener("click", closeGame);
telegram?.BackButton?.onClick?.(() => {
  if (builderDialog?.open) mealBuilder.close();
  else if (reviewsDialog.open) reviewUI.close();
  else if (cartDialog.open) cartDialog.close();
  else if (productDialog.open) productDialog.close();
  else if (accountDialog.open) accountDialog.close();
  else closeGame();
});
window.addEventListener("message", event => {
  if (event.source !== gameFrame.contentWindow || event.origin !== location.origin) return;
  if (event.data?.type === "sharim:close-game") closeGame();
  if (event.data?.type === "sharim:game-finished") refreshAccountAfterReturn();
});

productDialog.addEventListener("click", event => {
  const button = event.target.closest("[data-action], [data-open-reviews]");
  if (!button) return;
  if (button.dataset.openReviews) { openReviews(Number(button.dataset.openReviews)); return; }
  switch (button.dataset.action) {
    case "close": productDialog.close(); break;
    case "portion": halfPortion = button.dataset.half === "true"; updateProductTotal(); break;
    case "size": xlPortion = button.dataset.xl === "true"; updateProductTotal(); break;
    case "option": {
      const id = Number(button.dataset.option);
      const group = optionGroupsFor(selectedProduct).find(group => group.options.some(option => option[0] === id));
      if (!group) break;
      if (selectedOptions.has(id)) selectedOptions.delete(id);
      else if (group.options.filter(option => selectedOptions.has(option[0])).length < group.limit) selectedOptions.add(id);
      button.setAttribute("aria-pressed", String(selectedOptions.has(id)));
      updateProductTotal();
      break;
    }
    case "decrease": quantity = Math.max(1, quantity - 1); updateProductTotal(); break;
    case "increase": quantity = Math.min(99, quantity + 1); updateProductTotal(); break;
    case "add": addToCart(); break;
  }
});

cartDialog.addEventListener("click", event => {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  switch (button.dataset.action) {
    case "close": cartDialog.close(); break;
    case "clear": cart = []; saveCart(); renderCart(); break;
    case "line-decrease": {
      const index = Number(button.dataset.index);
      cart[index].count -= 1;
      if (cart[index].count < 1) cart.splice(index, 1);
      saveCart(); renderCart();
      break;
    }
    case "line-increase": {
      const index = Number(button.dataset.index);
      cart[index].count = Math.min(99, cart[index].count + 1);
      saveCart(); renderCart();
      break;
    }
    case "checkout": void checkout(); break;
  }
});

function updateAccountLink() {
  $("#account-link-label").textContent = account.me
    ? `${account.me.login || account.me.name} · скидки ${currency(account.me.discount_balance || 0)}`
    : "Личный кабинет";
}

let accountRenderSeq = 0;
async function afterSignIn() {
  updateAccountLink();
  await restoreServerCart();
  if (!accountDialog.open) return;
  if (reviewProductAfterLogin) {
    const productId = reviewProductAfterLogin;
    reviewProductAfterLogin = null;
    accountDialog.close();
    openReviews(productId);
  } else await openAccount();
}

const accountAuth = createAccountAuth({
  dialog: accountDialog, account, onSignedIn: afterSignIn,
  onRefresh: () => { updateAccountLink(); if (accountDialog.open) return openAccount(); },
  onLinked: async () => {
    try { localStorage.setItem("sharimzharim-cart-owner", String(account.me.customer_id)); } catch {}
    await afterSignIn();
    showToast("Telegram привязан");
  }
});

function renderOrder(order) {
  const items = Array.isArray(order.items) ? order.items : [];
  const purchased = order.status === "completed";
  const statusText = {demo:"тестовый заказ",pending:"ожидает оплаты",paid:"оплачен",completed:"получен",cancelled:"отменён",refunded:"возврат"}[order.status] || "в обработке";
  return `<details class="account-order">
    <summary><span>№${safe(order.id.slice(0, 8).toUpperCase())}<small>${safe(new Date(order.created_at).toLocaleDateString("ru-RU"))} · ${statusText}</small></span><strong>${currency(order.total)}</strong></summary>
    <div class="account-order-items">${items.map(item => `<div><span>${safe(item.name)} × ${Number(item.count) || 0}${item.options?.length ? `<small>${safe(item.options.join(", "))}</small>` : ""}${purchased ? `<button type="button" class="review-login" data-open-review="${Number(item.item_id)}" data-review-name="${safe(item.name)}">Оценить блюдо</button>` : ""}</span><strong>${currency((Number(item.unit_price) || 0) * (Number(item.count) || 0))}</strong></div>`).join("")}</div>
  </details>`;
}

async function openAccount() {
  const seq = ++accountRenderSeq;
  accountDialog.innerHTML = `<div class="sheet-layout"><div class="sheet-header"><strong>Мой аккаунт</strong><button type="button" class="icon-button" data-action="close" aria-label="Закрыть"><span class="icon icon-x" aria-hidden="true"></span></button></div><div class="sheet-scroll"><p class="account-empty">Загрузка...</p></div></div>`;
  if (!accountDialog.open) accountDialog.showModal();
  document.body.classList.add("modal-open");
  telegram?.BackButton?.show?.();
  await accountReady;
  if (seq !== accountRenderSeq || !accountDialog.open) return;
  if (!account.token) {
    accountAuth.showSignIn();
    return;
  }
  try {
    const [me, orders, reviews] = await Promise.all([account.refresh(), account.orders(), account.myReviews()]);
    if (seq !== accountRenderSeq || !accountDialog.open) return;
    updateAccountLink();
    accountDialog.querySelector(".sheet-scroll").innerHTML = `
      <div class="account-identity"><strong>${safe(me.login || me.name)}</strong></div>
      <div class="account-stats"><div><small>Доступная скидка</small><strong>${currency(me.discount_balance || 0)}</strong></div><div><small>Сумма демо-заказов</small><strong>${currency(me.demo_order_total || 0)}</strong></div></div>
      <section class="account-section account-access"><h2>Telegram</h2>${me.telegram_linked
        ? `<p class="account-auth-hint">${me.telegram_username ? `@${safe(me.telegram_username)} · ` : ""}Подключён</p>`
        : '<div id="telegram-link-panel"></div>'}</section>
      ${!me.login ? '<section class="account-section account-access"><h2>Вход по логину</h2><div id="site-credentials-panel"><button type="button" class="account-auth-secondary" data-auth-action="credentials-open">Добавить логин и пароль</button></div></section>' : ""}
      <section class="account-section"><h2>Купоны</h2>${me.coupons?.filter(c => !c.redeemed).length
        ? me.coupons.filter(c => !c.redeemed).map(c => `<div class="account-entry"><span>${safe(c.code)}</span><span>${currency(c.value)}</span></div>`).join("")
        : `<p class="account-empty">Пока нет купонов</p>`}</section>
      <section class="account-section"><h2>Мои заказы</h2>${orders.length
        ? orders.map(renderOrder).join("") + (orders.length === 50 ? `<p class="account-empty">Показаны последние 50 заказов</p>` : "")
        : `<p class="account-empty">История пока пуста</p>`}</section>
      <section class="account-section"><h2>Мои отзывы</h2>${reviews.length
        ? reviews.map(review => `<button type="button" class="account-review-link" data-open-review="${Number(review.product_id)}"><span>${safe(byId.get(review.product_id)?.name || "Блюдо")}<small>${stars(review.rating)}</small></span><span class="icon icon-promo-arrow" aria-hidden="true"></span></button>`).join("")
        : `<p class="account-empty">Отзывов ещё нет</p>`}</section>
      ${telegram?.initData ? "" : `<button type="button" class="account-logout" data-action="logout">Выйти из аккаунта</button>`}`;
    accountAuth.renderLink();
  } catch {
    if (seq === accountRenderSeq && accountDialog.open) accountDialog.querySelector(".sheet-scroll").innerHTML = `<p class="account-empty">Не удалось загрузить аккаунт.</p><button type="button" class="primary-button" data-action="retry-auth">Повторить</button>`;
  }
}

$("#account-link").addEventListener("click", () => void openAccount());
accountDialog.addEventListener("click", event => {
  const button = event.target.closest("[data-action], [data-open-review]");
  if (!button) return;
  if (button.dataset.openReview) {
    accountDialog.close();
    openReviews(Number(button.dataset.openReview), {id:Number(button.dataset.openReview),name:button.dataset.reviewName || "Блюдо из заказа"});
    return;
  }
  switch (button.dataset.action) {
    case "close": accountDialog.close(); break;
    case "retry-auth": void account.connect().then(() => openAccount()); break;
    case "logout":
      accountAuth.stop();
      void account.signOut().catch(() => {}).finally(() => {
        cart=[]; saveCart();
        try { localStorage.removeItem("sharimzharim-cart-owner"); } catch {}
        updateAccountLink(); if (accountDialog.open) void openAccount();
      });
      break;
  }
});

for (const dialog of [productDialog, reviewsDialog, cartDialog, accountDialog, builderDialog].filter(Boolean)) {
  dialog.addEventListener("close", () => {
    if (![productDialog, reviewsDialog, cartDialog, accountDialog, builderDialog].some(d => d?.open)) {
      document.body.classList.remove("modal-open");
      if (gameView.hidden) telegram?.BackButton?.hide?.();
    }
  });
}

const accountReady = account.connect().then(updateAccountLink);
const reviewUI = createReviews({
  dialog: reviewsDialog, account, accountReady,
  onSummary: updateReviewSummary,
  onLogin: id => {
    reviewProductAfterLogin = id;
    reviewUI.close();
    void openAccount();
  },
  onAccount: () => { reviewUI.close(); void openAccount(); }
});
reviewsDialog.addEventListener("close", () => {
  if (gameView.hidden && !document.querySelector("dialog[open]")) telegram?.BackButton?.hide?.();
});
accountDialog.addEventListener("close", () => {
  if (!reviewProductAfterLogin) return;
  const id = reviewProductAfterLogin;
  reviewProductAfterLogin = null;
  openReviews(id);
});
setInterval(() => { if (account.token) void account.prepareHandoff(); }, 4 * 60_000);
function refreshAccountAfterReturn() {
  if (account.token) void account.refresh().then(updateAccountLink).catch(() => {});
  void accountAuth.poll();
}
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) refreshAccountAfterReturn();
});
window.addEventListener("focus", refreshAccountAfterReturn);
telegram?.onEvent?.("activated", refreshAccountAfterReturn);

async function restoreServerCart() {
  if (!account.token || !catalogReady) return;
  try {
    const owner=localStorage.getItem("sharimzharim-cart-owner");
    if(owner && owner!==String(account.me.customer_id)) {cart=[];checkoutRequestId=null;localStorage.removeItem("sharimzharim-checkout-id");}
    localStorage.setItem("sharimzharim-cart-owner",String(account.me.customer_id));
  }catch{}
  if (cart.length) {queueCartSave(); return;}
  try {
    const saved=await account.request("/cart");
    cart=saved.items.filter(line=>byId.has(line.item_id)).map(line=>({itemId:line.item_id,count:line.count,
      optionIds:line.option_ids||[],half:line.variant==="half",xl:line.variant==="xl"}));
    // Persist without re-writing the server just because this page was opened.
    try {localStorage.setItem("sharimzharim-cart",JSON.stringify(cart));}catch{}
    renderCartButton();
  } catch {showToast("Не удалось загрузить сохранённую корзину");}
}

async function loadCatalog(restore = true) {
  try {
    const response=await fetch(`${API_BASE}/catalog`,{cache:"no-store"});
    if(!response.ok)throw new Error("catalog");
    const data=await response.json();
    products=data.products;
    const labels=p=>p.category==="На булке" ? "Бургеры" : p.category;
    const ordinaryProducts=products.filter(p=>!p.builder_kind);
    categories=[...new Set(["Шаверма","Бургеры","В листьях","Курица","Фритюр","Закуски",...ordinaryProducts.map(labels)])]
      .filter(c=>ordinaryProducts.some(p=>labels(p)===c));
    byId.clear();products.forEach(p=>byId.set(p.id,p));
    catalogReady=true;cart=loadCart();
    renderCategories();renderProducts();renderCartButton();syncActiveCategory();
    await accountReady;
    if(restore)await restoreServerCart();
  }catch{
    catalogReady=false;products=[];byId.clear();
    menuSections.innerHTML='<p class="empty-search">Общее меню временно недоступно. <button type="button" id="retry-catalog">Повторить загрузку</button></p>';
    document.getElementById("retry-catalog").addEventListener("click",()=>void loadCatalog());
  }
}
void loadCatalog();
setInterval(()=>{if(!document.hidden&&!productDialog.open&&!reviewsDialog.open&&!cartDialog.open&&!builderDialog?.open)void loadCatalog(false);},60000);
