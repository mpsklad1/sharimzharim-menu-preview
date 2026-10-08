const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);

const errorText = error => {
  if (error.status === 429) return "Слишком много попыток. Попробуйте позже.";
  if (error.status === 401) return "Неверный логин или пароль.";
  if (["login_taken", "login_taken_or_already_set"].includes(error.code)) return "Этот логин уже занят. Выберите другой.";
  if (error.code === "telegram_has_site_account") return "Этот Telegram уже связан с другим логином. Войдите в тот аккаунт.";
  if (error.code === "link_expired") return "Ссылка устарела. Создайте новую.";
  return "Не удалось выполнить действие. Попробуйте ещё раз.";
};

export function createAccountAuth({ dialog, account, onSignedIn, onRefresh, onLinked }) {
  let timer = null;
  let pollBusy = false;
  let busy = false;
  let mode = "login";
  const stop = () => { clearInterval(timer); timer = null; };
  const status = (selector, text) => {
    const line = dialog.querySelector(selector);
    if (line) line.textContent = text;
  };

  function credentialsForm(kind) {
    const creating = kind !== "login";
    return `<form class="account-auth-form" data-auth-form="${kind}">
      <label>Логин<input name="login" type="text" required minlength="1" maxlength="40" autocomplete="username" autocapitalize="none" spellcheck="false" placeholder="${creating ? "Придумайте логин" : "Ваш логин"}"></label>
      <label>Пароль<span class="account-password"><input name="password" type="password" required minlength="1" maxlength="128" autocomplete="${creating ? "new-password" : "current-password"}" placeholder="${creating ? "Придумайте пароль" : "Ваш пароль"}"><button type="button" data-auth-action="show-password" aria-label="Показать пароль" aria-pressed="false">Показать</button></span></label>
      <p class="account-auth-status" role="status" aria-live="polite"></p>
      <button class="primary-button" type="submit">${kind === "login" ? "Войти" : kind === "register" ? "Создать аккаунт" : "Сохранить"}</button>
    </form>`;
  }

  function showSignIn(nextMode = "login") {
    stop();
    mode = nextMode;
    const root = dialog.querySelector(".sheet-scroll");
    root.innerHTML = `<div class="account-signin"><h2>${mode === "register" ? "Создать аккаунт" : "Войти"}</h2>
      ${mode === "register" ? '<p class="account-auth-hint">Без телефона и почты. Запомните логин и пароль.</p>' : ""}
      ${credentialsForm(mode)}
      <button class="account-auth-text" type="button" data-auth-action="${mode === "register" ? "login" : "register"}">${mode === "register" ? "Уже есть аккаунт? Войти" : "Создать аккаунт"}</button>
      <div class="account-auth-alternative"><span>или</span><button type="button" class="account-auth-secondary" data-auth-action="telegram-login">Войти через Telegram</button></div>
    </div>`;
  }

  async function showTelegramLogin() {
    stop();
    const root = dialog.querySelector(".sheet-scroll");
    root.innerHTML = '<p class="account-empty">Подключаем Telegram…</p>';
    try {
      const login = await account.startSiteLogin();
      if (!dialog.open || account.token) return;
      root.innerHTML = `<div class="account-signin"><h2>Войти через Telegram</h2>
        <p>Подтвердите в боте код <strong>${escapeHtml(login.code)}</strong>.</p>
        <a class="primary-button" data-auth-action="login-open" href="${escapeHtml(login.url)}" target="_blank" rel="noopener noreferrer">Открыть Telegram</a>
        <p class="account-auth-hint" id="login-status" role="status"></p>
        <button class="account-auth-text" type="button" data-auth-action="login">Войти по логину</button>
      </div>`;
    } catch (error) {
      if (!dialog.open) return;
      showSignIn();
      status(".account-auth-status", errorText(error));
    }
  }

  function renderLink() {
    const root = dialog.querySelector("#telegram-link-panel");
    if (!root) return;
    const link = account.telegramLink;
    if (!link) {
      root.innerHTML = '<p class="account-auth-hint">Заказы и скидки будут общими на сайте и в боте.</p><button type="button" class="account-auth-secondary" data-auth-action="link-start">Привязать Telegram</button><p class="account-auth-status" id="link-status" role="status"></p>';
    } else if (link.status === "confirmed") {
      root.innerHTML = `<p>Telegram: <strong>${escapeHtml(link.telegram_username ? `@${link.telegram_username}` : link.telegram_name || "подтверждён")}</strong></p>
        <button type="button" class="primary-button" data-auth-action="link-complete">Подтвердить привязку</button>
        <p class="account-auth-status" id="link-status" role="status"></p><button type="button" class="account-auth-text" data-auth-action="link-cancel">Отмена</button>`;
    } else if (link.status === "expired") {
      root.innerHTML = '<p class="account-auth-hint">Ссылка устарела.</p><button type="button" class="account-auth-secondary" data-auth-action="link-start">Новая ссылка</button>';
    } else {
      root.innerHTML = `<p>Подтвердите в боте код <strong>${escapeHtml(link.code)}</strong>.</p>
        <a class="account-auth-secondary" data-auth-action="link-open" href="${escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer">Открыть Telegram</a>
        <p class="account-auth-hint" id="link-status" role="status">После подтверждения вернитесь сюда.</p><button type="button" class="account-auth-text" data-auth-action="link-check">Я подтвердил в боте</button>
        <button type="button" class="account-auth-text" data-auth-action="link-cancel">Отмена</button>`;
    }
  }

  async function poll() {
    if (pollBusy || !dialog.open) return;
    pollBusy = true;
    try {
      if (!account.token && account.siteLogin) {
        const result = await account.pollSiteLogin();
        if (result === "ready") { stop(); await onSignedIn(); }
        else if (result === "expired") { stop(); status("#login-status", "Ссылка устарела. Начните вход заново."); }
      } else if (account.telegramLink?.status === "pending") {
        const result = await account.pollTelegramLink();
        if (result?.status !== "pending") { stop(); renderLink(); }
      }
    } catch {
      status(account.token ? "#link-status" : "#login-status", "Нет связи с сервером. Повторяем попытку…");
    } finally { pollBusy = false; }
  }

  const startPolling = () => {
    if (!timer) timer = setInterval(() => void poll(), 2500);
    void poll();
  };

  dialog.addEventListener("submit", async event => {
    const form = event.target.closest("[data-auth-form]");
    if (!form) return;
    event.preventDefault();
    if (busy || !form.reportValidity()) return;
    const values = new FormData(form);
    const login = String(values.get("login") ?? "").trim();
    const password = String(values.get("password") ?? "");
    if (!login || !password.trim()) { status(".account-auth-status", "Введите логин и пароль."); return; }
    busy = true;
    form.setAttribute("aria-busy", "true");
    dialog.querySelectorAll("[data-auth-action], [data-auth-form] button").forEach(el => { if (el.tagName === "BUTTON") el.disabled = true; });
    try {
      if (form.dataset.authForm === "credentials") {
        await account.addCredentials(login, password);
        form.reset();
        await onRefresh();
      } else {
        await account.passwordAuth(form.dataset.authForm, login, password);
        form.reset();
        stop();
        await onSignedIn();
      }
    } catch (error) {
      const line = form.querySelector(".account-auth-status");
      if (line?.isConnected) line.textContent = errorText(error);
    } finally {
      busy = false;
      form.removeAttribute("aria-busy");
      dialog.querySelectorAll("[data-auth-action], [data-auth-form] button").forEach(el => { if (el.tagName === "BUTTON") el.disabled = false; });
    }
  });

  dialog.addEventListener("click", async event => {
    const button = event.target.closest("[data-auth-action]");
    if (!button || busy) return;
    switch (button.dataset.authAction) {
      case "login": showSignIn(); break;
      case "register": showSignIn("register"); break;
      case "telegram-login": await showTelegramLogin(); break;
      case "login-open": case "link-open": case "link-check": startPolling(); break;
      case "show-password": {
        const input = button.closest(".account-password").querySelector("input");
        const visible = input.type === "password";
        input.type = visible ? "text" : "password";
        button.textContent = visible ? "Скрыть" : "Показать";
        button.setAttribute("aria-pressed", String(visible));
        button.setAttribute("aria-label", visible ? "Скрыть пароль" : "Показать пароль");
        break;
      }
      case "credentials-open":
        dialog.querySelector("#site-credentials-panel").innerHTML = credentialsForm("credentials");
        break;
      case "link-start":
        button.disabled = true;
        try { await account.startTelegramLink(); renderLink(); }
        catch (error) { status("#link-status", errorText(error)); }
        finally { button.disabled = false; }
        break;
      case "link-cancel": stop(); account.telegramLink = null; renderLink(); break;
      case "link-complete":
        button.disabled = true;
        try { await account.completeTelegramLink(); stop(); await onLinked(); }
        catch (error) { status("#link-status", errorText(error)); }
        finally { button.disabled = false; }
        break;
    }
  });

  dialog.addEventListener("close", stop);
  return { showSignIn, renderLink, poll, stop };
}
