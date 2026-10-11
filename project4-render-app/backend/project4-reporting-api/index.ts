import { createClient } from "npm:@supabase/supabase-js@2";
// Read-only audited reporting gateway for real P004 data. No money/order mutations.
// The server-side service key is never sent to the client.
const origins = new Set([
  "https://p004-trading-light-ui-preview-20261011.onrender.com",
  "https://brantone-veyor-trading.onrender.com",
  "https://jiaoyipingtai-app.floot.app",
]);
const cors = (origin: string | null) => ({
  "Access-Control-Allow-Origin": origin && origins.has(origin) ? origin : "null",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Cache-Control": "no-store",
  "Vary": "Origin",
});
const json = (value: unknown, status: number, origin: string | null) =>
  new Response(JSON.stringify(value), {
    status, headers: { ...cors(origin), "Content-Type": "application/json; charset=utf-8" },
  });
function service() {
  const url = Deno.env.get("SUPABASE_URL");
  let key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const modern = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (modern) { try { key = JSON.parse(modern).default || key; } catch { /* legacy fallback */ } }
  if (!url || !key) throw new Error("SERVER_CONFIG_MISSING");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
async function sha256(text: string) {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)));
  return Array.from(digest, (x) => x.toString(16).padStart(2, "0")).join("");
}
type DB = ReturnType<typeof service>;
async function authorized(db: DB, req: Request): Promise<
  | { role: "master"; identityId: string; opsAccountId: null }
  | { role: "ops"; identityId: string; opsAccountId: string }
  | null
