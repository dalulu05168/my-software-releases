/**
 * P004 browser contract. This is a client for the existing deployed Edge Function,
 * not a replacement for its server-side authorization checks.
 * No production functions, accounts, or database rows are mutated by this file.
 */
const PROJECT4_API =
  "https://nukvroaolkxewfnqfiui.supabase.co/functions/v1/project4-securities-api";

const SESSION_KEY = "project4_admin_session_v1";

export type AdminRole = "master" | "ops";
export type AdminLogin = {
  ok: true;
  sessionToken: string;
  expiresAt: string;
  role: AdminRole;
  displayName: string;
  opsAccountId?: string;
};

export type OpsAccount = {
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
};

export type ApiSecurity = {
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

function readToken() {
  return typeof window === "undefined" ? null : window.sessionStorage.getItem(SESSION_KEY);
}

async function request(init?: RequestInit, scope?: "client" | "admin") {
  const url = scope ? `${PROJECT4_API}?scope=${scope}` : PROJECT4_API;
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");
  const token = readToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (scope === "admin" && !token) throw new Error("ADMIN_SESSION_REQUIRED");

  const response = await fetch(url, { ...init, headers, cache: "no-store" });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error || `HTTP_${response.status}`);
  return data;
}

function adminAction(action: string, payload: Record<string, unknown> = {}) {
  if (!readToken()) return Promise.reject(new Error("ADMIN_SESSION_REQUIRED"));
  return request({ method: "POST", body: JSON.stringify({ action, ...payload }) });
}

export const project4Api = {
  async loginAdmin(username: string, password: string, totp: string): Promise<AdminLogin> {
    // The backend verifies both password and TOTP and assigns role from identities.role.
    // Client-side username prefixes must never grant administrative access.
    if (!username.trim() || !password || !/^\d{6}$/.test(totp)) {
      throw new Error("INVALID_LOGIN_INPUT");
    }
    const data = await request({
      method: "POST",
      body: JSON.stringify({ action: "login_admin", username: username.trim(), password, totp }),
    });
    if (data?.ok !== true || !data.sessionToken ||
        (data.role !== "master" && data.role !== "ops") ||
        !data.expiresAt || Date.parse(data.expiresAt) <= Date.now()) {
      throw new Error("INVALID_AUTH_RESPONSE");
    }
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(SESSION_KEY, data.sessionToken);
    }
    return data as AdminLogin;
  },

  logoutAdmin() {
    if (typeof window !== "undefined") window.sessionStorage.removeItem(SESSION_KEY);
  },

  async listClientSecurities(): Promise<ApiSecurity[]> {
    const data = await request(undefined, "client");
    if (!Array.isArray(data.securities)) throw new Error("INVALID_SECURITIES_RESPONSE");
    return data.securities as ApiSecurity[];
  },

  async listAdminSecurities(): Promise<ApiSecurity[]> {
    const data = await request(undefined, "admin");
    if (!Array.isArray(data.securities)) throw new Error("INVALID_SECURITIES_RESPONSE");
    return data.securities as ApiSecurity[];
  },

  async listOpsAccounts(): Promise<OpsAccount[]> {
    const data = await adminAction("list_ops_accounts");
    if (!Array.isArray(data.accounts)) throw new Error("INVALID_OPS_ACCOUNTS_RESPONSE");
    return data.accounts as OpsAccount[];
  },

  async createOpsAccount(input: {
    name: string; username: string; password: string; markets: Array<"US" | "MX">;
  }): Promise<{ ok: true; account: OpsAccount; totpSecret: string; otpauthUri: string }> {
    const data = await adminAction("create_ops_account", input);
    if (data?.ok !== true || !data.account?.id || !data.totpSecret) {
      throw new Error("INVALID_OPS_CREATE_RESPONSE");
    }
    return data;
  },

  async resetOpsTotp(identityId: string): Promise<{ ok: true; totpSecret: string; otpauthUri: string }> {
    if (!identityId) throw new Error("OPS_IDENTITY_NOT_FOUND");
    const data = await adminAction("reset_ops_totp", { identityId });
    if (data?.ok !== true || !data.totpSecret) throw new Error("INVALID_TOTP_RESET_RESPONSE");
    return data;
  },

  async setOpsStatus(opsAccountId: string, status: "ACTIVE" | "SUSPENDED") {
    return adminAction("set_ops_status", { opsAccountId, status });
  },

  async upsertSecurity(security: {
    symbol: string; name: string; market: "US" | "MX";
    currency?: "USD" | "MXN"; visible?: boolean; tradable?: boolean;
    providerExchange?: string; micCode?: string;
  }) {
    return adminAction("upsert_security", { security });
  },

  async updateSecurity(
    id: string,
    patch: Partial<{
      visible: boolean; tradable: boolean; status: "ACTIVE" | "SUSPENDED" | "DELISTED";
    }>,
  ) {
    return adminAction("update_security", { id, patch });
  },
};
