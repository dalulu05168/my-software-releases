import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const api = read("../helpers/project4Api.tsx");
const app = read("../pages/_index.tsx");
const ops = read("../components/OperationsPages.tsx");
const admin = read("../components/AdminControlPages.tsx");

test("admin/ops login uses server-assigned role and six-digit TOTP", () => {
  assert.match(api, /action: "login_admin"/);
  assert.match(api, /\["master", "ops"\]\.includes\(data\.role\)/);
  assert.match(app, /onLogin\(result\.role,/);
  assert.doesNotMatch(app, /onLogin\(role, displayName\)/);
  assert.doesNotMatch(app, /\^\(ops\|sub\|运营\|子账户\)/);
});

test("client sign-in opens only after backend credentials are verified", () => {
  assert.match(app, /if \(portal === "client"\) \{/);
  assert.match(app, /if \(!clientApiEnabled\(\)\)/);
  assert.match(app, /await project4ClientApi\.login\(account, password\)/);
  assert.match(app, /onLogin\("client", result\.displayName\)/);
  assert.match(app, /setView\(nextRole==="client"\?"orders":"dashboard"\)/);
  assert.doesNotMatch(app, /project4Api\.logoutMaster/);
});

test("ops account actions call authenticated backend, not local fabricated OTP", () => {
  assert.match(ops, /project4Api\.listOpsAccounts\(\)/);
  assert.match(ops, /project4Api\.createOpsAccount\(/);
  assert.match(ops, /project4Api\.resetOpsTotp\(/);
  assert.match(ops, /project4Api\.setOpsStatus\(/);
  assert.doesNotMatch(ops, /useState\(opsAccountsSeed\)/);
  assert.doesNotMatch(ops, /VS\$\{id\.replaceAll/);
});

test("admin securities and client securities share live backend source", () => {
  assert.match(api, /listClientSecurities\(\)/);
  assert.match(api, /listAdminSecurities\(\)/);
  assert.match(admin, /queryFn: project4Api\.listAdminSecurities/);
  assert.match(app, /queryFn: project4Api\.listClientSecurities/);
  assert.doesNotMatch(admin, /setTimeout\(\(\) => \{\s+const candidates/);
});

test("unimplemented trading must not claim success", () => {
  const market = app.slice(app.indexOf("function MarketPage("), app.indexOf("function GenericPage("));
  assert.match(market, /Plasarea ordinelor indisponibilă/);
  assert.match(market, /disabled title="Endpoint-ul securizat/);
  assert.doesNotMatch(market, /Ordin.*înregistrat/);
  assert.doesNotMatch(market, /Volum <b>42\.8M/);
});


const clientApi = read("../helpers/project4ClientApi.ts");
const clientPortfolio = read("../components/ClientPortfolioPage.tsx");
const workflow = read("../components/CoreWorkflowPages.tsx");
const edge = read("../backend/project4-client-api/index.ts");
const sql = read("../backend/PROPOSED-client-auth.sql");

test("client API is opt-in; credentials and data cannot fall back to local demo", () => {
  assert.match(clientApi, /VITE_PROJECT4_CLIENT_API_ENABLED === "true"/);
  assert.match(clientApi, /throw new Error\("CLIENT_API_NOT_DEPLOYED"\)/);
  assert.match(clientApi, /action: "login_client"/);
  assert.match(clientApi, /sessionStorage\.setItem\(SESSION_KEY, data\.sessionToken\)/);
  assert.match(clientApi, /"Authorization", "Bearer " \+ session/);
  assert.match(clientApi, /data\.readOnly !== true/);
  assert.doesNotMatch(clientApi, /localStorage/);
});

test("client data views use server portfolio, never guessed Carlos demo records", () => {
  assert.match(workflow, /return <ClientPortfolioPage view={view}/);
  assert.match(workflow, /不加载本地演示记录/);
  assert.match(clientPortfolio, /queryFn: project4ClientApi\.listPortfolio/);
  assert.match(clientPortfolio, /Sold disponibil: neconectat/);
  assert.doesNotMatch(clientPortfolio, /Carlos Ramírez/);
  assert.doesNotMatch(clientPortfolio, /186,240/);
  assert.match(app, /role === "client" && !\["orders", "cash", "positions", "market", "settings"\]\.includes\(view\)/);
});

test("proposed Edge Function requires authentication and filters account data server-side", () => {
  assert.match(edge, /requireSession\(db, req\)/);
  assert.match(edge, /eq\("token_digest", digest\)/);
  assert.match(edge, /identity\.role !== "CLIENT"/);
  assert.match(edge, /account\.ops_account_id !== session\.ops_account_id/);
  assert.match(edge, /eq\("user_id", session\.user_id\)/);
  assert.match(edge, /eq\("ops_account_id", session\.ops_account_id\)/);
  assert.match(edge, /readOnly: true/);
  assert.doesNotMatch(edge, /\.from\("orders"\)\.insert/);
  assert.doesNotMatch(edge, /\.from\("cash_requests"\)\.insert/);
  assert.match(edge, /PROJECT4_ALLOWED_ORIGINS/);
});

test("client password check uses atomic lockout, restricted RPC and pgcrypto", () => {
  assert.match(sql, /SECURITY DEFINER/);
  assert.match(sql, /FOR UPDATE OF a;/);
  assert.match(sql, /extensions\.crypt\(p_password, v_identity\.password_hash\)/);
  assert.match(sql, /locked_until = CASE WHEN v_attempts >= 5/);
  assert.match(sql, /REVOKE ALL ON FUNCTION public\.project4_login_client_checked\(text, text\) FROM PUBLIC/);
  assert.match(sql, /GRANT EXECUTE ON FUNCTION public\.project4_login_client_checked\(text, text\) TO service_role/);
  assert.match(sql, /REVIEW ONLY/);
});
