import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const getAdminClient = () => {
  const url = Deno.env.get("SUPABASE_URL")!;
  let key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const modern = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (modern) {
    try {
      const parsed = JSON.parse(modern);
      key = parsed.default || key;
    } catch {
      // Legacy service role fallback below.
    }
  }
  if (!url || !key) throw new Error("SUPABASE_ADMIN_CONFIG_MISSING");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
};

async function sha256Hex(input: string) {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function randomToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function generateTotpSecret() {
  const bytes = crypto.getRandomValues(new Uint8Array(20));
  let bits = "";
  for (const byte of bytes) bits += byte.toString(2).padStart(8, "0");
  let out = "";
  for (let i = 0; i < bits.length; i += 5) {
    out += BASE32_ALPHABET[parseInt(bits.slice(i, i + 5).padEnd(5, "0"), 2)];
  }
  return out.slice(0, 32);
}

// Fixed six-digit customer invitation code; not a 2FA time-based code.
// Use Web Crypto rejection sampling to avoid modulo bias, including "000000".
function generateInviteCode(): string {
  const limit = Math.floor(0x100000000 / 1_000_000) * 1_000_000;
  let value: number;
  do {
    value = crypto.getRandomValues(new Uint32Array(1))[0];
  } while (value >= limit);
  return String(value % 1_000_000).padStart(6, "0");
}

function makeOtpAuthUri(username: string, secret: string) {
  const issuer = "Brantone Veylor";
  const label = `${issuer}:${username}`;
  return `otpauth://totp/${encodeURIComponent(label)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
}

function bearer(req: Request) {
  const value = req.headers.get("authorization") || "";
  return value.startsWith("Bearer ") ? value.slice(7).trim() : "";
}

async function requireMasterSession(supabase: ReturnType<typeof getAdminClient>, req: Request) {
  const token = bearer(req);
  if (!token) return { error: "MASTER_SESSION_REQUIRED" as const };

  const digest = await sha256Hex(token);
  const { data: session, error } = await supabase
    .from("master_sessions")
    .select("id,identity_id,expires_at,revoked_at")
    .eq("token_digest", digest)
    .maybeSingle();

  if (error || !session) return { error: "MASTER_SESSION_INVALID" as const };
  if (session.revoked_at || new Date(session.expires_at).getTime() <= Date.now()) {
    return { error: "MASTER_SESSION_EXPIRED" as const };
  }

  const { data: identity } = await supabase
    .from("identities")
    .select("id,role,enabled,display_name,username")
    .eq("id", session.identity_id)
    .maybeSingle();

  if (!identity || identity.role !== "MASTER_ADMIN" || !identity.enabled) {
    return { error: "MASTER_SESSION_INVALID" as const };
  }

  await supabase
    .from("master_sessions")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("id", session.id);

  return { session, identity };
}

async function listSecurities(
  supabase: ReturnType<typeof getAdminClient>,
  admin: boolean,
) {
  let query = supabase
    .from("securities")
    .select("id,market,symbol,name,currency,status,visible,tradable,block_eligible,ipo_related,purchase_authorization_mode,market_data_provider_key,reference_provider,provider_exchange,mic_code,country,instrument_type,provider_synced_at,created_at,updated_at")
    .order("market", { ascending: true })
    .order("symbol", { ascending: true });

  if (!admin) {
    query = query.eq("visible", true).eq("status", "ACTIVE");
  }

  const { data: rows, error } = await query;
  if (error) throw error;

  const ids = (rows || []).map((row) => row.id);
  const quoteBySecurity = new Map<string, any>();

  if (ids.length) {
    const { data: quotes } = await supabase
      .from("market_quote_snapshots")
      .select("security_id,last_price,percent_change,provider_timestamp,captured_at")
      .in("security_id", ids)
      .order("captured_at", { ascending: false });

    for (const quote of quotes || []) {
      if (!quoteBySecurity.has(quote.security_id)) {
        quoteBySecurity.set(quote.security_id, quote);
      }
    }
  }

  return (rows || []).map((row) => {
    const quote = quoteBySecurity.get(row.id);
    return {
      id: row.id,
      market: row.market,
      symbol: row.symbol,
      name: row.name,
      currency: row.currency,
      status: row.status,
      visible: row.visible,
      tradable: row.tradable,
      blockEligible: row.block_eligible,
      ipoRelated: row.ipo_related,
      purchaseAuthorizationMode: row.purchase_authorization_mode,
      marketDataProviderKey: row.market_data_provider_key,
      referenceProvider: row.reference_provider,
      providerExchange: row.provider_exchange,
      micCode: row.mic_code,
      country: row.country,
      instrumentType: row.instrument_type,
      providerSyncedAt: row.provider_synced_at,
      updatedAt: row.updated_at,
      quote: quote
        ? {
            lastPrice: quote.last_price,
            percentChange: quote.percent_change,
            providerTimestamp: quote.provider_timestamp,
          }
        : null,
    };
  });
}

async function recordFailedLogin(
  supabase: ReturnType<typeof getAdminClient>,
  identityId: string,
  previous: number,
) {
  const next = previous + 1;
  const patch: Record<string, unknown> = {
    failed_login_attempts: next,
    updated_at: new Date().toISOString(),
  };
  if (next >= 5) {
    patch.locked_until = new Date(Date.now() + 15 * 60 * 1000).toISOString();
  }
  await supabase.from("master_account_auth").update(patch).eq("identity_id", identityId);
}

async function recordFailedOpsLogin(
  supabase: ReturnType<typeof getAdminClient>,
  identityId: string,
  previous: number,
) {
  const next = previous + 1;
  const patch: Record<string, unknown> = {
    failed_login_attempts: next,
    updated_at: new Date().toISOString(),
  };
  if (next >= 5) {
    patch.locked_until = new Date(Date.now() + 15 * 60 * 1000).toISOString();
  }
  await supabase.from("ops_account_auth").update(patch).eq("identity_id", identityId);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = getAdminClient();
    const url = new URL(req.url);

    if (req.method === "GET") {
      const scope = url.searchParams.get("scope") || "client";
      if (scope === "admin") {
        const auth = await requireMasterSession(supabase, req);
        if ("error" in auth) return json({ error: auth.error }, 401);
        return json({ securities: await listSecurities(supabase, true) });
      }
      return json({ securities: await listSecurities(supabase, false) });
    }

    if (req.method !== "POST") return json({ error: "METHOD_NOT_ALLOWED" }, 405);

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || "");

    if (action === "login_admin") {
      const username = String(body?.username || "").trim();
      const password = String(body?.password || "");
      const totp = String(body?.totp || "").trim();

      if (!username || !password || !/^\d{6}$/.test(totp)) {
        return json({ error: "INVALID_LOGIN_INPUT" }, 400);
      }

      const { data: identity } = await supabase
        .from("identities")
        .select("id,username,display_name,enabled,role,ops_account_id")
        .eq("username", username)
        .in("role", ["MASTER_ADMIN", "OPS_ADMIN"])
        .maybeSingle();

      if (!identity || !identity.enabled) {
        return json({ error: "INVALID_CREDENTIALS" }, 401);
      }

      if (identity.role === "MASTER_ADMIN") {
        const { data: authRow } = await supabase
          .from("master_account_auth")
          .select("totp_enabled,failed_login_attempts,locked_until")
          .eq("identity_id", identity.id)
          .maybeSingle();

        if (!authRow) return json({ error: "INVALID_CREDENTIALS" }, 401);
        if (authRow.locked_until && new Date(authRow.locked_until).getTime() > Date.now()) {
          return json({ error: "ACCOUNT_TEMPORARILY_LOCKED" }, 423);
        }

        const { data: passwordOk, error: passwordError } = await supabase.rpc(
          "project4_verify_master_password",
          { p_identity_id: identity.id, p_password: password },
        );
        if (passwordError || passwordOk !== true) {
          await recordFailedLogin(supabase, identity.id, authRow.failed_login_attempts || 0);
          return json({ error: "INVALID_CREDENTIALS" }, 401);
        }

        if (authRow.totp_enabled) {
          const { data: totpOk, error: totpError } = await supabase.rpc(
            "project4_verify_totp",
            { p_identity_id: identity.id, p_scope: "MASTER", p_token: totp },
          );
          if (totpError || totpOk !== true) {
            await recordFailedLogin(supabase, identity.id, authRow.failed_login_attempts || 0);
            return json({ error: "INVALID_TOTP" }, 401);
          }
        }

        await supabase.from("master_account_auth").update({
          failed_login_attempts: 0,
          locked_until: null,
          updated_at: new Date().toISOString(),
        }).eq("identity_id", identity.id);

        const sessionToken = randomToken();
        const tokenDigest = await sha256Hex(sessionToken);
        const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString();

        await supabase.from("master_sessions").update({
          revoked_at: new Date().toISOString(),
        }).eq("identity_id", identity.id).is("revoked_at", null);

        const { error: sessionError } = await supabase.from("master_sessions").insert({
          token_digest: tokenDigest,
          identity_id: identity.id,
          expires_at: expiresAt,
        });
        if (sessionError) throw sessionError;

        return json({
          ok: true,
          sessionToken,
          expiresAt,
          role: "master",
          displayName: identity.display_name || identity.username || "Master Admin",
        });
      }

      const { data: opsAccount } = await supabase
        .from("ops_accounts")
        .select("id,name,status")
        .eq("id", identity.ops_account_id)
        .maybeSingle();

      if (!opsAccount || opsAccount.status !== "ACTIVE") {
        return json({ error: "ACCOUNT_SUSPENDED" }, 403);
      }

      const { data: authRow } = await supabase
        .from("ops_account_auth")
        .select("totp_enabled,failed_login_attempts,locked_until")
        .eq("identity_id", identity.id)
        .maybeSingle();

      if (!authRow) return json({ error: "INVALID_CREDENTIALS" }, 401);
      if (authRow.locked_until && new Date(authRow.locked_until).getTime() > Date.now()) {
        return json({ error: "ACCOUNT_TEMPORARILY_LOCKED" }, 423);
      }

      const { data: passwordOk, error: passwordError } = await supabase.rpc(
        "project4_verify_ops_password",
        { p_identity_id: identity.id, p_password: password },
      );
      if (passwordError || passwordOk !== true) {
        await recordFailedOpsLogin(supabase, identity.id, authRow.failed_login_attempts || 0);
        return json({ error: "INVALID_CREDENTIALS" }, 401);
      }

      if (authRow.totp_enabled) {
        const { data: totpOk, error: totpError } = await supabase.rpc(
          "project4_verify_totp",
          { p_identity_id: identity.id, p_scope: "OPS", p_token: totp },
        );
        if (totpError || totpOk !== true) {
          await recordFailedOpsLogin(supabase, identity.id, authRow.failed_login_attempts || 0);
          return json({ error: "INVALID_TOTP" }, 401);
        }
      }

      await supabase.from("ops_account_auth").update({
        failed_login_attempts: 0,
        locked_until: null,
        totp_last_verified_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("identity_id", identity.id);

      const sessionToken = randomToken();
      const tokenDigest = await sha256Hex(sessionToken);
      const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString();

      await supabase.from("ops_sessions").update({
        revoked_at: new Date().toISOString(),
      }).eq("identity_id", identity.id).is("revoked_at", null);

      const { error: sessionError } = await supabase.from("ops_sessions").insert({
        token_digest: tokenDigest,
        identity_id: identity.id,
        ops_account_id: opsAccount.id,
        expires_at: expiresAt,
      });
      if (sessionError) throw sessionError;

      return json({
        ok: true,
        sessionToken,
        expiresAt,
        role: "ops",
        displayName: identity.display_name || opsAccount.name || identity.username || "Operations Admin",
        opsAccountId: opsAccount.id,
      });
    }

    if (action === "login_master") {
      const username = String(body?.username || "").trim();
      const password = String(body?.password || "");
      const totp = String(body?.totp || "").trim();

      if (!username || !password || !/^\d{6}$/.test(totp)) {
        return json({ error: "INVALID_LOGIN_INPUT" }, 400);
      }

      const { data: identity } = await supabase
        .from("identities")
        .select("id,username,display_name,enabled,role")
        .eq("username", username)
        .eq("role", "MASTER_ADMIN")
        .eq("enabled", true)
        .maybeSingle();

      if (!identity) return json({ error: "INVALID_CREDENTIALS" }, 401);

      const { data: authRow } = await supabase
        .from("master_account_auth")
        .select("totp_enabled,failed_login_attempts,locked_until")
        .eq("identity_id", identity.id)
        .maybeSingle();

      if (!authRow) return json({ error: "INVALID_CREDENTIALS" }, 401);
      if (authRow.locked_until && new Date(authRow.locked_until).getTime() > Date.now()) {
        return json({ error: "ACCOUNT_TEMPORARILY_LOCKED" }, 423);
      }

      const { data: passwordOk, error: passwordError } = await supabase.rpc(
        "project4_verify_master_password",
        { p_identity_id: identity.id, p_password: password },
      );
      if (passwordError || passwordOk !== true) {
        await recordFailedLogin(supabase, identity.id, authRow.failed_login_attempts || 0);
        return json({ error: "INVALID_CREDENTIALS" }, 401);
      }

      if (authRow.totp_enabled) {
        const { data: totpOk, error: totpError } = await supabase.rpc(
          "project4_verify_totp",
          { p_identity_id: identity.id, p_scope: "MASTER", p_token: totp },
        );
        if (totpError || totpOk !== true) {
          await recordFailedLogin(supabase, identity.id, authRow.failed_login_attempts || 0);
          return json({ error: "INVALID_TOTP" }, 401);
        }
      }

      await supabase
        .from("master_account_auth")
        .update({
          failed_login_attempts: 0,
          locked_until: null,
          updated_at: new Date().toISOString(),
        })
        .eq("identity_id", identity.id);

      const sessionToken = randomToken();
      const tokenDigest = await sha256Hex(sessionToken);
      const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString();

      await supabase
        .from("master_sessions")
        .update({ revoked_at: new Date().toISOString() })
        .eq("identity_id", identity.id)
        .is("revoked_at", null);

      const { error: sessionError } = await supabase.from("master_sessions").insert({
        token_digest: tokenDigest,
        identity_id: identity.id,
        expires_at: expiresAt,
      });
      if (sessionError) throw sessionError;

      return json({
        ok: true,
        sessionToken,
        expiresAt,
        role: "master",
        displayName: identity.display_name || identity.username || "Master Admin",
      });
    }

    const auth = await requireMasterSession(supabase, req);
    if ("error" in auth) return json({ error: auth.error }, 401);

    if (action === "list_ops_accounts") {
      const { data: accounts, error: accountsError } = await supabase
        .from("ops_accounts")
        .select("id,name,status,created_at")
        .order("created_at", { ascending: false });
      if (accountsError) throw accountsError;

      const { data: identities, error: identitiesError } = await supabase
        .from("identities")
        .select("id,ops_account_id,username,display_name,enabled")
        .eq("role", "OPS_ADMIN");
      if (identitiesError) throw identitiesError;

      const { data: policies } = await supabase
        .from("ops_account_policies")
        .select("ops_account_id,markets,enabled");

      const { data: invites } = await supabase
        .from("ops_invite_codes")
        .select("ops_account_id,display_code,status,created_at")
        .eq("status", "ACTIVE")
        .order("created_at", { ascending: false });

      const identityByAccount = new Map((identities || []).map((row) => [row.ops_account_id, row]));
      const policyByAccount = new Map((policies || []).map((row) => [row.ops_account_id, row]));
      const inviteByAccount = new Map<string, any>();
      for (const row of invites || []) {
        if (!inviteByAccount.has(row.ops_account_id)) inviteByAccount.set(row.ops_account_id, row);
      }

      return json({
        accounts: (accounts || []).map((row) => {
          const identity = identityByAccount.get(row.id);
          const policy = policyByAccount.get(row.id);
          const invite = inviteByAccount.get(row.id);
          return {
            id: row.id,
            identityId: identity?.id || null,
            name: row.name,
            username: identity?.username || "",
            manager: identity?.display_name || identity?.username || "",
            markets: policy?.markets || [],
            status: row.status,
            enabled: identity?.enabled !== false && policy?.enabled !== false,
            invite: invite?.display_code || "",
            clients: 0,
          };
        }),
      });
    }

    if (action === "create_ops_account") {
      const name = String(body?.name || "").trim();
      const username = String(body?.username || "").trim();
      const password = String(body?.password || "");
      const requestedMarkets = Array.isArray(body?.markets) ? body.markets : ["US", "MX"];
      const markets = requestedMarkets.filter((value: unknown) => value === "US" || value === "MX");

      if (name.length < 2 || name.length > 100) return json({ error: "INVALID_OPS_NAME" }, 400);
      if (!/^[A-Za-z0-9._-]{3,64}$/.test(username)) return json({ error: "INVALID_OPS_USERNAME" }, 400);
      if (password.length < 12 || password.length > 128) return json({ error: "OPS_PASSWORD_LENGTH_INVALID" }, 400);
      if (!markets.length) return json({ error: "OPS_MARKET_REQUIRED" }, 400);

      const { data: existing } = await supabase.from("identities").select("id").eq("username", username).maybeSingle();
      if (existing) return json({ error: "USERNAME_ALREADY_EXISTS" }, 409);

      const totpSecret = generateTotpSecret();
      let inviteCode = "";
      let opsAccountId = "";
      let identityId = "";

      try {
        const { data: account, error: accountError } = await supabase
          .from("ops_accounts")
          .insert({ name, status: "ACTIVE" })
          .select("id,name,status")
          .single();
        if (accountError || !account) throw accountError || new Error("OPS_ACCOUNT_CREATE_FAILED");
        opsAccountId = account.id;

        const { data: identity, error: identityError } = await supabase
          .from("identities")
          .insert({
            role: "OPS_ADMIN",
            ops_account_id: account.id,
            display_name: name,
            username,
            enabled: true,
          })
          .select("id,username,display_name")
          .single();
        if (identityError || !identity) throw identityError || new Error("OPS_IDENTITY_CREATE_FAILED");
        identityId = identity.id;

        const { error: policyError } = await supabase.from("ops_account_policies").insert({
          ops_account_id: account.id,
          enabled: true,
          markets,
        });
        if (policyError) throw policyError;

        const { data: credentialsOk, error: credentialsError } = await supabase.rpc(
          "project4_set_ops_credentials",
          { p_identity_id: identity.id, p_password: password, p_totp: totpSecret },
        );
        if (credentialsError || credentialsOk !== true) throw credentialsError || new Error("OPS_CREDENTIALS_CREATE_FAILED");

        // code_digest has a DB unique constraint. Retry any collision rather
        // than ever issuing the same invitation code to different subaccounts.
        // A code is stable after creation and can be reused for customer signup.
        let inviteSaved = false;
        for (let attempt = 0; attempt < 20; attempt++) {
          const candidate = generateInviteCode();
          const inviteDigest = await sha256Hex(candidate);
          const { error: inviteError } = await supabase.from("ops_invite_codes").insert({
            ops_account_id: account.id,
            code_digest: inviteDigest,
            display_code: candidate,
            created_by: auth.identity.id,
          });
          if (!inviteError) {
            inviteCode = candidate;
            inviteSaved = true;
            break;
          }
          if (inviteError.code !== "23505") throw inviteError;
        }
        if (!inviteSaved) throw new Error("UNIQUE_SIX_DIGIT_INVITE_EXHAUSTED");

        await supabase.from("audit_events").insert({
          actor_id: auth.identity.id,
          actor_role: "MASTER_ADMIN",
          action: "OPS_ACCOUNT_CREATED",
          entity_type: "OPS_ACCOUNT",
          entity_id: account.id,
          after_value: { username, markets },
          reason: "ADMIN_OPS_ACCOUNTS_UI",
        });

        return json({
          ok: true,
          account: {
            id: account.id,
            identityId: identity.id,
            name: account.name,
            username: identity.username,
            markets,
            status: account.status,
            invite: inviteCode,
          },
          totpSecret,
          otpauthUri: makeOtpAuthUri(username, totpSecret),
        });
      } catch (error) {
        if (identityId) await supabase.from("identities").delete().eq("id", identityId);
        if (opsAccountId) await supabase.from("ops_accounts").delete().eq("id", opsAccountId);
        throw error;
      }
    }

    if (action === "reset_ops_totp") {
      const identityId = String(body?.identityId || "");
      const { data: identity } = await supabase
        .from("identities")
        .select("id,username,ops_account_id,role,enabled")
        .eq("id", identityId)
        .eq("role", "OPS_ADMIN")
        .maybeSingle();

      if (!identity) return json({ error: "OPS_IDENTITY_NOT_FOUND" }, 404);

      const totpSecret = generateTotpSecret();
      const { error: totpError } = await supabase.rpc("project4_store_totp_secret", {
        p_identity_id: identity.id,
        p_scope: "OPS",
        p_secret: totpSecret,
      });
      if (totpError) throw totpError;

      await supabase.from("ops_sessions").update({
        revoked_at: new Date().toISOString(),
      }).eq("identity_id", identity.id).is("revoked_at", null);

      await supabase.from("audit_events").insert({
        actor_id: auth.identity.id,
        actor_role: "MASTER_ADMIN",
        action: "OPS_TOTP_RESET",
        entity_type: "OPS_ACCOUNT",
        entity_id: identity.ops_account_id,
        after_value: { username: identity.username, sessionsRevoked: true },
        reason: "ADMIN_OPS_ACCOUNTS_UI",
      });

      return json({
        ok: true,
        totpSecret,
        otpauthUri: makeOtpAuthUri(identity.username || "ops", totpSecret),
      });
    }

    if (action === "set_ops_status") {
      const opsAccountId = String(body?.opsAccountId || "");
      const status = body?.status === "SUSPENDED" ? "SUSPENDED" : "ACTIVE";

      const { error: accountError } = await supabase.from("ops_accounts").update({ status }).eq("id", opsAccountId);
      if (accountError) throw accountError;

      const enabled = status === "ACTIVE";
      const { data: identities } = await supabase
        .from("identities")
        .update({ enabled })
        .eq("ops_account_id", opsAccountId)
        .eq("role", "OPS_ADMIN")
        .select("id");

      if (!enabled) {
        const ids = (identities || []).map((row) => row.id);
        if (ids.length) {
          await supabase.from("ops_sessions").update({
            revoked_at: new Date().toISOString(),
          }).in("identity_id", ids).is("revoked_at", null);
        }
      }

      return json({ ok: true, status });
    }

    if (action === "upsert_security") {
      const symbol = String(body?.security?.symbol || "").trim().toUpperCase();
      const name = String(body?.security?.name || "").trim();
      const market = body?.security?.market === "MX" ? "MX" : "US";
      const currency = body?.security?.currency === "MXN" ? "MXN" : market === "MX" ? "MXN" : "USD";

      if (!/^[A-Z0-9.\-]{1,20}$/.test(symbol) || !name) {
        return json({ error: "INVALID_SECURITY_INPUT" }, 400);
      }

      const payload = {
        market,
        symbol,
        name,
        currency,
        status: "ACTIVE",
        visible: body?.security?.visible !== false,
        tradable: body?.security?.tradable === true,
        block_eligible: body?.security?.blockEligible === true,
        ipo_related: body?.security?.ipoRelated === true,
        purchase_authorization_mode:
          body?.security?.purchaseAuthorizationMode === "MASTER_CODE" ? "MASTER_CODE" : "OPEN",
        market_data_provider_key:
          String(body?.security?.marketDataProviderKey || "").trim() || `MANUAL:${market}:${symbol}`,
        reference_provider:
          String(body?.security?.referenceProvider || "").trim() || "MANUAL",
        provider_exchange:
          String(body?.security?.providerExchange || "").trim() || (market === "MX" ? "BMV" : "NASDAQ"),
        mic_code:
          String(body?.security?.micCode || "").trim() || (market === "MX" ? "XMEX" : "XNAS"),
        country:
          String(body?.security?.country || "").trim() || market,
        instrument_type:
          String(body?.security?.instrumentType || "").trim() || "EQUITY",
        provider_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data: security, error } = await supabase
        .from("securities")
        .upsert(payload, { onConflict: "market,symbol" })
        .select("*")
        .single();
      if (error) throw error;

      await supabase.from("audit_events").insert({
        actor_id: auth.identity.id,
        actor_role: "MASTER_ADMIN",
        action: "SECURITY_UPSERTED",
        entity_type: "SECURITY",
        entity_id: security.id,
        after_value: {
          market: security.market,
          symbol: security.symbol,
          visible: security.visible,
          tradable: security.tradable,
        },
        reason: "ADMIN_SECURITIES_UI",
      });

      return json({ ok: true, security });
    }

    if (action === "update_security") {
      const id = String(body?.id || "");
      const patch: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };

      if (typeof body?.patch?.visible === "boolean") patch.visible = body.patch.visible;
      if (typeof body?.patch?.tradable === "boolean") patch.tradable = body.patch.tradable;
      if (["ACTIVE", "SUSPENDED", "DELISTED"].includes(body?.patch?.status)) {
        patch.status = body.patch.status;
      }

      if (Object.keys(patch).length === 1) {
        return json({ error: "EMPTY_SECURITY_PATCH" }, 400);
      }

      const { data: security, error } = await supabase
        .from("securities")
        .update(patch)
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw error;

      await supabase.from("audit_events").insert({
        actor_id: auth.identity.id,
        actor_role: "MASTER_ADMIN",
        action: "SECURITY_UPDATED",
        entity_type: "SECURITY",
        entity_id: security.id,
        after_value: patch,
        reason: "ADMIN_SECURITIES_UI",
      });

      return json({ ok: true, security });
    }

    return json({ error: "UNKNOWN_ACTION" }, 400);
  } catch (error) {
    console.error("project4-securities-api", error);
    return json(
      { error: "INTERNAL_ERROR", detail: error instanceof Error ? error.message : String(error) },
      500,
    );
  }
});
