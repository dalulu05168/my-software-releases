// The client API is NOT deployed in production. Default OFF until staging acceptance
// and separate release approval. No fallback to demo credentials or local-only login.
const CLIENT_API = "https://nukvroaolkxewfnqfiui.supabase.co/functions/v1/project4-client-api";
const SESSION_KEY = "project4_client_session";

export type ClientOrder = {
  id: string;
  security_id: string | null;
  product_id: string | null;
  side: string;
  order_type: string | null;
  quantity: number | string | null;
  reference_price: number | string | null;
  currency: string;
  state: string;
  created_at: string;
};
export type ClientCashRequest = {
  id: string;
  type: string;
  currency: string;
  amount: number | string;
  status: string;
  created_at: string;
};
export type ClientPosition = {
  security_id: string;
  quantity: number | string;
  average_cost: number | string;
  currency: string;
  updated_at: string;
};
export type ClientSecurity = {
  id: string;
  symbol: string;
  name: string;
  market: "US" | "MX";
  currency: string;
};
export type ClientPortfolio = {
  orders: ClientOrder[];
  cashRequests: ClientCashRequest[];
  positions: ClientPosition[];
  securities: ClientSecurity[];
  balances: null;
  readOnly: true;
};

export function clientApiEnabled() {
  return import.meta.env.VITE_PROJECT4_CLIENT_API_ENABLED === "true";
}

async function callClientApi(init: RequestInit, resource?: string, requiresSession = true) {
  if (!clientApiEnabled()) throw new Error("CLIENT_API_NOT_DEPLOYED");
  const session = typeof window === "undefined" ? null : window.sessionStorage.getItem(SESSION_KEY);
  if (requiresSession && !session) throw new Error("CLIENT_SESSION_REQUIRED");
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  if (requiresSession && session) headers.set("Authorization", "Bearer " + session);
  const response = await fetch(resource ? CLIENT_API + "?resource=" + encodeURIComponent(resource) : CLIENT_API, {
    ...init,
    headers,
    cache: "no-store",
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && requiresSession && typeof window !== "undefined") {
      window.sessionStorage.removeItem(SESSION_KEY);
    }
    throw new Error(data.error || "HTTP_" + response.status);
  }
  return data;
}

export const project4ClientApi = {
  async login(login: string, password: string): Promise<{ role: "client"; displayName: string }> {
    if (!login.trim() || !password) throw new Error("INVALID_CREDENTIALS");
    const data = await callClientApi({
      method: "POST",
      body: JSON.stringify({ action: "login_client", login: login.trim(), password }),
    }, undefined, false);
    if (!data?.ok || data?.role !== "client" || !data.sessionToken)
      throw new Error("INVALID_LOGIN_RESPONSE");
    if (typeof window !== "undefined") window.sessionStorage.setItem(SESSION_KEY, data.sessionToken);
    return { role: "client", displayName: data.displayName || login };
  },
  async listPortfolio(): Promise<ClientPortfolio> {
    const data = await callClientApi({ method: "GET" }, "portfolio") as ClientPortfolio;
    if (!Array.isArray(data?.orders) || !Array.isArray(data?.cashRequests) ||
        !Array.isArray(data?.positions) || !Array.isArray(data?.securities) ||
        data.readOnly !== true)
      throw new Error("INVALID_PORTFOLIO_RESPONSE");
    return data;
  },
  async logout(): Promise<void> {
    try {
      if (typeof window !== "undefined" && window.sessionStorage.getItem(SESSION_KEY) && clientApiEnabled()) {
        await callClientApi({ method: "POST", body: JSON.stringify({ action: "logout_client" }) });
      }
    } finally {
      if (typeof window !== "undefined") window.sessionStorage.removeItem(SESSION_KEY);
    }
  },
};
