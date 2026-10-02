import { categories, popularIds, products, optionGroupsFor, optionsFor, imageFor } from "./menu-data.js";

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
const cartDialog = $("#cart-dialog");
const gamePromo = $("#game-promo");
let category = "Хиты";
let cart = loadCart();
let selectedProduct = null;
let selectedOptions = new Set();
let quantity = 1;
let halfPortion = false;
let xlPortion = false;
let toastTimer;

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
  try { localStorage.setItem("sharimzharim-cart", JSON.stringify(cart)); } catch { /* private browsing */ }
  renderCartButton();
}

function photoStyle(index) {
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
        <span class="product-photo" ${photoStyle(product.image)}></span>
      </button>
      <div class="product-name">${safe(product.name)}</div>
      <p class="product-weight">${safe(product.weight)}</p>
      <div class="product-bottom">
        <span class="product-price">${product.id === 30 ? "от " + currency(690) : currency(product.price)}</span>
        <button type="button" class="product-add" data-open="${product.id}" aria-label="Настроить ${safe(product.name)}"><span class="icon icon-plus" aria-hidden="true"></span></button>
      </div>
    </article>`).join("");
}

function renderProducts() {
  const query = search.value.trim().toLocaleLowerCase("ru-RU");
  if (query) {
    const matches = products.filter(product =>
      `${product.name} ${product.description}`.toLocaleLowerCase("ru-RU").includes(query));
    menuSections.innerHTML = `<section class="menu-section" aria-labelledby="search-results-title">
      <h1 id="search-results-title">Результаты поиска</h1>
      <div class="product-grid">${matches.length ? renderProductCards(matches) : '<p class="empty-search">По вашему запросу ничего не найдено</p>'}</div>
    </section>`;
    return;
  }
  menuSections.innerHTML = categories.map((name, index) => {
    const items = name === "Хиты"
      ? products.filter(product => popularIds.has(product.id))
      : products.filter(product => product.category === name);
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
  if (product.id === 30 && half) return 690;
  if (product.id === 34 && xl) return product.price + 180;
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
        <div class="sheet-photo" role="img" aria-label="${safe(product.name)}" ${photoStyle(product.image)}></div>
        <h2 class="sheet-title">${safe(product.name)}</h2>
        <p class="sheet-weight" id="detail-weight">${safe(product.weight)}</p>
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
              <div class="cart-line-photo" role="img" aria-label="${safe(product.name)}" ${photoStyle(product.image)}></div>
              <div class="cart-line-copy"><p class="cart-line-name">${safe(product.name)}${portionSuffix(line)}</p><p class="cart-line-meta">${safe(portionWeight(product, line.half, line.xl))} · ${currency(linePrice(line))}/шт.</p>${options.length ? `<p class="cart-line-options">${options.map(option => `${option[2] ? "+ " : ""}${safe(option[1])}`).join(" · ")}</p>` : ""}</div>
              <span class="cart-line-total">${currency(linePrice(line) * line.count)}</span>
            </div>
            <div class="cart-line-actions"><button type="button" data-action="line-decrease" data-index="${index}" aria-label="Уменьшить количество ${safe(product.name)}"><span class="icon icon-minus" aria-hidden="true"></span></button><strong>${line.count}</strong><button type="button" data-action="line-increase" data-index="${index}" aria-label="Увеличить количество ${safe(product.name)}"><span class="icon icon-plus" aria-hidden="true"></span></button></div>
          </div>`;
        }).join("") + `<p class="cart-note">Демо-заказ сохраняется только на этом устройстве. Оплата и отправка в ресторан не выполняются.</p>` : `<div class="cart-empty"><span class="icon icon-bag" aria-hidden="true"></span><strong>Корзина пуста</strong><span>Выберите блюда из меню</span></div>`}
      </div>
      ${hasItems ? `<div class="sheet-footer"><div class="cart-summary"><small>Итого</small><strong>${currency(cartTotal())}</strong></div><button type="button" class="primary-button" data-action="checkout">Оформить демо-заказ</button></div>` : ""}
    </div>`;
}

function openCart() {
  renderCart();
  cartDialog.showModal();
  document.body.classList.add("modal-open");
}

function checkout() {
  const number = Math.floor(80000 + Math.random() * 10000);
  cart = [];
  saveCart();
  cartDialog.innerHTML = `<div class="sheet-layout">
    <div class="sheet-header"><strong>Демо-заказ</strong><button type="button" class="icon-button" data-action="close" aria-label="Закрыть"><span class="icon icon-x" aria-hidden="true"></span></button></div>
    <div class="sheet-scroll"><div class="order-confirmation"><span class="icon icon-check" aria-hidden="true"></span><h2>Заказ №${number}</h2><p>Это демонстрация оформления. Ресторан не получил заказ, оплата не списана.</p><button type="button" class="primary-button" data-action="close">Вернуться в меню</button></div></div>
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
  const button = event.target.closest("[data-open]");
  if (button) openProduct(Number(button.dataset.open));
});
$("#header-cart").addEventListener("click", openCart);
$("#cart-bar").addEventListener("click", openCart);
gamePromo.addEventListener("click", event => {
  if (!telegram?.openLink) return;
  event.preventDefault();
  telegram.openLink(gamePromo.href);
});

productDialog.addEventListener("click", event => {
  const button = event.target.closest("[data-action]");
  if (!button) return;
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
    case "checkout": checkout(); break;
  }
});

for (const dialog of [productDialog, cartDialog]) {
  dialog.addEventListener("close", () => {
    if (!productDialog.open && !cartDialog.open) document.body.classList.remove("modal-open");
  });
}

renderCategories();
renderProducts();
renderCartButton();
syncActiveCategory();
