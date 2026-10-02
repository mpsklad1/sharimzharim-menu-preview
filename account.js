const API_BASE = "https://sharim.176-222-53-108.sslip.io/api";

export class MenuAccount {
  constructor(telegram) {
    this.telegram = telegram;
    this.token = null;
    this.me = null;
    this.error = null;
    this.handoffTicket = null;
    this.handoffIssuedAt = 0;
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
      this.token = null;
      this.me = null;
    }
    if (!response.ok) throw new Error(`Сервер ответил ${response.status}`);
    return response.json();
  }

  async connect() {
    if (!this.telegram?.initData) return;
    try {
      const result = await this.request("/auth/webapp", "POST", { init_data: this.telegram.initData }, false);
      this.token = result.token;
      await this.refresh();
      this.error = null;
      void this.prepareHandoff();
    } catch (error) {
      this.error = error;
    }
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

  async saveDemoOrder(items) {
    return this.request("/orders/demo", "POST", { items });
  }
}
