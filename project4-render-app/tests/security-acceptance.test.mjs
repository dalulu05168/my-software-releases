import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const main = readFileSync(new URL("../pages/_index.tsx", import.meta.url), "utf8");
const api = readFileSync(new URL("../helpers/project4Api.tsx", import.meta.url), "utf8");
const css = readFileSync(new URL("../pages/_index.module.css", import.meta.url), "utf8");
const clientBackend = readFileSync(new URL("../backend/project4-client-api/index.ts", import.meta.url), "utf8");
const adminBackend = readFileSync(new URL("../backend/project4-securities-api/index.ts", import.meta.url), "utf8");
const verifiedOps = readFileSync(new URL("../components/VerifiedOpsAccounts.tsx", import.meta.url), "utf8");
const reportingBackend = readFileSync(new URL("../backend/project4-reporting-api/index.ts", import.meta.url), "utf8");
const verifiedReports = readFileSync(new URL("../components/VerifiedAdminRecords.tsx", import.meta.url), "utf8");
const customerWorkspace = readFileSync(new URL("../components/ScopedCustomerWorkspace.tsx", import.meta.url), "utf8");
const appMirror = readFileSync(new URL("../components/VerifiedClientAppMirror.tsx", import.meta.url), "utf8");
const controlPages = readFileSync(new URL("../components/AdminControlPages.tsx", import.meta.url), "utf8");

test("customer authentication always requires a verified server session", () => {
  const login = main.slice(main.indexOf("function LoginScreen"), main.indexOf("function Sidebar"));
  assert.match(login, /await project4Api\.loginClient\(account\.trim\(\), password\)/);
  assert.match(login, /onLogin\("client", result\.displayName\)/);
  assert.doesNotMatch(login, /onLogin\(role, displayName\)/);
  assert.match(api, /PROJECT4_CLIENT_API \+ "\?action=login"/);
  assert.match(api, /window\.sessionStorage\.setItem\(CLIENT_SESSION_KEY, data\.sessionToken\)/);
  assert.match(api, /data\?\.ok !== true \|\| data\?\.role !== "client"/);
});

test("password reset and signup do not claim success without a backend", () => {
  const login = main.slice(main.indexOf("function LoginScreen"), main.indexOf("function Sidebar"));
  assert.match(login, /if \(mode !== "login"\)/);
  assert.doesNotMatch(login, /"Verificare finalizată\. Setați o parolă nouă\."/);
});

test("financial dashboard has no manufactured balance or order counts", () => {
  const dashboard = main.slice(main.indexOf("function Dashboard("), main.indexOf("function Toggle("));
  assert.match(dashboard, /listAdminSecurities/);
  for (const placeholder of ["248,630.80", "18.62M", "2,846", "1,284", "62,390"]) {
    assert.equal(dashboard.includes(placeholder), false, `unexpected fabricated value: ${placeholder}`);
  }
});

