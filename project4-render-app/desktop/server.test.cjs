"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { startDesktopServer } = require("./server.cjs");

async function harness(t) {
  const distDir = await fs.mkdtemp(path.join(os.tmpdir(), "p004-desktop-test-"));
  await fs.mkdir(path.join(distDir, "assets"));
  await fs.writeFile(path.join(distDir, "index.html"), "<!doctype html><title>Local P004</title>");
  await fs.writeFile(path.join(distDir, "assets", "app.js"), "window.test = true;");
  const calls = [];
  const server = await startDesktopServer({
    distDir,
    upstreamFetch: async (url, init) => {
      calls.push({ url, method: init.method, body: init.body ? String(init.body) : null,
                   token: init.headers.Authorization });
      return new Response(JSON.stringify({ ok: true, method: init.method }), {
        status: 200, headers: { "content-type": "application/json" },
      });
    },
  });
  t.after(async () => { await server.close(); await fs.rm(distDir, { recursive: true, force: true }); });
  return { ...server, calls };
}

test("desktop serves real bundled local HTML with restrictive CSP", async t => {
  const h = await harness(t);
  const res = await fetch(h.origin + "/");
  assert.equal(res.status, 200);
  assert.match(await res.text(), /Local P004/);
  assert.match(res.headers.get("content-security-policy"), /connect-src 'self'/);
  assert.equal(res.headers.get("x-frame-options"), "DENY");
  assert.equal((await fetch(h.origin + "/assets/app.js")).status, 200);
});

test("gateway forwards only allowed API routes and keeps API authorization on server transport", async t => {
  const h = await harness(t);
  const auth = "Bearer " + "a".repeat(42);
  const res = await fetch(h.origin + "/gateway/reporting?action=clients", {
    headers: { authorization: auth },
  });
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { ok: true, method: "GET" });
  assert.equal(h.calls[0].url,
    "https://nukvroaolkxewfnqfiui.supabase.co/functions/v1/project4-reporting-api?action=clients");
  assert.equal(h.calls[0].token, auth);
  const registration = await fetch(h.origin + "/gateway/client?action=register", {
    method: "POST", headers: { "content-type": "application/json", Origin: h.origin },
    body: JSON.stringify({ invite: "000123" }),
  });
  assert.equal(registration.status, 200);
  assert.equal(h.calls[1].url,
    "https://nukvroaolkxewfnqfiui.supabase.co/functions/v1/project4-client-api?action=register");
  assert.match(h.calls[1].body, /"000123"/);
});

test("gateway blocks cross-origin, rogue Host, bogus methods and oversized bodies", async t => {
  const h = await harness(t);
  const cross = await fetch(h.origin + "/gateway/client?action=register", {
    method: "POST", headers: { Origin: "https://attacker.example", "Content-Type": "application/json" },
    body: "{}",
  });
  assert.equal(cross.status, 403);
  const wrong = await fetch(h.origin + "/gateway/reporting?action=clients", { method: "POST" });
  assert.equal(wrong.status, 405);
  const badAuth = await fetch(h.origin + "/gateway/reporting?action=clients", {
    headers: { Authorization: "Bearer broken" },
  });
  assert.equal(badAuth.status, 400);
  const oversized = await fetch(h.origin + "/gateway/client?action=register", {
    method: "POST", headers: { "content-type": "application/json", Origin: h.origin },
    body: "x".repeat(131072),
  });
  assert.equal(oversized.status, 413);
  assert.equal(h.calls.length, 0);
});

test("desktop denies paths outside bundled assets and unsupported methods", async t => {
  const h = await harness(t);
  assert.equal((await fetch(h.origin + "/sensitive.txt")).status, 404);
  assert.equal((await fetch(h.origin + "/assets/missing.js")).status, 404);
  assert.equal((await fetch(h.origin + "/index.html", { method: "POST" })).status, 405);
});
