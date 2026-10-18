const PROJECT4_API =
  "https://nukvroaolkxewfnqfiui.supabase.co/functions/v1/project4-securities-api";

const SESSION_KEY = "project4_master_session";

type ApiSecurity = {
  id: string;
  market: "US" | "MX";
  symbol: string;
  name: string;
  currency: "USD" | "MXN";
  status: "ACTIVE" | "SUSPENDED" | "DELISTED";
  visible: boolean;
  tradable: boolean;
  blockEligible: boolean;
  ipoRelated: boolean;
  purchaseAuthorizationMode: "OPEN" | "MASTER_CODE";
  marketDataProviderKey: string;
  referenceProvider: string | null;
  providerExchange: string | null;
  micCode: string | null;
  country: string | null;
  instrumentType: string | null;
  providerSyncedAt: string | null;
  updatedAt: string;
  quote: {
    lastPrice: number | string;
    percentChange: number | string | null;
    providerTimestamp: string;
  } | null;
};

async function request(init?: RequestInit, scope?: "client" | "admin", authenticated = true) {
  const token =
    typeof window !== "undefined"
      ? window.localStorage.getItem(SESSION_KEY)
      : null;
  const url = scope ? `${PROJECT4_API}?scope=${scope}` : PROJECT4_API;
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");
  if (authenticated && token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(url, { ...init, headers, cache: "no-store" });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      if (typeof window !== "undefined") window.localStorage.removeItem(SESSION_KEY);
    }
    throw new Error(data?.error || `HTTP_${response.status}`);
  }
  return data;
}

export const project4Api = {
  async loginMaster(username: string, password: string, totp: string) {
    const data = await request({
      method: "POST",
      body: JSON.stringify({ action: "login_master", username, password, totp }),
    }, undefined, false);
    const expiresAt = typeof data?.expiresAt === "string" ? Date.parse(data.expiresAt) : NaN;
    if (
      data?.ok !== true ||
      data?.role !== "master" ||
      typeof data?.sessionToken !== "string" ||
      !data.sessionToken.trim() ||
      !Number.isFinite(expiresAt) ||
      expiresAt <= Date.now()
    ) {
      throw new Error("INVALID_AUTH_RESPONSE");
    }
    if (typeof window !== "undefined" && data.sessionToken) {
      window.localStorage.setItem(SESSION_KEY, data.sessionToken);
    }
    return data as {
      ok: boolean;
      sessionToken: string;
      expiresAt: string;
      role: "master";
      displayName: string;
    };
  },

  logoutMaster() {
    if (typeof window !== "undefined") window.localStorage.removeItem(SESSION_KEY);
  },

  async listClientSecurities() {
    const data = await request(undefined, "client");
    return (data.securities || []) as ApiSecurity[];
  },

  async listAdminSecurities() {
    const data = await request(undefined, "admin");
    return (data.securities || []) as ApiSecurity[];
  },

  async upsertSecurity(security: {
    symbol: string;
    name: string;
    market: "US" | "MX";
    currency?: "USD" | "MXN";
    visible?: boolean;
    tradable?: boolean;
    providerExchange?: string;
    micCode?: string;
  }) {
    return request({
      method: "POST",
      body: JSON.stringify({ action: "upsert_security", security }),
    });
  },

  async updateSecurity(
    id: string,
    patch: Partial<{
      visible: boolean;
      tradable: boolean;
      status: "ACTIVE" | "SUSPENDED" | "DELISTED";
    }>,
  ) {
    return request({
      method: "POST",
      body: JSON.stringify({ action: "update_security", id, patch }),
    });
  },
};
