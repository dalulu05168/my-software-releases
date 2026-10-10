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

test("client sign-in cannot open workspace without verified backend credentials", () => {
  assert.match(app, /if \(portal === "client"\) \{/);
  assert.match(app, /Nu s-a creat și nu s-a modificat niciun cont/);
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
