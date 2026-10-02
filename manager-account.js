import {API_BASE} from './account.js?v=20261002-shared';

const SESSION_KEY = 'sharimzharim-manager-session';

export class ManagerAccount {
  constructor() {
    this.token = null;
    this.me = null;
    try { this.token = sessionStorage.getItem(SESSION_KEY); } catch { /* private browser */ }
  }

  clear() {
    this.token = null;
    this.me = null;
    try { sessionStorage.removeItem(SESSION_KEY); } catch { /* private browser */ }
  }

  accept(result) {
    this.token = result.token;
    this.me = {name: result.username, must_change_password: result.must_change_password};
    try { sessionStorage.setItem(SESSION_KEY, result.token); } catch { /* memory-only session */ }
  }

  async request(path, method = 'GET', body, authenticated = true) {
    const headers = {};
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (authenticated) {
      if (!this.token) throw new Error('Введите логин и пароль владельца.');
      headers.Authorization = `Bearer ${this.token}`;
    }
    let response;
    try {
      response = await fetch(`${API_BASE}${path}`, {
        method, headers, body: body === undefined ? undefined : JSON.stringify(body), cache: 'no-store'
      });
    } catch { throw new Error('Не удалось связаться с сервером. Проверьте интернет и попробуйте снова.'); }
    if (!response.ok) {
      let message;
      if (response.status === 401) {
        if (path === '/auth/manager/login') message = 'Неверный логин или пароль.';
        else if (path === '/auth/manager/password') message = 'Текущий пароль неверен или сеанс истёк. Проверьте пароль; при необходимости войдите заново.';
        else { this.clear(); message = 'Сеанс завершён. Войдите ещё раз.'; }
      } else if (response.status === 429) message = 'Слишком много попыток. Попробуйте снова через 15 минут.';
      else if (response.status === 403) message = 'Доступ закрыт. При первом входе нужно заменить временный пароль.';
      else if (response.status === 409) message = 'Данные уже изменились. Обновите страницу и повторите действие.';
      else if (response.status === 400 && path === '/auth/manager/password') message = 'Новый пароль должен отличаться от текущего и содержать от 12 символов (до 128 байт).';
      else message = `Не удалось выполнить действие (код ${response.status}).`;
      const error = new Error(message);
      error.status = response.status;
      throw error;
    }
    return response.json();
  }

  async connect() {
    if (!this.token) return;
    const result = await this.request('/auth/manager/me');
    this.me = {name: result.username, must_change_password: result.must_change_password};
  }

  async login(username, password) {
    const result = await this.request('/auth/manager/login', 'POST', {username, password}, false);
    this.accept(result);
  }

  async changePassword(currentPassword, newPassword) {
    const result = await this.request('/auth/manager/password', 'POST', {
      current_password: currentPassword, new_password: newPassword
    });
    this.accept(result);
  }

  async logout() {
    // Keep the session if revocation fails so the user can retry safely.
    if (this.token) await this.request('/auth/manager/logout', 'POST', {});
    this.clear();
  }
}
