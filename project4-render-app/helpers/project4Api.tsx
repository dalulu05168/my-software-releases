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

async function request(init?: RequestInit, scope?: "client" | "admin") {
  const token =
    typeof window !== "undefined"
      ? window.localStorage.getItem(SESSION_KEY)
      : null;
  const url = scope ? `${PROJECT4_API}?scope=${scope}` : PROJECT4_API;
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(url, { ...init, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error || `HTTP_${response.status}`);
  return data;
}

export const project4Api = {
  async loginAdmin(username: string, password: string, totp: string) {
    const data = await request({
      method: "POST",
      body: JSON.stringify({ action: "login_admin", username, password, totp }),
    });
    if (typeof window !== "undefined" && data.sessionToken) {
      window.localStorage.setItem(SESSION_KEY, data.sessionToken);
    }
    return data as {
      ok: boolean;
      sessionToken: string;
      expiresAt: string;
      role: "master" | "ops";
      displayName: string;
      opsAccountId?: string;
    };
  },

  async loginMaster(username: string, password: string, totp: string) {
    return this.loginAdmin(username, password, totp);
  },

  logoutMaster() {
    if (typeof window !== "undefined") window.localStorage.removeItem(SESSION_KEY);
  },

  async listOpsAccounts() {
    const data = await request({
      method: "POST",
      body: JSON.stringify({ action: "list_ops_accounts" }),
    });
    return (data.accounts || []) as Array<{
      id: string;
      identityId: string | null;
      name: string;
      username: string;
      manager: string;
      markets: Array<"US" | "MX">;
      status: "ACTIVE" | "SUSPENDED";
      enabled: boolean;
      invite: string;
      clients: number;
    }>;
  },

  async createOpsAccount(input: {
    name: string;
    username: string;
    password: string;
    markets: Array<"US" | "MX">;
  }) {
    return request({
      method: "POST",
      body: JSON.stringify({ action: "create_ops_account", ...input }),
    }) as Promise<{
      ok: boolean;
      account: {
        id: string;
        identityId: string;
        name: string;
        username: string;
        markets: Array<"US" | "MX">;
        status: "ACTIVE";
        invite: string;
      };
      totpSecret: string;
      otpauthUri: string;
    }>;
  },

  async resetOpsTotp(identityId: string) {
    return request({
      method: "POST",
      body: JSON.stringify({ action: "reset_ops_totp", identityId }),
    }) as Promise<{ ok: boolean; totpSecret: string; otpauthUri: string }>;
  },

  async setOpsStatus(opsAccountId: string, status: "ACTIVE" | "SUSPENDED") {
    return request({
      method: "POST",
      body: JSON.stringify({ action: "set_ops_status", opsAccountId, status }),
    }) as Promise<{ ok: boolean; status: "ACTIVE" | "SUSPENDED" }>;
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
