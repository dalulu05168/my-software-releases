// REVIEW-ONLY SOURCE: deploy only to a segregated test environment after approval.
// Requires a review-approved SQL function project4_login_client_checked.
// Required environment: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, PROJECT4_ALLOWED_ORIGINS.
// No service_role key is sent to the browser. No transfers/orders/withdrawals are processed.
import { createClient } from "npm:@supabase/supabase-js@2.57.0";

type Db = ReturnType<typeof createClient>;
type ErrorCode = "CLIENT_SESSION_REQUIRED" | "CLIENT_SESSION_INVALID" | "CLIENT_SESSION_EXPIRED";

function getAllowedOrigin(req: Request): string | null {
  const origin = req.headers.get("origin");
  if (!origin) return null; // Server-to-server calls still require token/credentials.
  const allowed = (Deno.env.get("PROJECT4_ALLOWED_ORIGINS") || "")
    .split(",").map((item) => item.trim()).filter(Boolean);
  return allowed.includes(origin) ? origin : "";
}

function respond(req: Request, value: unknown, status = 200): Response {
  const origin = getAllowedOrigin(req);
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...(origin ? { "access-control-allow-origin": origin, vary: "Origin" } : {}),
    },
  });
}

function forbiddenOrigin(req: Request): boolean {
  return getAllowedOrigin(req) === "";
}

function sessionToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function serviceClient(): Db {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("SERVER_NOT_CONFIGURED");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function bearer(req: Request): string {
  const header = req.headers.get("authorization") || "";
  return header.startsWith("Bearer ") ? header.slice(7).trim() : "";
}

type ClientSession = { id: string; user_id: string; ops_account_id: string };
async function requireSession(db: Db, req: Request): Promise<ClientSession | ErrorCode> {
  const token = bearer(req);
  if (!/^[0-9a-f]{64}$/.test(token)) return "CLIENT_SESSION_REQUIRED";
  const digest = await sha256Hex(token);
  const { data: session, error } = await db.from("client_sessions")
    .select("id,user_id,ops_account_id,expires_at,revoked_at")
    .eq("token_digest", digest).maybeSingle();
  if (error || !session) return "CLIENT_SESSION_INVALID";
  if (session.revoked_at || new Date(session.expires_at).getTime() <= Date.now())
    return "CLIENT_SESSION_EXPIRED";

  const [{ data: identity }, { data: account }, { data: ops }] = await Promise.all([
    db.from("identities").select("id,enabled,role").eq("id", session.user_id).maybeSingle(),
    db.from("client_accounts").select("user_id,ops_account_id,login_enabled")
      .eq("user_id", session.user_id).maybeSingle(),
    db.from("ops_accounts").select("id,status").eq("id", session.ops_account_id).maybeSingle(),
  ]);
  if (!identity?.enabled || identity.role !== "CLIENT" || !account?.login_enabled
    || account.ops_account_id !== session.ops_account_id || ops?.status !== "ACTIVE")
    return "CLIENT_SESSION_INVALID";
  return { id: session.id, user_id: session.user_id, ops_account_id: session.ops_account_id };
}

async function portfolio(db: Db, session: ClientSession) {
  // Per-user SQL filters are mandatory. Client-supplied userId is never trusted.
  const [orderResult, cashResult, positionResult] = await Promise.all([
    db.from("orders")
      .select("id,security_id,product_id,side,order_type,quantity,reference_price,currency,state,created_at")
      .eq("user_id", session.user_id).eq("ops_account_id", session.ops_account_id)
      .order("created_at", { ascending: false }).limit(100),
    db.from("cash_requests")
      .select("id,type,currency,amount,status,created_at")
      .eq("user_id", session.user_id).eq("ops_account_id", session.ops_account_id)
      .order("created_at", { ascending: false }).limit(100),
    db.from("positions")
      .select("security_id,quantity,average_cost,currency,updated_at")
      .eq("user_id", session.user_id).limit(100),
  ]);
  if (orderResult.error || cashResult.error || positionResult.error)
    throw new Error("PORTFOLIO_QUERY_FAILED");

  const orders = orderResult.data || [];
  const cashRequests = cashResult.data || [];
  const positions = positionResult.data || [];
  const securityIds = [...new Set([
    ...orders.map((row) => row.security_id),
    ...positions.map((row) => row.security_id),
  ].filter(Boolean))];
  const securities = securityIds.length
    ? await db.from("securities").select("id,symbol,name,market,currency")
        .in("id", securityIds).limit(200)
    : { data: [], error: null };
  if (securities.error) throw new Error("SECURITIES_QUERY_FAILED");

  return {
    orders,
    cashRequests,
    positions,
    securities: securities.data || [],
    // Balances must be computed from verified ledger legs, never sample numbers.
    balances: null,
    readOnly: true,
  };
}

Deno.serve(async (req: Request) => {
  if (forbiddenOrigin(req)) return respond(req, { error: "ORIGIN_NOT_ALLOWED" }, 403);
  if (req.method === "OPTIONS") {
    const origin = getAllowedOrigin(req);
    return new Response(null, {
      status: 204,
      headers: {
        ...(origin ? { "access-control-allow-origin": origin, vary: "Origin" } : {}),
        "access-control-allow-methods": "GET, POST, OPTIONS",
        "access-control-allow-headers": "authorization,content-type",
        "access-control-max-age": "600",
      },
    });
  }

  try {
    const db = serviceClient();

    if (req.method === "POST") {
      const body = await req.json().catch(() => null);
      const action = typeof body?.action === "string" ? body.action : "";
      if (action === "login_client") {
        const login = String(body?.login || "").trim();
        const password = String(body?.password || "");
        if (login.length < 3 || login.length > 254 || !password || password.length > 256)
          return respond(req, { error: "INVALID_CREDENTIALS" }, 401);

        const { data: check, error: checkError } = await db.rpc("project4_login_client_checked", {
          p_login: login,
          p_password: password,
        });
        if (checkError) return respond(req, { error: "LOGIN_SERVICE_NOT_READY" }, 503);
        if (!check?.ok)
          return respond(req, { error: check?.error || "INVALID_CREDENTIALS" },
            check?.error === "ACCOUNT_TEMPORARILY_LOCKED" ? 423 : 401);

        const token = sessionToken();
        const digest = await sha256Hex(token);
        const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString();
        const { error: insertError } = await db.from("client_sessions").insert({
          token_digest: digest,
          user_id: check.userId,
          ops_account_id: check.opsAccountId,
          expires_at: expiresAt,
        });
        if (insertError) return respond(req, { error: "CLIENT_SESSION_CREATE_FAILED" }, 503);
        return respond(req, {
          ok: true, role: "client", sessionToken: token,
          expiresAt, displayName: check.displayName,
        });
      }
      if (action === "logout_client") {
        const session = await requireSession(db, req);
        if (typeof session === "string") return respond(req, { error: session }, 401);
        const { error } = await db.from("client_sessions")
          .update({ revoked_at: new Date().toISOString() }).eq("id", session.id);
        if (error) return respond(req, { error: "CLIENT_LOGOUT_FAILED" }, 503);
        return respond(req, { ok: true });
      }
      return respond(req, { error: "ACTION_UNSUPPORTED" }, 404);
    }

    if (req.method === "GET" && new URL(req.url).searchParams.get("resource") === "portfolio") {
      const session = await requireSession(db, req);
      if (typeof session === "string") return respond(req, { error: session }, 401);
      return respond(req, await portfolio(db, session));
    }
    return respond(req, { error: "METHOD_NOT_ALLOWED" }, 405);
  } catch (_error) {
    // Never send backend stack traces, credential materials or SQL details to clients.
    return respond(req, { error: "CLIENT_API_UNAVAILABLE" }, 503);
  }
});
