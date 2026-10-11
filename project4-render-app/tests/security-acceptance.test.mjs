import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const main = readFileSync(new URL("../pages/_index.tsx", import.meta.url), "utf8");
const api = readFileSync(new URL("../helpers/project4Api.tsx", import.meta.url), "utf8");
const css = readFileSync(new URL("../pages/_index.module.css", import.meta.url), "utf8");

test("customer authentication always requires a verified server session", () => {
  const login = main.slice(main.indexOf("function LoginScreen"), main.indexOf("function Sidebar"));
  assert.match(login, /await project4Api\.loginClient\(account\.trim\(\), password\)/);
  assert.match(login, /onLogin\("client", result\.displayName\)/);
  assert.doesNotMatch(login, /onLogin\(role, displayName\)/);
  assert.match(api, /throw new Error\("CLIENT_AUTH_NOT_CONFIGURED"\)/);
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
