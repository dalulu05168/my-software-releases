"use strict";
const http = require("node:http");
const fs = require("node:fs/promises");
const path = require("node:path");

const API_ROOT = "https://nukvroaolkxewfnqfiui.supabase.co/functions/v1/";
const ROUTES = Object.freeze({
  "/gateway/admin": { api: "project4-securities-api", methods: ["GET", "POST"] },
  "/gateway/client": { api: "project4-client-api", methods: ["GET", "POST"] },
  "/gateway/reporting": { api: "project4-reporting-api", methods: ["GET"] },
});
const MIME = Object.freeze({
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
});
const MAX_REQUEST_BYTES = 128 * 1024;
const MAX_RESPONSE_BYTES = 8 * 1024 * 1024;
const SECURITY_HEADERS = Object.freeze({
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "Cache-Control": "no-store",
  "X-Frame-Options": "DENY",
  "Cross-Origin-Resource-Policy": "same-origin",
});

function reply(res, status, text, extra = {}) {
  if (res.headersSent) return;
  res.writeHead(status, { ...SECURITY_HEADERS, "Content-Type": "text/plain; charset=utf-8", ...extra });
  res.end(text);
}
async function collect(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_REQUEST_BYTES) {
      const err = new Error("REQUEST_TOO_LARGE");
      err.statusCode = 413;
      throw err;
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}
function strictLocalRequest(req, origin, port) {
  if (req.headers.host !== "127.0.0.1:" + port) return false;
  const headerOrigin = req.headers.origin;
  if (headerOrigin && headerOrigin !== origin) return false;
  const site = req.headers["sec-fetch-site"];
  if (site && site !== "same-origin" && site !== "none") return false;
  return true;
}
async function forward(req, res, route, url, upstreamFetch) {
  if (!route.methods.includes(req.method)) return reply(res, 405, "METHOD_NOT_ALLOWED");
  try {
    const controller = new AbortController();
    const deadline = setTimeout(() => controller.abort(), 12_000);
    try {
      const body = req.method === "POST" ? await collect(req) : undefined;
      const target = API_ROOT + route.api + url.search;
      const headers = { Accept: "application/json" };
      if (body) headers["Content-Type"] = "application/json";
      const auth = req.headers.authorization;
      if (typeof auth === "string" && /^Bearer [A-Za-z0-9._~-]{32,200}$/.test(auth)) {
        headers.Authorization = auth;
      } else if (auth) {
        return reply(res, 400, "INVALID_AUTH_HEADER");
      }
      const upstream = await upstreamFetch(target, {
        method: req.method, body: body && body.length ? body : undefined,
        headers, redirect: "error", signal: controller.signal,
        cache: "no-store",
      });
      const declared = Number(upstream.headers.get("content-length") || "0");
      if (declared > MAX_RESPONSE_BYTES) return reply(res, 502, "UPSTREAM_RESPONSE_TOO_LARGE");
      const bytes = Buffer.from(await upstream.arrayBuffer());
      if (bytes.length > MAX_RESPONSE_BYTES) return reply(res, 502, "UPSTREAM_RESPONSE_TOO_LARGE");
      res.writeHead(upstream.status, {
        ...SECURITY_HEADERS,
        "Content-Type": "application/json; charset=utf-8",
      });
      res.end(bytes);
    } finally {
      clearTimeout(deadline);
    }
  } catch (err) {
    return reply(res, err.statusCode || 503, err.statusCode ? "REQUEST_TOO_LARGE" : "BACKEND_CONNECTION_UNAVAILABLE");
  }
}
async function staticFile(req, res, url, distDir) {
  if (req.method !== "GET") return reply(res, 405, "METHOD_NOT_ALLOWED");
  const pathname = url.pathname === "/" ? "/index.html" : url.pathname;
  if (!/^\/(?:index\.html|[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)*|assets\/[A-Za-z0-9._/-]+)$/.test(pathname) ||
      pathname.includes("..")) return reply(res, 404, "NOT_FOUND");
  const file = path.resolve(distDir, "." + pathname);
  if (!file.startsWith(path.resolve(distDir) + path.sep)) return reply(res, 403, "FORBIDDEN");
  try {
    const data = await fs.readFile(file);
    const mime = MIME[path.extname(file).toLowerCase()];
    if (!mime) return reply(res, 415, "UNSUPPORTED_ASSET_TYPE");
    const extra = { "Content-Type": mime };
    if (pathname === "/index.html") {
      extra["Content-Security-Policy"] = [
        "default-src 'self'",
        "script-src 'self'",
        "style-src 'self' 'unsafe-inline'",
        "font-src 'self' data:",
        "img-src 'self' data: blob:",
        "connect-src 'self'",
        "object-src 'none'",
        "base-uri 'none'",
        "frame-ancestors 'none'",
        "form-action 'self'",
      ].join("; ");
    }
    res.writeHead(200, { ...SECURITY_HEADERS, ...extra });
    res.end(data);
  } catch (err) {
    return reply(res, err.code === "ENOENT" || err.code === "EISDIR" ? 404 : 500, "LOCAL_ASSET_UNAVAILABLE");
  }
}

async function startDesktopServer({ distDir, upstreamFetch = globalThis.fetch } = {}) {
  if (!distDir) throw new Error("BUNDLED_DIST_REQUIRED");
  const root = path.resolve(distDir);
  await fs.access(path.join(root, "index.html"));
  let origin = "";
  let port = 0;
  const server = http.createServer((req, res) => {
    if (!strictLocalRequest(req, origin, port)) return reply(res, 403, "UNTRUSTED_LOCAL_REQUEST");
    let parsed;
    try { parsed = new URL(req.url, origin); } catch { return reply(res, 400, "INVALID_URL"); }
    const route = ROUTES[parsed.pathname];
    const job = route ? forward(req, res, route, parsed, upstreamFetch) : staticFile(req, res, parsed, root);
    job.catch(() => reply(res, 500, "LOCAL_SERVER_ERROR"));
  });
  try {
    await new Promise((resolve, reject) => {
      server.once("error", reject);
      server.listen(0, "127.0.0.1", resolve);
    });
    port = server.address().port;
    origin = "http://127.0.0.1:" + port;
  } catch (err) {
    server.close();
    throw err;
  }
  return { origin, port, close: () => new Promise(resolve => server.close(resolve)) };
}
module.exports = { startDesktopServer, ROUTES };