> {
  const header = req.headers.get("authorization") || "";
  if (!header.startsWith("Bearer ")) return null;
  const token = header.slice(7).trim();
  if (token.length < 32 || token.length > 200) return null;
  const digest = await sha256(token);
  const { data: master } = await db.from("master_sessions")
    .select("identity_id,expires_at,revoked_at").eq("token_digest", digest).maybeSingle();
  if (master && !master.revoked_at && Date.parse(master.expires_at) > Date.now()) {
    const { data: identity } = await db.from("identities").select("id,enabled,role")
      .eq("id", master.identity_id).maybeSingle();
    if (identity?.enabled && identity.role === "MASTER_ADMIN") {
      return { role: "master", identityId: identity.id, opsAccountId: null };
    }
  }
  const { data: ops } = await db.from("ops_sessions")
    .select("identity_id,ops_account_id,expires_at,revoked_at")
    .eq("token_digest", digest).maybeSingle();
  if (!ops || ops.revoked_at || Date.parse(ops.expires_at) <= Date.now()) return null;
  const [{ data: identity }, { data: account }, { data: policy }] = await Promise.all([
    db.from("identities").select("id,enabled,role,ops_account_id").eq("id", ops.identity_id).maybeSingle(),
    db.from("ops_accounts").select("id,status").eq("id", ops.ops_account_id).maybeSingle(),
    db.from("ops_account_policies").select("enabled").eq("ops_account_id", ops.ops_account_id).maybeSingle(),
  ]);
  if (!identity?.enabled || identity.role !== "OPS_ADMIN" ||
      identity.ops_account_id !== ops.ops_account_id ||
      account?.status !== "ACTIVE" || policy?.enabled !== true) return null;
  return { role: "ops", identityId: identity.id, opsAccountId: ops.ops_account_id };
}
const MAX_ROWS = 200;
type Granted = NonNullable<Awaited<ReturnType<typeof authorized>>>;
async function report(db: DB, who: Granted, action: string, origin: string | null, scopedOpsId: string | null, requestedUserId: string | null) {
  if (action === "clients") {
    let q = db.from("client_accounts")
      .select("user_id,ops_account_id,kyc_status,login_enabled,trading_enabled,withdrawal_enabled,vip_level,account_type,created_at")
      .order("created_at", { ascending: false }).limit(MAX_ROWS);
    if (scopedOpsId) q = q.eq("ops_account_id", scopedOpsId);
    if (requestedUserId) q = q.eq("user_id", requestedUserId);
    const { data: accounts, error } = await q;
    if (error) return json({ error: "CLIENT_LIST_UNAVAILABLE" }, 503, origin);
    const userIds = (accounts || []).map((a) => a.user_id);
    let byId: Record<string, { display_name: string | null; username: string | null; phone: string | null; email: string | null }> = {};
    if (userIds.length) {
      const { data: identities, error: identityError } = await db.from("identities")
        .select("id,display_name,username,phone,email").in("id", userIds).eq("role", "CLIENT");
      if (identityError) return json({ error: "IDENTITIES_UNAVAILABLE" }, 503, origin);
      byId = Object.fromEntries((identities || []).map((i) => [i.id, i]));
    }
    return json({
      rows: (accounts || []).map((a) => ({
        ...a, name: byId[a.user_id]?.display_name || byId[a.user_id]?.username || "—",
        phone: byId[a.user_id]?.phone ?? null,
        email: byId[a.user_id]?.email ?? null,
      })),
      limit: MAX_ROWS, possiblyMore: (accounts || []).length === MAX_ROWS,
    }, 200, origin);
  }
  if (action === "orders" || action === "cash") {
    const table = action === "orders" ? "orders" : "cash_requests";
    const columns = action === "orders"
      ? "id,user_id,ops_account_id,security_id,side,order_type,quantity,reference_price,limit_price,currency,state,created_at"
      : "id,user_id,ops_account_id,type,currency,amount,status,created_at,reviewed_at,completed_at";
    let q = db.from(table).select(columns).order("created_at", { ascending: false }).limit(MAX_ROWS);
    if (scopedOpsId) q = q.eq("ops_account_id", scopedOpsId);
    if (requestedUserId) q = q.eq("user_id", requestedUserId);
    const { data, error } = await q;
    if (error) return json({ error: "REPORT_UNAVAILABLE" }, 503, origin);
    return json({ rows: data || [], limit: MAX_ROWS, possiblyMore: (data || []).length === MAX_ROWS }, 200, origin);
  }
  if (action === "positions") {
    let allowedIds: string[] | null = null;
    // A sub-account must never read unowned holdings. Master accounts can
    // optionally drill down to a single operations account.
    if (scopedOpsId) {
      const { data: members, error } = await db.from("client_accounts")
        .select("user_id").eq("ops_account_id", scopedOpsId).limit(1001);
      if (error) return json({ error: "ACCOUNT_SCOPE_UNAVAILABLE" }, 503, origin);
      allowedIds = (members || []).map((m) => m.user_id);
      if (!allowedIds.length || (requestedUserId && !allowedIds.includes(requestedUserId))) {
        return json({ rows: [], limit: MAX_ROWS, possiblyMore: false }, 200, origin);
      }
      if (allowedIds.length > 1000) {
        return json({ error: "SCOPE_TOO_LARGE_USE_PAGINATION" }, 422, origin);
      }
    }
    let q = db.from("positions").select("user_id,security_id,quantity,average_cost,currency,updated_at")
      .order("updated_at", { ascending: false }).limit(MAX_ROWS);
    if (requestedUserId) q = q.eq("user_id", requestedUserId);
    else if (allowedIds) q = q.in("user_id", allowedIds);
    const { data, error } = await q;
    if (error) return json({ error: "POSITIONS_UNAVAILABLE" }, 503, origin);
    return json({ rows: data || [], limit: MAX_ROWS, possiblyMore: (data || []).length === MAX_ROWS }, 200, origin);
  }
  return json({ error: "UNKNOWN_REPORT" }, 404, origin);
}
Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(origin) });
  if (req.method !== "GET") return json({ error: "READ_ONLY_API" }, 405, origin);
  try {
    const db = service();
    const who = await authorized(db, req);
    if (!who) return json({ error: "AUTHORIZED_ADMIN_SESSION_REQUIRED" }, 401, origin);
    const params = new URL(req.url).searchParams;
    const action = params.get("action") || "";
    const opsFilter = params.get("ops_account_id")?.trim() || null;
    const userFilter = params.get("user_id")?.trim() || null;
    for (const id of [opsFilter, userFilter]) {
      if (id && (id.length > 128 || !/^[A-Za-z0-9_-]+$/.test(id))) {
        return json({ error: "INVALID_SCOPE_FILTER" }, 422, origin);
      }
    }
    if (who.role === "ops" && opsFilter && opsFilter !== who.opsAccountId) {
      return json({ error: "OUTSIDE_ACCOUNT_SCOPE" }, 403, origin);
    }
    // The server always overrides a sub-account's scope with its own ID.
    const scopedOpsId = who.role === "ops" ? who.opsAccountId : opsFilter;
    return await report(db, who, action, origin, scopedOpsId, userFilter);
  } catch (err) {
    console.error("reporting gateway failure", err instanceof Error ? err.message : "unknown");
    return json({ error: "REPORTING_UNAVAILABLE" }, 503, origin);
  }
});
