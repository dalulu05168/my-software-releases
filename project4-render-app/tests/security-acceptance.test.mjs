import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const main = readFileSync(new URL("../pages/_index.tsx", import.meta.url), "utf8");
const api = readFileSync(new URL("../helpers/project4Api.tsx", import.meta.url), "utf8");
const css = readFileSync(new URL("../pages/_index.module.css", import.meta.url), "utf8");
const clientBackend = readFileSync(new URL("../backend/project4-client-api/index.ts", import.meta.url), "utf8");
const verifiedOps = readFileSync(new URL("../components/VerifiedOpsAccounts.tsx", import.meta.url), "utf8");
const reportingBackend = readFileSync(new URL("../backend/project4-reporting-api/index.ts", import.meta.url), "utf8");
const verifiedReports = readFileSync(new URL("../components/VerifiedAdminRecords.tsx", import.meta.url), "utf8");
const customerWorkspace = readFileSync(new URL("../components/ScopedCustomerWorkspace.tsx", import.meta.url), "utf8");

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