test("stock order submission and fabricated trade tape are disabled", () => {
  const market = main.slice(main.indexOf("function MarketPage("), main.indexOf("function OrderRows("));
  assert.match(market, /disabled title="Tranzacționarea este dezactivată/);
  assert.doesNotMatch(market, /setNotice\(`Ordin/);
  assert.doesNotMatch(market, /Cump\. \{i\}/);
  assert.match(market, /Graficul simulat a fost dezactivat/);
});

test("unwired modules are marked unavailable and sensitive data is not simulated", () => {
  const app = main.slice(main.indexOf("export default function App()"));
  assert.match(app, /<PendingIntegrationPage/);
  assert.match(app, /view === "securities" && role === "master"/);
  assert.doesNotMatch(app, /<CustomersPage customers=/);
  assert.doesNotMatch(app, /<CoreWorkflowPage view=/);
  assert.doesNotMatch(app, /<OperationsPage view=/);
});

test("responsive UI restores readable account text and expands the viewport", () => {
  assert.match(css, /P004 layout acceptance/);
  assert.match(css, /\.heroBalance>div:first-child strong\s*\{\s*color:#202A37!important/);
  assert.match(css, /width:100vw!important/);
  assert.match(css, /max-height:100dvh!important/);
});

test("read-only client backend validates existing clients and scoped sessions", () => {
  assert.match(clientBackend, /async function verifyPassword\(/);
  assert.match(clientBackend, /PBKDF2/);
  assert.match(clientBackend, /identity\.role !== "CLIENT"/);
  assert.match(clientBackend, /account\.ops_account_id !== session\.ops_account_id/);
  assert.match(clientBackend, /\.eq\("user_id", id\)\.order\("created_at"/);
  assert.match(clientBackend, /\.eq\("user_id", id\)\.order\("updated_at"/);
  assert.match(clientBackend, /balances: null/);
  assert.match(clientBackend, /orderSubmissionEnabled: false/);
  assert.doesNotMatch(clientBackend, /action"\) === "place_order"/);
});

test("customer-specific holdings and orders require scoped API, not sample data", () => {
  assert.match(main, /function ClientPortfolioRecordsPage/);
  assert.match(main, /queryFn: project4Api\.getClientPortfolio/);
  assert.match(api, /CLIENT_SESSION_REQUIRED/);
  assert.match(api, /Authorization: "Bearer " \+ token/);
  assert.match(main, /project4Api\.logoutClient\(\)/);
});

test("only master route mounts the real operations sub-account service", () => {
  assert.match(main, /view === "opsAccounts" && role === "master"/);
  assert.match(main, /<VerifiedOpsAccountsPage onOpenCustomers=/);
  assert.match(api, /action: "list_ops_accounts"/);
  assert.match(api, /action: "create_ops_account"/);
  assert.match(verifiedOps, /queryFn: project4Api\.listOpsAccounts/);
  assert.match(verifiedOps, /project4Api\.createOpsAccount/);
  assert.match(verifiedOps, /type="password"/);
  assert.doesNotMatch(verifiedOps, /Math\.random\(/);
});

test("read-only reporting backend enforces role sessions and ops-owned rows", () => {
  assert.match(reportingBackend, /if \(req\.method !== "GET"\)/);
  assert.match(reportingBackend, /AUTHORIZED_ADMIN_SESSION_REQUIRED/);
  assert.match(reportingBackend, /identity\.role !== "OPS_ADMIN"/);
  assert.match(reportingBackend, /identity\.ops_account_id !== ops\.ops_account_id/);
  assert.match(reportingBackend, /who.role === "ops" \? who.opsAccountId : opsFilter/);
  assert.match(reportingBackend, /if \(who.role === "ops" && opsFilter && opsFilter !== who.opsAccountId\)/);
  assert.match(reportingBackend, /if \(scopedOpsId\) q = q.eq\("ops_account_id", scopedOpsId\)/);
  assert.match(reportingBackend, /else if \(allowedIds\) q = q.in\("user_id", allowedIds\)/);
  assert.match(reportingBackend, /if \(requestedUserId\) q = q.eq\("user_id", requestedUserId\)/);
  assert.doesNotMatch(reportingBackend, /\.insert\(|\.delete\(|\.update\(/);
});

test("customer/orders/cash/positions use real read-only reports with scoped export", () => {
  assert.match(api, /async listAdminReport\(/);
  assert.match(api, /Authorization: "Bearer " \+ token/);
  assert.match(main, /<ScopedCustomerWorkspace/);
  assert.match(main, /onOpenCustomers=\{account=>/);
  assert.match(customerWorkspace, /project4Api.listAdminReport\("clients",\{opsAccountId\}\)/);
  assert.match(customerWorkspace, /project4Api.listAdminReport\(tab,\{opsAccountId,userId\}\)/);
  assert.match(customerWorkspace, /查看客户详情/);
  assert.match(customerWorkspace, /没有已保存的记录/);
  assert.match(main, /<VerifiedAdminRecordsPage kind=\{view as "orders" \| "cash" \| "positions"\}\s*\/>/);
  assert.match(verifiedReports, /project4Api\.listAdminReport\(kind\)/);
  assert.match(verifiedReports, /每次最多 200 条/);
  assert.match(verifiedReports, /csvValue/);
});


test("master creates both independent TOTP secret and unique six-digit customer invite", () => {
  assert.match(adminBackend, /function generateTotpSecret\(/);
  assert.match(adminBackend, /function generateInviteCode\(/);
  assert.match(adminBackend, /crypto\.getRandomValues\(new Uint32Array\(1\)\)/);
  assert.match(adminBackend, /padStart\(6, "0"\)/);
  assert.match(adminBackend, /inviteError\.code !== "23505"/);
  assert.match(adminBackend, /code_digest: inviteDigest/);
  assert.match(adminBackend, /display_code: candidate/);
  assert.match(adminBackend, /p_totp: totpSecret/);
  assert.match(adminBackend, /otpauthUri: makeOtpAuthUri/);
  assert.match(adminBackend, /invite: inviteCode/);
  assert.doesNotMatch(adminBackend, /let out = "OPS-"/);
});

test("customer registration requires six numerical digits, never the TOTP secret", () => {
  assert.ok(clientBackend.includes('!/^[0-9]{6}$/.test(invite)'));
  assert.ok(main.includes('!/^[0-9]{6}$/.test(invite.trim())'));
  assert.ok(main.includes('pattern="[0-9]{6}"'));
  assert.ok(verifiedOps.includes('客户注册邀请码（固定六位数字）'));
  assert.ok(verifiedOps.includes('管理员 2FA 绑定密钥（不是邀请码）'));
  assert.ok(clientBackend.includes('db.rpc("register_client_with_invite"'));
});


test("real master operations can suspend users and rotate admin TOTP independently of signup invite", () => {
  assert.ok(api.includes('action: "set_ops_status"'));
  assert.ok(api.includes('action: "reset_ops_totp"'));
  assert.ok(verifiedOps.includes('project4Api.setOpsStatus(row.id, status)'));
  assert.ok(verifiedOps.includes('project4Api.resetOpsTotp(row.identityId)'));
  assert.ok(verifiedOps.includes('客户六位邀请码不会改变'));
  assert.ok(verifiedOps.includes('客户注册邀请码（固定六位数字）'));
  assert.match(adminBackend, /action === "reset_ops_totp"/);
  assert.match(adminBackend, /action === "set_ops_status"/);
  assert.match(adminBackend, /ops_sessions"\)\.update\(/);
});

test("security search returns only saved database matches and can create manual hidden entries", () => {
  const securities = controlPages.slice(controlPages.indexOf('function SecuritiesPage()'),controlPages.indexOf('function PurchaseAccessPage('));
  assert.ok(securities.includes('await securitiesQuery.refetch()'));
  assert.ok(securities.includes('手工录入证券'));
  assert.ok(securities.includes('visible: false, internalOrder: false'));
  assert.ok(securities.includes('visible: row.visible === true'));
  assert.doesNotMatch(securities,/setTimeout\(/);
  assert.doesNotMatch(securities,/query\.trim\(\)\.toUpperCase\(\) \|\| "NEW"/);
  assert.match(adminBackend, /\.from\("securities"\)\s*\.insert\(payload\)/);
  assert.ok(adminBackend.includes('provider_synced_at: null'));
  assert.ok(adminBackend.includes('visible: false,'));
  assert.ok(adminBackend.includes('tradable: false,'));
  assert.ok(adminBackend.includes('SECURITY_ALREADY_EXISTS'));
  assert.ok(adminBackend.includes('ORDER_EXECUTION_NOT_CONNECTED'));
});

test("unavailable modules and unverified money controls cannot be activated", () => {
  assert.ok(main.includes('const unavailable = ["products", "loans", "notifications", "risk", "support", "audit", "settings", "purchaseAccess"]'));
  assert.ok(main.includes('disabled={unavailable}'));
  assert.ok(main.includes('当前不展示任何预设数据') === false);
  assert.doesNotMatch(main.slice(main.indexOf('function MarketPage('),main.indexOf('function OrderRows(')),/const available = 186240/);
  assert.ok(main.includes('price: item.quote?.lastPrice == null ? "—"'));
  assert.ok(main.includes('Tranzacționare indisponibilă'));
});


test("admin logout revokes server tokens, and neither OPS nor MASTER use persistent localStorage credentials", () => {
  assert.ok(adminBackend.includes('if (action === "logout_admin")'));
  assert.ok(adminBackend.includes('supabase.from("master_sessions").update({ revoked_at: now })'));
  assert.ok(adminBackend.includes('supabase.from("ops_sessions").update({ revoked_at: now })'));
  assert.ok(api.includes('window.sessionStorage.setItem(SESSION_KEY, data.sessionToken)'));
  assert.ok(api.includes('window.sessionStorage.getItem(SESSION_KEY)'));
  assert.ok(api.includes('action: "logout_admin"'));
  assert.doesNotMatch(api,/window\.localStorage\.setItem\(SESSION_KEY,/);
});

test("client invite brute-force throttling cannot be bypassed by changing registration email", () => {
  assert.ok(clientBackend.includes('p004-signup-v2:ip:'));
  assert.ok(clientBackend.includes('SIGNUP_SOURCE_UNAVAILABLE'));
  assert.doesNotMatch(clientBackend,/clientAddress\+"\:"\+email/);
});


test("ops account status updates are validated, audited, and cannot silently succeed for missing IDs", () => {
  assert.ok(adminBackend.includes('error: "INVALID_OPS_STATUS"'));
  assert.ok(adminBackend.includes('error: "OPS_ACCOUNT_NOT_FOUND"'));
  assert.ok(adminBackend.includes('OPS_ACCOUNT_SUSPENDED'));
  assert.ok(adminBackend.includes('OPS_ACCOUNT_REACTIVATED'));
  assert.ok(adminBackend.includes('OPS_STATUS_CHANGED_BUT_AUDIT_FAILED'));
  assert.ok(!adminBackend.includes('clients: 0,'));
});


test("customer APP data mirror is reachable from scoped customer list and client detail", () => {
  assert.match(customerWorkspace,/import \{ VerifiedClientAppMirror \}/);
  assert.match(customerWorkspace,/APP 数据镜像/);
  assert.match(customerWorkspace,/onClick=\{\(\)=>setMirrored\(client\)\}/);
  assert.match(customerWorkspace,/<VerifiedClientAppMirror/);
  assert.match(customerWorkspace,/onOpenMirror=\{\(\)=>setMirrored\(selected\)\}/);
});

test("APP data mirror re-verifies customer ownership and reads only actual server records", () => {
  assert.match(appMirror,/project4Api\.listAdminReport\("clients",\{ opsAccountId, userId \}\)/);
  assert.match(appMirror,/user\.data\.rows\.length === 1/);
  assert.match(appMirror,/String\(user\.data\.rows\[0\]\.user_id\) === userId/);
  assert.match(appMirror,/enabled: identity !== null && screen !== "home"/);
  assert.match(appMirror,/project4Api\.listAdminReport\(action,\{ opsAccountId, userId \}\)/);
  assert.match(appMirror,/refetchInterval: 30_000/);
  assert.match(appMirror,/余额账本|Registrul de solduri/);
  assert.match(appMirror,/Sold disponibil verificat/);
  assert.match(appMirror,/Tranzacționare/);
  assert.doesNotMatch(appMirror,/Math\.random\(/);
  assert.doesNotMatch(appMirror,/localStorage\.setItem/);
  assert.doesNotMatch(appMirror,/action: "place_order"/);
});
