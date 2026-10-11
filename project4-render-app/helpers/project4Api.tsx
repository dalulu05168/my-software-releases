const PROJECT4_API =
  "https://nukvroaolkxewfnqfiui.supabase.co/functions/v1/project4-securities-api";
const PROJECT4_CLIENT_API =
  "https://nukvroaolkxewfnqfiui.supabase.co/functions/v1/project4-client-api";
const PROJECT4_REPORTS_API =
  "https://nukvroaolkxewfnqfiui.supabase.co/functions/v1/project4-reporting-api";

const SESSION_KEY = "project4_master_session";
const CLIENT_SESSION_KEY = "project4_client_session";

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
  async registerClient(input: {name:string; email:string; password:string; invite:string}): Promise<{ok:true;status:string}> {
    const response=await fetch(PROJECT4_CLIENT_API+"?action=register",{
      method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(input),cache:"no-store"
    });
    const data=await response.json().catch(()=>({}));
    if(!response.ok||data.ok!==true)throw new Error(data.error||"SIGNUP_UNAVAILABLE");
    return data;
  },
  // The standalone client gateway validates the password and returns a scoped session.
  async loginClient(account: string, password: string): Promise<{ displayName: string }> {
    const response = await fetch(PROJECT4_CLIENT_API + "?action=login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ account, password }),
      cache: "no-store",
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data?.error || "CLIENT_AUTH_UNAVAILABLE");
    if (data?.ok !== true || data?.role !== "client" || typeof data?.sessionToken !== "string" ||
        data.sessionToken.length < 32 || typeof data?.displayName !== "string") {
      throw new Error("INVALID_CLIENT_AUTH_RESPONSE");
    }
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(CLIENT_SESSION_KEY, data.sessionToken);
    }
    return { displayName: data.displayName };
  },

  async getClientPortfolio(): Promise<{
    name: string;
    kycStatus: string;
    vipLevel: string;
    accountType: string;
    balances: null;
    balanceStatus: string;
    orders: Array<{ id: string; side: string; state: string; quantity: number | null; currency: string; created_at: string; security_id: string | null }>;
    positions: Array<{ security_id: string; quantity: number; average_cost: number; currency: string; security: { symbol: string; name: string } | null }>;
  }> {
    const token = typeof window === "undefined" ? null : window.sessionStorage.getItem(CLIENT_SESSION_KEY);
    if (!token) throw new Error("CLIENT_SESSION_REQUIRED");
    const response = await fetch(PROJECT4_CLIENT_API + "?action=portfolio", {
      headers: { Authorization: "Bearer " + token },
      cache: "no-store",
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data?.ok !== true) throw new Error(data?.error || "CLIENT_PORTFOLIO_UNAVAILABLE");
    return data;
  },

  async logoutClient(): Promise<void> {
    const token = typeof window === "undefined" ? null : window.sessionStorage.getItem(CLIENT_SESSION_KEY);
    if (typeof window !== "undefined") window.sessionStorage.removeItem(CLIENT_SESSION_KEY);
    if (!token) return;
    try {
      await fetch(PROJECT4_CLIENT_API + "?action=logout", {
        method: "POST",
        headers: { Authorization: "Bearer " + token },
        cache: "no-store",
      });
    } catch {
      // Local session is cleared even if the network is unavailable.
    }
  },

  // Real backend authentication for both MASTER_ADMIN and OPS_ADMIN.
  // The Edge Function validates credentials, TOTP and account status.
  async loginAdmin(username: string, password: string, totp: string) {
    const data = await request({
      method: "POST",
      body: JSON.stringify({ action: "login_admin", username, password, totp }),
    }) as {
      ok: boolean;
      sessionToken: string;
      expiresAt: string;
      role: "master" | "ops";
      displayName: string;
      opsAccountId?: string;
    };
    if (!data.ok || !data.sessionToken || !["master", "ops"].includes(data.role)) {
      throw new Error("INVALID_AUTH_RESPONSE");
    }
    if (typeof window !== "undefined") {
      window.localStorage.setItem(SESSION_KEY, data.sessionToken);
    }
    return data;
  },

  // Backwards-compatible admin entry point, never falls back to a fake session.
  async loginMaster(username: string, password: string, totp: string) {
    const result = await this.loginAdmin(username, password, totp);
    if (result.role !== "master") throw new Error("ADMIN_ROLE_REQUIRED");
    return result;
  },

  logoutAdmin() {
    if (typeof window !== "undefined") window.localStorage.removeItem(SESSION_KEY);
  },
  logoutMaster() {
    this.logoutAdmin();
  },

  async listAdminReport(
    action: "clients" | "orders" | "cash" | "positions",
    filters: { opsAccountId?: string | null; userId?: string | null } = {},
  ): Promise<{
    rows: Array<Record<string, string | number | boolean | null>>;
    limit: number;
    possiblyMore: boolean;
  }> {
    const token = typeof window === "undefined" ? null : window.localStorage.getItem(SESSION_KEY);
    if (!token) throw new Error("AUTHORIZED_ADMIN_SESSION_REQUIRED");
    const params = new URLSearchParams({ action });
    if (filters.opsAccountId) params.set("ops_account_id", filters.opsAccountId);
    if (filters.userId) params.set("user_id", filters.userId);
    const response = await fetch(PROJECT4_REPORTS_API + "?" + params.toString(), {
      headers: { Authorization: "Bearer " + token },
      cache: "no-store",
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data?.error || "REPORTING_UNAVAILABLE");
    if (!Array.isArray(data?.rows)) throw new Error("INVALID_REPORTING_RESPONSE");
    return {
      rows: data.rows,
      limit: typeof data.limit === "number" ? data.limit : 200,
      possiblyMore: data.possiblyMore === true,
    };
  },

  async listOpsAccounts(): Promise<Array<{
    id: string; identityId: string | null; name: string; username: string; manager: string;
    status: string; enabled: boolean; invite: string; markets: string[];
  }>> {
    const data = await request({
      method: "POST",
      body: JSON.stringify({ action: "list_ops_accounts" }),
    });
    if (!Array.isArray(data.accounts)) throw new Error("OPS_ACCOUNTS_INVALID_RESPONSE");
    return data.accounts;
  },

  async createOpsAccount(input: {
    name: string; username: string; password: string; markets: Array<"US" | "MX">;
  }): Promise<{
    account: { id: string; username: string; name: string; invite: string };
    totpSecret: string; otpauthUri: string;
  }> {
    const data = await request({
      method: "POST",
      body: JSON.stringify({ action: "create_ops_account", ...input }),
    });
    if (data.ok !== true || !data.account?.id || typeof data.totpSecret !== "string") {
      throw new Error("OPS_CREATE_INVALID_RESPONSE");
    }
    return data;
  },

  async resetOpsTotp(identityId: string): Promise<{ totpSecret: string; otpauthUri: string }> {
    if (!/^[0-9a-f-]{36}$/i.test(identityId)) throw new Error("INVALID_OPS_IDENTITY_ID");
    const data = await request({
      method: "POST",
      body: JSON.stringify({ action: "reset_ops_totp", identityId }),
    });
    if (data?.ok !== true || typeof data.totpSecret !== "string" ||
        typeof data.otpauthUri !== "string") {
      throw new Error("INVALID_TOTP_RESET_RESPONSE");
    }
    return { totpSecret: data.totpSecret, otpauthUri: data.otpauthUri };
  },

  async setOpsStatus(opsAccountId: string, status: "ACTIVE" | "SUSPENDED"): Promise<void> {
    if (!/^[0-9a-f-]{36}$/i.test(opsAccountId)) throw new Error("INVALID_OPS_ACCOUNT_ID");
    const data = await request({
      method: "POST",
      body: JSON.stringify({ action: "set_ops_status", opsAccountId, status }),
    });
    if (data?.ok !== true || data.status !== status) throw new Error("OPS_STATUS_UPDATE_FAILED");
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
