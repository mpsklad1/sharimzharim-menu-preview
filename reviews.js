const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, character => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
})[character]);

const countLabel = (count, forms) => {
  const value = Math.max(0, Number(count) || 0);
  const last = value % 10;
  const lastTwo = value % 100;
  const word = lastTwo >= 11 && lastTwo <= 14 ? forms[2] : last === 1 ? forms[0] : last >= 2 && last <= 4 ? forms[1] : forms[2];
  return `${new Intl.NumberFormat("ru-RU").format(value)} ${word}`;
};
const ratingLabel = count => countLabel(count, ["оценка", "оценки", "оценок"]);
const reviewLabel = count => countLabel(count, ["отзыв", "отзыва", "отзывов"]);
const averageLabel = value => Number(value).toFixed(1).replace(".", ",");
const ratingStars = value => {
  const rating = Math.max(0, Math.min(5, Number(value) || 0));
  return `<span class="reviews-stars" role="img" aria-label="${escapeHtml(rating)} из 5"><span aria-hidden="true">${"★".repeat(Math.round(rating))}${"☆".repeat(5 - Math.round(rating))}</span></span>`;
};

/** A separate native dialog keeps product customizations and their scroll position intact. */
export function createReviews({ dialog, account, accountReady, onSummary, onLogin, onAccount }) {
  let state = null;
  let sequence = 0;
  const drafts = new Map();

  dialog.classList.add("reviews-sheet");
  dialog.setAttribute("aria-labelledby", "reviews-title");

  const isCurrent = snapshot => state === snapshot && dialog.open;
  const region = name => dialog.querySelector(`[data-reviews-region="${name}"]`);
  const draftKey = productId => `${account.me?.customer_id ?? account.me?.id ?? account.token ?? "guest"}:${productId}`;
  const syncBodyLock = () => document.body.classList.toggle("modal-open", Boolean(document.querySelector("dialog[open]")));
  const persistDraft = () => {
    if (state?.draft && state.draftKey) drafts.set(state.draftKey, { ...state.draft });
  };

  function close() {
    persistDraft();
    if (dialog.open) dialog.close();
    syncBodyLock();
  }

  function renderSummary(snapshot) {
    const summary = snapshot.summary;
    const target = region("summary");
    if (!summary) {
      target.innerHTML = `<p class="reviews-muted" role="status">Загружаем оценки и отзывы…</p>`;
      return;
    }
    const hasRatings = Number(summary.rating_count) > 0 && Number.isFinite(Number(summary.average)) && summary.average !== null;
    target.innerHTML = `<div class="reviews-summary-number">
      <span class="reviews-summary-star" aria-hidden="true">${hasRatings ? "★" : "☆"}</span>
      ${hasRatings ? `<strong>${averageLabel(summary.average)}</strong><span class="reviews-out-of">из 5</span>` : `<strong class="reviews-no-rating">Пока нет оценок</strong>`}
      </div>
      <div class="reviews-summary-counts"><span>${ratingLabel(summary.rating_count)}</span><span aria-hidden="true">·</span><span>${reviewLabel(summary.review_count)}</span></div>
      <p class="reviews-trust"><span aria-hidden="true">✓</span> Оценки только после покупки</p>`;
  }

  function reviewMarkup(review) {
    const date = new Date(review.updated_at);
    const validDate = Number.isFinite(date.getTime());
    return `<article class="reviews-entry">
      <div class="reviews-entry-heading"><strong>${escapeHtml(review.author)}</strong>${ratingStars(review.rating)}</div>
      <div class="reviews-entry-meta">${validDate ? `<time datetime="${date.toISOString()}">${date.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}</time>` : ""}
      ${review.verified_purchase === true ? '<span class="reviews-verified">Покупка подтверждена</span>' : ""}</div>
      <p>${escapeHtml(review.body)}</p>
    </article>`;
  }

  function renderList(snapshot) {
    const list = region("list");
    list.innerHTML = snapshot.reviews.length
      ? snapshot.reviews.map(reviewMarkup).join("")
      : snapshot.summary ? `<div class="reviews-empty"><strong>Текстовых отзывов пока нет</strong><p>${Number(snapshot.summary.rating_count) > 0 ? "Покупатели уже поставили оценки. Здесь появятся их впечатления о блюде." : "Здесь появятся впечатления покупателей об этом блюде."}</p></div>` : "";
    renderListControls(snapshot);
  }

  function renderListControls(snapshot) {
    const controls = region("list-controls");
    if (snapshot.listError) {
      controls.innerHTML = `<p class="reviews-error" role="status">${snapshot.reviews.length ? "Не удалось загрузить следующие отзывы." : "Не удалось загрузить оценки и отзывы."}</p><button type="button" class="reviews-secondary" data-reviews-action="list-retry">Повторить</button>`;
    } else if (snapshot.listLoading) {
      controls.innerHTML = '<p class="reviews-muted" role="status">Загружаем отзывы…</p>';
    } else if (snapshot.nextCursor !== null && snapshot.nextCursor !== undefined && snapshot.nextCursor !== "") {
      controls.innerHTML = '<button type="button" class="reviews-secondary reviews-load-more" data-reviews-action="load-more">Показать ещё</button>';
    } else {
      controls.innerHTML = snapshot.reviews.length ? '<p class="reviews-list-end">Все текстовые отзывы загружены</p>' : "";
    }
  }

  async function loadPublic(snapshot, append = false) {
    if (!isCurrent(snapshot) || snapshot.listLoading) return;
    snapshot.listLoading = true;
    snapshot.listError = false;
    snapshot.failedAppend = append;
    renderListControls(snapshot);
    try {
      const data = await account.productReviews(snapshot.product.id, append ? snapshot.nextCursor : undefined);
      if (!isCurrent(snapshot)) return;
      snapshot.summary = data;
      const received = (Array.isArray(data.reviews) ? data.reviews : []).filter(review => String(review.body ?? "").trim());
      if (append) {
        const key = review => review.id ?? JSON.stringify([review.author, review.updated_at, review.rating, review.body]);
        const known = new Set(snapshot.reviews.map(key));
        snapshot.reviews.push(...received.filter(review => !known.has(key(review))));
      } else {
        snapshot.reviews = received;
      }
      snapshot.nextCursor = data.next_cursor ?? null;
      renderSummary(snapshot);
      renderList(snapshot);
      onSummary?.(snapshot.product.id, data);
    } catch {
      if (!isCurrent(snapshot)) return;
      snapshot.listError = true;
      if (!snapshot.summary) region("summary").innerHTML = '<p class="reviews-muted">Оценки временно недоступны</p>';
    } finally {
      if (isCurrent(snapshot)) {
        snapshot.listLoading = false;
        renderListControls(snapshot);
        if (snapshot.refreshAfterLoad) {
          snapshot.refreshAfterLoad = false;
          void loadPublic(snapshot);
        }
      }
    }
  }

  function editorMarkup(snapshot) {
    const draft = snapshot.draft;
    const selectedRating = Number(draft.rating) || 0;
    return `<form class="reviews-form" novalidate>
      <fieldset class="reviews-rating-field"><legend>Ваша оценка</legend>
        <div class="reviews-rating-options" role="radiogroup" aria-label="Оценка блюда" aria-describedby="reviews-rating-description">
          ${[1, 2, 3, 4, 5].map(value => `<label class="reviews-rating-option" data-filled="${value <= selectedRating}">
            <input type="radio" name="rating" value="${value}" aria-label="${value} из 5" ${value === selectedRating ? "checked" : ""}>
            <span aria-hidden="true">★</span>
          </label>`).join("")}
        </div>
        <p id="reviews-rating-description" class="reviews-field-help">${selectedRating ? `Выбрано ${selectedRating} из 5` : "Выберите от 1 до 5 звёзд"}</p>
      </fieldset>
      <label class="reviews-field">Имя в отзыве<input type="text" name="author" value="${escapeHtml(draft.author)}" minlength="2" maxlength="40" autocomplete="given-name" required></label>
      <label class="reviews-field">Впечатления о блюде <span class="reviews-optional">необязательно</span><textarea name="body" rows="4" maxlength="600" aria-describedby="reviews-body-help reviews-body-count" placeholder="Что понравилось? Что можно улучшить?">${escapeHtml(draft.body)}</textarea></label>
      <div class="reviews-field-footer"><span id="reviews-body-help">Можно отправить только оценку</span><span id="reviews-body-count">${[...draft.body].length}/600</span></div>
      <p class="reviews-form-status" role="status" aria-live="polite"></p>
      <div class="reviews-form-actions"><button type="submit" class="reviews-primary">${snapshot.mine?.review ? "Сохранить изменения" : "Опубликовать оценку"}</button><button type="button" class="reviews-text-button" data-reviews-action="cancel-edit">Отмена</button></div>
    </form>`;
  }

  function renderMine(snapshot) {
    const target = region("mine");
    switch (snapshot.mineStatus) {
      case "loading":
        target.innerHTML = '<p class="reviews-muted" role="status">Проверяем, можно ли оценить блюдо…</p>';
        break;
      case "guest":
        target.innerHTML = '<div class="reviews-eligibility"><strong>Оставить оценку можно после покупки</strong><p>Войдите в аккаунт, которым пользовались при заказе.</p><button type="button" class="reviews-secondary" data-reviews-action="login">Войти и проверить покупку</button></div>';
        break;
      case "error":
        target.innerHTML = '<div class="reviews-eligibility"><p class="reviews-error" role="status">Не удалось проверить покупку. Читать отзывы можно без входа.</p><button type="button" class="reviews-secondary" data-reviews-action="mine-retry">Повторить проверку</button></div>';
        break;
      case "blocked":
        target.innerHTML = '<div class="reviews-eligibility"><strong>Оцените после получения заказа</strong><p>Оценка доступна покупателям этого блюда. Демо-заказ не подтверждает покупку.</p><button type="button" class="reviews-text-button" data-reviews-action="account">Мои заказы</button></div>';
        break;
      case "eligible": {
        const review = snapshot.mine?.review;
        const notice = snapshot.saved ? `<p class="reviews-saved" role="status">${snapshot.saved}</p>` : "";
        target.innerHTML = `${notice}<div class="reviews-write-heading"><div><h3>${review ? "Ваша оценка" : "Вы пробовали это блюдо"}</h3><p>${review ? `${Number(review.rating)} из 5${review.body ? " · отзыв опубликован" : " · без текста"}` : "Поделитесь впечатлением — это поможет другим выбрать."}</p></div>${snapshot.editorOpen ? "" : `<button type="button" class="reviews-primary" data-reviews-action="edit">${review ? "Изменить оценку" : "Оценить блюдо"}</button>`}</div>${snapshot.editorOpen ? editorMarkup(snapshot) : ""}`;
        break;
      }
    }
  }

  async function loadMine(snapshot, retry = false) {
    const requestId = ++snapshot.mineRequest;
    snapshot.mineStatus = "loading";
    renderMine(snapshot);
    try {
      await (typeof accountReady === "function" ? accountReady() : accountReady);
      if (!isCurrent(snapshot) || requestId !== snapshot.mineRequest) return;
      if (retry && !account.token && account.error) {
        await account.connect();
        if (!isCurrent(snapshot) || requestId !== snapshot.mineRequest) return;
      }
      if (!account.token) {
        snapshot.mineStatus = account.error ? "error" : "guest";
        renderMine(snapshot);
        return;
      }
      const mine = await account.myProductReview(snapshot.product.id);
      if (!isCurrent(snapshot) || requestId !== snapshot.mineRequest) return;
      snapshot.mine = mine;
      snapshot.mineStatus = mine?.can_review === true ? "eligible" : "blocked";
      snapshot.draftKey = draftKey(snapshot.product.id);
      snapshot.draft = drafts.get(snapshot.draftKey) ?? {
        author: [...(mine?.review?.author || account.me?.name || "Гость")].slice(0, 40).join(""),
        rating: Number(mine?.review?.rating) || 0,
        body: String(mine?.review?.body ?? "")
      };
      renderMine(snapshot);
    } catch (error) {
      if (!isCurrent(snapshot) || requestId !== snapshot.mineRequest) return;
      snapshot.mineStatus = error.status === 401 ? "guest" : "error";
      renderMine(snapshot);
    }
  }

  function open(product) {
    persistDraft();
    const snapshot = {
      product, sequence: ++sequence, summary: null, reviews: [], nextCursor: null,
      listLoading: false, listError: false, failedAppend: false, refreshAfterLoad: false,
      mineStatus: "loading", mineRequest: 0, mine: null, editorOpen: false,
      draft: null, draftKey: null, saving: false, saved: ""
    };
    state = snapshot;
    dialog.innerHTML = `<div class="reviews-layout">
      <header class="reviews-header"><button type="button" class="reviews-back" data-reviews-action="close" aria-label="Вернуться назад"><span aria-hidden="true">←</span></button><div><h2 id="reviews-title">Оценки и отзывы</h2><p>${escapeHtml(product.name)}</p></div></header>
      <div class="reviews-scroll">
        <section class="reviews-summary" data-reviews-region="summary" aria-label="Общая оценка"></section>
        <section class="reviews-mine" data-reviews-region="mine" aria-label="Ваша оценка"></section>
        <section class="reviews-reader" aria-label="Отзывы покупателей"><h3>Впечатления покупателей</h3><div data-reviews-region="list"></div><div class="reviews-list-controls" data-reviews-region="list-controls"></div></section>
      </div>
    </div>`;
    renderSummary(snapshot);
    if (!dialog.open) dialog.showModal();
    syncBodyLock();
    dialog.querySelector(".reviews-scroll").scrollTop = 0;
    void loadPublic(snapshot);
    void loadMine(snapshot);
  }

  function readDraft(form) {
    const values = new FormData(form);
    return { author: String(values.get("author") ?? ""), rating: Number(values.get("rating")) || 0, body: String(values.get("body") ?? "") };
  }

  dialog.addEventListener("input", event => {
    const form = event.target.closest(".reviews-form");
    if (!form || !state) return;
    state.draft = readDraft(form);
    persistDraft();
    form.querySelectorAll(".reviews-rating-option").forEach(label => {
      label.dataset.filled = String(Number(label.querySelector("input").value) <= state.draft.rating);
    });
    form.querySelector("#reviews-rating-description").textContent = state.draft.rating ? `Выбрано ${state.draft.rating} из 5` : "Выберите от 1 до 5 звёзд";
    form.querySelector("#reviews-body-count").textContent = `${[...state.draft.body].length}/600`;
  });

  dialog.addEventListener("keydown", event => {
    if (!event.target.matches('input[name="rating"]') || !["Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const radios = [...dialog.querySelectorAll('input[name="rating"]')];
    const radio = event.key === "Home" ? radios[0] : radios.at(-1);
    radio.checked = true;
    radio.focus();
    radio.dispatchEvent(new Event("input", { bubbles: true }));
  });

  dialog.addEventListener("click", event => {
    const button = event.target.closest("[data-reviews-action]");
    if (!button || !state) return;
    const snapshot = state;
    switch (button.dataset.reviewsAction) {
      case "close": close(); break;
      case "load-more": void loadPublic(snapshot, true); break;
      case "list-retry": void loadPublic(snapshot, snapshot.failedAppend); break;
      case "mine-retry": void loadMine(snapshot, true); break;
      case "login": close(); onLogin?.(snapshot.product.id); break;
      case "account": close(); onAccount?.(); break;
      case "edit":
        snapshot.editorOpen = true;
        snapshot.saved = "";
        renderMine(snapshot);
        dialog.querySelector('input[name="rating"]:checked, input[name="rating"]')?.focus({ preventScroll: true });
        region("mine").scrollIntoView({ block: "nearest", behavior: "auto" });
        break;
      case "cancel-edit":
        persistDraft();
        snapshot.editorOpen = false;
        renderMine(snapshot);
        dialog.querySelector('[data-reviews-action="edit"]')?.focus({ preventScroll: true });
        break;
    }
  });

  dialog.addEventListener("submit", async event => {
    const form = event.target;
    if (!form.matches(".reviews-form") || !state) return;
    event.preventDefault();
    const snapshot = state;
    if (snapshot.saving || snapshot.mine?.can_review !== true) return;
    snapshot.draft = readDraft(form);
    persistDraft();
    const payload = { ...snapshot.draft, author: snapshot.draft.author.trim(), body: snapshot.draft.body.trim() };
    const status = form.querySelector(".reviews-form-status");
    if (!Number.isInteger(payload.rating) || payload.rating < 1 || payload.rating > 5) {
      status.textContent = "Выберите оценку от 1 до 5 звёзд.";
      form.querySelector('input[name="rating"]').focus();
      return;
    }
    if ([...payload.author].length < 2 || [...payload.author].length > 40) {
      status.textContent = "Укажите имя от 2 до 40 символов.";
      form.elements.namedItem("author").focus();
      return;
    }
    if ([...payload.body].length > 600) {
      status.textContent = "Сократите отзыв до 600 символов.";
      form.elements.namedItem("body").focus();
      return;
    }
    snapshot.saving = true;
    const controls = [...form.querySelectorAll("button, input, textarea")];
    controls.forEach(control => { control.disabled = true; });
    form.setAttribute("aria-busy", "true");
    status.textContent = "Сохраняем…";
    try {
      const saved = await account.saveProductReview(snapshot.product.id, payload);
      drafts.delete(snapshot.draftKey);
      if (!isCurrent(snapshot)) {
        void account.productReviews(snapshot.product.id)
          .then(data => onSummary?.(snapshot.product.id, data)).catch(() => {});
        return;
      }
      snapshot.draft = { ...payload };
      snapshot.mine.review = { ...payload, ...(saved?.review ?? saved ?? {}) };
      snapshot.editorOpen = false;
      snapshot.saved = payload.body ? "Оценка и отзыв опубликованы" : "Оценка сохранена";
      renderMine(snapshot);
      dialog.querySelector('[data-reviews-action="edit"]')?.focus({ preventScroll: true });
      if (snapshot.listLoading) snapshot.refreshAfterLoad = true;
      else void loadPublic(snapshot);
    } catch (error) {
      if (!isCurrent(snapshot)) return;
      if (error.status === 401) {
        status.innerHTML = 'Сессия закончилась. Войдите снова — введённый отзыв сохранён.<button type="button" class="reviews-text-button" data-reviews-action="login">Войти в аккаунт</button>';
      } else if (error.status === 403) {
        status.textContent = "Не удалось подтвердить покупку этого блюда. Оценка доступна после получения заказа. Введённый отзыв сохранён.";
      } else if (error.status === 429) {
        status.textContent = "Слишком много попыток. Подождите немного и отправьте снова.";
      } else {
        status.textContent = "Не удалось сохранить оценку. Текст сохранён — попробуйте ещё раз.";
      }
    } finally {
      snapshot.saving = false;
      if (form.isConnected) {
        controls.forEach(control => { control.disabled = false; });
        form.removeAttribute("aria-busy");
      }
    }
  });

  dialog.addEventListener("cancel", event => {
    event.preventDefault();
    close();
  });
  dialog.addEventListener("close", () => {
    if (dialog.open) return;
    persistDraft();
    state = null;
    syncBodyLock();
  });

  return { open, close };
}
