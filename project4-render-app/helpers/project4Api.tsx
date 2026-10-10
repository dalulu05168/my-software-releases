const PROJECT4_API = "https://nukvroaolkxewfnqfiui.supabase.co/functions/v1/project4-securities-api";
const SESSION_KEY = "project4_admin_session";

export type AdminRole = "master" | "ops";
export type OpsAccount = {
  id: string;
  identityId: string | null;
  name: string;
  username: string;
  manager: string;
  markets: string[];
  status: "ACTIVE" | "SUSPENDED";
  enabled: boolean;
  invite: string;
  clients: number;
};
type AdminLogin = {
  ok: true;
  sessionToken: string;
  expiresAt: string;
  role: AdminRole;
  displayName: string;
  opsAccountId?: string;
};
type OpsCredentials = { ok: true; totpSecret: string; otpauthUri: string };

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


async function request(init?: RequestInit, scope?: "client" | "admin", requireAdmin = false) {
  const token = typeof window === "undefined" ? null : window.sessionStorage.getItem(SESSION_KEY);
  if (requireAdmin && !token) throw new Error("ADMIN_SESSION_REQUIRED");
  const url = scope ? `${PROJECT4_API}?scope=${scope}` : PROJECT4_API;
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");
  if (token && (requireAdmin || scope === "admin")) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  const response = await fetch(url, { ...init, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error || `HTTP_${response.status}`);
  return data;
}
function adminAction<T>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
  return request({ method: "POST", body: JSON.stringify({ action, ...payload }) }, undefined, true) as Promise<T>;
}
export const project4Api = {
  async loginAdmin(username: string, password: string, totp: string): Promise<AdminLogin> {
    if (!username.trim() || !password || !/^\d{6}$/.test(totp)) throw new Error("INVALID_LOGIN_INPUT");
    // The backend assigns roles; never derive authorization from the username.
    const data = await request({
      method: "POST",
      body: JSON.stringify({ action: "login_admin", username: username.trim(), password, totp }),
    }) as AdminLogin;
    if (!data.ok || !data.sessionToken || !["master", "ops"].includes(data.role))
      throw new Error("INVALID_LOGIN_RESPONSE");
    if (typeof window !== "undefined") window.sessionStorage.setItem(SESSION_KEY, data.sessionToken);
    return data;
  },
  logoutAdmin() {
    if (typeof window !== "undefined") window.sessionStorage.removeItem(SESSION_KEY);
  },
  async listOpsAccounts(): Promise<OpsAccount[]> {
    const data = await adminAction<{ accounts: OpsAccount[] }>("list_ops_accounts");
    return data.accounts || [];
  },
  createOpsAccount(input: {
    name: string; username: string; password: string; markets: Array<"US" | "MX">;
  }): Promise<OpsCredentials & { account: OpsAccount }> {
    return adminAction("create_ops_account", input);
  },
  resetOpsTotp(identityId: string): Promise<OpsCredentials> {
    return adminAction("reset_ops_totp", { identityId });
  },
  setOpsStatus(opsAccountId: string, status: "ACTIVE" | "SUSPENDED"): Promise<{ ok: true; status: string }> {
    return adminAction("set_ops_status", { opsAccountId, status });
  },
  async listClientSecurities() {
    const data = await request(undefined, "client");
    return (data.securities || []) as ApiSecurity[];
  },
  async listAdminSecurities() {
    const data = await request(undefined, "admin", true);
    return (data.securities || []) as ApiSecurity[];
  },
  upsertSecurity(security: {
    symbol: string; name: string; market: "US" | "MX"; currency?: "USD" | "MXN";
    visible?: boolean; tradable?: boolean; providerExchange?: string; micCode?: string;
  }) {
    return adminAction("upsert_security", { security });
  },
  updateSecurity(id: string, patch: Partial<{
    visible: boolean; tradable: boolean; status: "ACTIVE" | "SUSPENDED" | "DELISTED";
  }>) {
    return adminAction("update_security", { id, patch });
  },
};
