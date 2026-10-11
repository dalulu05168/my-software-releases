import { createClient } from "npm:@supabase/supabase-js@2";

// Dedicated, non-transactional client gateway. Never place service keys in browser bundles.
// Client creation and password provisioning are intentionally NOT available from this public function.
// Password format: pbkdf2_sha256$600000$<hex salt>$<hex digest>.
// A user must already have a CLIENT identity, client_accounts row, scoped OPS account,
// and a password_hash securely provisioned by a privileged, audited process.
const allowedOrigins = new Set([
  "https://p004-trading-light-ui-preview-20261011.onrender.com",
  "https://brantone-veyor-trading.onrender.com",
  "https://jiaoyipingtai-app.floot.app",
]);

type DB = ReturnType<typeof createClient>;

function cors(origin: string | null): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": origin && allowedOrigins.has(origin) ? origin : "null",
    "Access-Control-Allow-Headers": "content-type, authorization",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Vary": "Origin",
    "Cache-Control": "no-store",
  };
}
function json(body: unknown, status: number, origin: string | null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors(origin), "Content-Type": "application/json; charset=utf-8" },
  });
}
function adminDb(): DB {
  const url = Deno.env.get("SUPABASE_URL");
  let key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const modern = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (modern) {
    try {
      const parsed = JSON.parse(modern);
      key = parsed.default || key;
    } catch {
      /* Retain legacy key if key dictionary is malformed. */
    }
  }
  if (!url || !key) throw new Error("SECURE_BACKEND_NOT_CONFIGURED");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
function asHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
async function sha256(input: string): Promise<string> {
  return asHex(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input))));
}
function secureSameLength(a: Uint8Array, b: Uint8Array): boolean {
  let difference = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    difference |= (a[i] ?? 0) ^ (b[i] ?? 0);
  }
  return difference === 0;
}
function hexBytes(s: string): Uint8Array {
  const bytes = new Uint8Array(s.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = Number.parseInt(s.substring(i * 2, i * 2 + 2), 16);
  return bytes;
}
async function verifyPassword(password: string, encoded: string): Promise<boolean> {
  const segments = encoded.split("$");
  if (
    segments.length !== 4 ||
    segments[0] !== "pbkdf2_sha256" ||
    !/^\d{6,7}$/.test(segments[1]) ||
    !/^[a-f0-9]{32,128}$/i.test(segments[2]) ||
    !/^[a-f0-9]{64}$/i.test(segments[3])
  ) return false;
  const iterations = Number(segments[1]);
  if (iterations < 310000 || iterations > 1000000) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const derived = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", iterations, salt: hexBytes(segments[2]) },
    key,
    256,
  );
  return secureSameLength(new Uint8Array(derived), hexBytes(segments[3]));
}
function token(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}
function bearer(req: Request): string {
  const header = req.headers.get("authorization") || "";
  return header.startsWith("Bearer ") ? header.slice(7).trim() : "";
}
async function resolveClient(db: DB, req: Request) {
  const accessToken = bearer(req);
  if (accessToken.length < 32 || accessToken.length > 200) return null;
  const digest = await sha256(accessToken);
  const { data: session, error } = await db.from("client_sessions")
    .select("id,user_id,ops_account_id,expires_at,revoked_at")
    .eq("token_digest", digest).maybeSingle();
  if (error || !session || session.revoked_at || Date.parse(session.expires_at) <= Date.now()) return null;
  const { data: identity } = await db.from("identities")
    .select("id,role,enabled,display_name,username,email,ops_account_id")
    .eq("id", session.user_id).maybeSingle();
  if (!identity || !identity.enabled || identity.role !== "CLIENT" ||
      identity.ops_account_id !== session.ops_account_id) return null;
  const { data: account } = await db.from("client_accounts")
    .select("user_id,ops_account_id,login_enabled,kyc_status,vip_level,account_type")
    .eq("user_id", session.user_id).maybeSingle();
  if (!account || !account.login_enabled || account.ops_account_id !== session.ops_account_id) return null;
  const { data: owner } = await db.from("ops_accounts").select("status").eq("id", session.ops_account_id).maybeSingle();
  if (!owner || owner.status !== "ACTIVE") return null;
  return { session, identity, account, digest };
}
async function login(db: DB, payload: Record<string, unknown>, origin: string | null) {
  const accountInput = typeof payload.account === "string" ? payload.account.trim() : "";
  const password = typeof payload.password === "string" ? payload.password : "";
  if (accountInput.length < 3 || accountInput.length > 160 || password.length < 8 || password.length > 256)
    return json({ error: "INVALID_CREDENTIALS" }, 401, origin);
  const column = accountInput.includes("@") ? "email" : /^\+[\d\s-]{7,22}$/.test(accountInput) ? "phone" : "username";
  const value = column === "email" ? accountInput.toLowerCase() : accountInput;
  const { data: identity } = await db.from("identities")
    .select("id,role,enabled,display_name,username,ops_account_id")
    .eq(column, value).eq("role", "CLIENT").maybeSingle();
  if (!identity || !identity.enabled || !identity.ops_account_id)
    return json({ error: "INVALID_CREDENTIALS" }, 401, origin);
  const { data: owner } = await db.from("ops_accounts").select("status").eq("id", identity.ops_account_id).maybeSingle();
  const { data: account } = await db.from("client_accounts")
    .select("user_id,login_enabled,ops_account_id")
    .eq("user_id", identity.id).maybeSingle();
  if (!owner || owner.status !== "ACTIVE" || !account?.login_enabled ||
      account.ops_account_id !== identity.ops_account_id)
    return json({ error: "INVALID_CREDENTIALS" }, 401, origin);
  const { data: auth } = await db.from("client_auth")
    .select("user_id,password_hash,failed_login_attempts,locked_until")
    .eq("user_id", identity.id).maybeSingle();
  if (!auth) return json({ error: "INVALID_CREDENTIALS" }, 401, origin);
  if (auth.locked_until && Date.parse(auth.locked_until) > Date.now())
    return json({ error: "ACCOUNT_TEMPORARILY_LOCKED" }, 423, origin);
  const valid = await verifyPassword(password, auth.password_hash);
  if (!valid) {
    const attempts = (Number(auth.failed_login_attempts) || 0) + 1;
    await db.from("client_auth").update({
      failed_login_attempts: attempts,
      locked_until: attempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000).toISOString() : null,
      updated_at: new Date().toISOString(),
    }).eq("user_id", identity.id);
    return json({ error: "INVALID_CREDENTIALS" }, 401, origin);
  }
  await db.from("client_auth").update({
    failed_login_attempts: 0, locked_until: null, updated_at: new Date().toISOString(),
  }).eq("user_id", identity.id);
  const plainToken = token();
  const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString();
  await db.from("client_sessions").update({ revoked_at: new Date().toISOString() })
    .eq("user_id", identity.id).is("revoked_at", null);
  const { error: sessionError } = await db.from("client_sessions").insert({
    user_id: identity.id,
    ops_account_id: identity.ops_account_id,
    token_digest: await sha256(plainToken),
    expires_at: expiresAt,
  });
  if (sessionError) return json({ error: "SESSION_CREATE_FAILED" }, 500, origin);
  return json({
    ok: true, role: "client", sessionToken: plainToken, expiresAt,
    displayName: identity.display_name || identity.username || "Client",
  }, 200, origin);
}
async function readPortfolio(db: DB, client: NonNullable<Awaited<ReturnType<typeof resolveClient>>>, origin: string | null) {
  const id = client.identity.id;
  // Strictly enforce user-scoped queries: service role bypasses RLS.
  const [positionResult, orderResult] = await Promise.all([
    db.from("positions").select("security_id,quantity,average_cost,currency,updated_at")
      .eq("user_id", id).order("updated_at", { ascending: false }).limit(100),
    db.from("orders").select("id,security_id,side,order_type,quantity,reference_price,limit_price,currency,state,created_at")
      .eq("user_id", id).order("created_at", { ascending: false }).limit(100),
  ]);
  if (positionResult.error || orderResult.error)
    return json({ error: "ACCOUNT_DATA_UNAVAILABLE" }, 503, origin);
  const positions = positionResult.data || [];
  const securitiesIds = Array.from(new Set(positions.map((p) => p.security_id).filter(Boolean)));
  let nameBySecurity: Record<string, { symbol: string; name: string }> = {};
  if (securitiesIds.length) {
    const { data: securities, error } = await db.from("securities")
      .select("id,symbol,name").in("id", securitiesIds);
    if (error) return json({ error: "SECURITY_DATA_UNAVAILABLE" }, 503, origin);
    nameBySecurity = Object.fromEntries((securities || []).map((r) =>
      [r.id, { symbol: r.symbol, name: r.name }]));
  }
  return json({
    ok: true, name: client.identity.display_name || client.identity.username || "Client",
    kycStatus: client.account.kyc_status,
    vipLevel: client.account.vip_level,
    accountType: client.account.account_type,
    positions: positions.map((p) => ({ ...p, security: nameBySecurity[p.security_id] || null })),
    orders: orderResult.data || [],
    balances: null, // NO invented balance: ledger valuation requires separate audited endpoint.
    balanceStatus: "NOT_YET_INTEGRATED",
    orderSubmissionEnabled: false,
    limitedToLatest: 100,
  }, 200, origin);
}

