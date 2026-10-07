export const LEGACY_API_BASE = "https://sharim.176-222-53-108.sslip.io/api";
export const API_BASE = /^(www\.)?sharimzharim\.pro$/.test(location.hostname)
  ? `${location.origin}/api`
  : LEGACY_API_BASE;
const TOKEN_KEY = "sharimzharim-site-token";

function savedToken() {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}

export class MenuAccount {
  constructor(telegram) {
    this.telegram = telegram;
    this.token = null;
    this.me = null;
    this.error = null;
    this.handoffTicket = null;
    this.handoffIssuedAt = 0;
    this.siteLogin = null;
  }

  setToken(token) {
    this.token = token;
    try {
      if (token) localStorage.setItem(TOKEN_KEY, token);
      else localStorage.removeItem(TOKEN_KEY);
    } catch { /* private browsing */ }
  }

  logout() {
    this.setToken(null);
    this.me = null;
    this.handoffTicket = null;
  }

  async request(path, method = "GET", body, authenticated = true) {
    const headers = {};
    if (body !== undefined) headers["Content-Type"] = "application/json";
    if (authenticated) {
      if (!this.token) throw new Error("Нет входа в аккаунт");
      headers.Authorization = `Bearer ${this.token}`;
    }
    const response = await fetch(`${API_BASE}${path}`, {
      method, headers, body: body === undefined ? undefined : JSON.stringify(body)
    });
    if (response.status === 401 && authenticated) {
      this.logout();
    }
    if (!response.ok) {
      const details = await response.json().catch(() => ({}));
      const error = new Error(`Сервер ответил ${response.status}`);
      error.status = response.status;
      error.code = details.error || details.code;
      throw error;
    }
    return response.json();
  }

  async connect() {
    try {
      if (this.telegram?.initData) {
        const result = await this.request("/auth/webapp", "POST", { init_data: this.telegram.initData }, false);
        this.setToken(result.token);
      } else {
        this.token = savedToken();
      }
      if (!this.token) return;
      await this.refresh();
      this.error = null;
      void this.prepareHandoff();
    } catch (error) {
      this.error = error;
      this.logout();
    }
  }

  async startSiteLogin() {
    if (this.siteLogin && Date.now() - this.siteLogin.createdAt < 9 * 60_000) return this.siteLogin;
    const result = await this.request("/auth/site/start", "POST", {}, false);
    this.siteLogin = {
      challenge: result.challenge,
      pollSecret: result.poll_secret,
      url: `https://t.me/SharimZharimbot?start=login_${result.challenge}`,
      code: result.challenge.slice(0, 6).toUpperCase(),
      createdAt: Date.now()
    };
    return this.siteLogin;
  }

  async pollSiteLogin() {
    if (!this.siteLogin) return "expired";
    const result = await this.request("/auth/site/poll", "POST", {
      challenge: this.siteLogin.challenge,
      poll_secret: this.siteLogin.pollSecret
    }, false);
    if (result.status === "ready") {
      this.setToken(result.token);
      this.siteLogin = null;
      await this.refresh();
      void this.prepareHandoff();
    } else if (result.status === "expired") {
      this.siteLogin = null;
    }
    return result.status;
  }

  async refresh() {
    if (!this.token) return null;
    this.me = await this.request("/me");
    return this.me;
  }

  async prepareHandoff() {
    if (!this.token) return;
    try {
      this.handoffTicket = (await this.request("/auth/handoff", "POST", {})).ticket;
      this.handoffIssuedAt = Date.now();
    } catch {
      this.handoffTicket = null;
    }
  }

  takeHandoff() {
    if (!this.handoffTicket || Date.now() - this.handoffIssuedAt > 8 * 60_000) {
      void this.prepareHandoff();
      return null;
    }
    const ticket = this.handoffTicket;
    this.handoffTicket = null;
    void this.prepareHandoff();
    return ticket;
  }

  async orders() {
    return this.request("/orders");
  }

  async saveDemoOrder(items, requestId) {
    return this.request("/orders/demo", "POST", { items, request_id: requestId,
      source: this.telegram?.initData ? "telegram" : "site" });
  }

  async saveCart(items) {
    return this.request("/cart", "POST", { items,
      source: this.telegram?.initData ? "telegram" : "site" });
  }

  async productReviews(productId, cursor = null) {
    const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";
    return this.request(`/products/${productId}/reviews${query}`, "GET", undefined, false);
  }

  async myProductReview(productId) {
    return this.request(`/products/${productId}/reviews/mine`);
  }

  async saveProductReview(productId, review) {
    return this.request(`/products/${productId}/reviews`, "POST", review);
  }

  async myReviews() {
    return this.request("/reviews/mine");
  }
}