async function signup(db: DB, payload: Record<string,unknown>, origin: string|null, request: Request) {
 const name=typeof payload.name==="string"?payload.name.trim():"";
 const email=typeof payload.email==="string"?payload.email.trim().toLowerCase():"";
 const password=typeof payload.password==="string"?payload.password:"";
 const invite=typeof payload.invite==="string"?payload.invite.trim():"";
 if(name.length<2||name.length>100||! /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>160||password.length<12||password.length>128||!/[A-Z]/.test(password)||!/[a-z]/.test(password)||!/[0-9]/.test(password)||!/^[0-9]{6}$/.test(invite)){
   return json({error:"INVALID_SIGNUP_INPUT"},400,origin);
 }
 const encoder=new TextEncoder();
 const hex=(bytes:Uint8Array)=>Array.from(bytes,b=>b.toString(16).padStart(2,"0")).join("");
 const inviteDigest=await sha256(invite);
 const clientAddress=(request.headers.get("cf-connecting-ip")||"").trim();
 // Do not trust spoofable forwarded headers. Cloudflare edge provides cf-connecting-ip in Supabase hosting.
 const rateKey=await sha256("p004-signup:"+clientAddress+":"+email);
 const salt=crypto.getRandomValues(new Uint8Array(16));
 const key=await crypto.subtle.importKey("raw",encoder.encode(password),"PBKDF2",false,["deriveBits"]);
 const derived=await crypto.subtle.deriveBits({name:"PBKDF2",hash:"SHA-256",iterations:600000,salt},key,256);
 const stored="pbkdf2_sha256$600000$"+hex(salt)+"$"+hex(new Uint8Array(derived));
 const {data,error}=await db.rpc("register_client_with_invite",{
 p_request_key:rateKey,p_invite_digest:inviteDigest,p_name:name,p_email:email,p_password_hash:stored
 });
 if(error){console.error("signup rpc failed",error.code);return json({error:"SIGNUP_UNAVAILABLE"},503,origin);}
 if(data?.ok!==true) {
 const code=data?.code==="RATE_LIMITED"?"RATE_LIMITED":data?.code==="INVALID_INPUT"?"INVALID_SIGNUP_INPUT":"INVALID_INVITE_OR_ACCOUNT";
 return json({error:code},code==="RATE_LIMITED"?429:400,origin);
 }
 return json({ok:true,status:"PENDING_REVIEW",message:"Registration received. Identity verification required before trading."},201,origin);
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(origin) });
  if (!["GET", "POST"].includes(req.method)) return json({ error: "METHOD_NOT_ALLOWED" }, 405, origin);
  const url = new URL(req.url);
  try {
    const db = adminDb();
    if (req.method === "POST" && url.searchParams.get("action") === "register") {
      const input=await req.json().catch(()=>({}));
      return signup(db,input,origin,req);
    }
    if (req.method === "POST" && url.searchParams.get("action") === "login") {
      const input = await req.json().catch(() => ({}));
      return login(db, input, origin);
    }
    const client = await resolveClient(db, req);
    if (!client) return json({ error: "CLIENT_SESSION_REQUIRED" }, 401, origin);
    if (req.method === "POST" && url.searchParams.get("action") === "logout") {
      await db.from("client_sessions").update({ revoked_at: new Date().toISOString() })
        .eq("id", client.session.id);
      return json({ ok: true }, 200, origin);
    }
    if (req.method === "GET" && url.searchParams.get("action") === "portfolio")
      return readPortfolio(db, client, origin);
    if (req.method === "GET" && url.searchParams.get("action") === "me") {
      return json({ ok: true, role: "client", displayName: client.identity.display_name ||
        client.identity.username || "Client", vipLevel: client.account.vip_level }, 200, origin);
    }
    return json({ error: "UNKNOWN_ACTION" }, 404, origin);
  } catch (error) {
    console.error("client API error", error instanceof Error ? error.message : "unknown");
    return json({ error: "SERVICE_UNAVAILABLE" }, 503, origin);
  }
});
