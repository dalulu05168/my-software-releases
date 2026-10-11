"use strict";
const path = require("node:path");
const { app, BrowserWindow, Menu, dialog } = require("electron");
const { startDesktopServer } = require("./server.cjs");

const single = app.requestSingleInstanceLock();
if (!single) {
  app.quit();
} else {
  let desktopServer = null;
  let mainWindow = null;
  const distDir = path.resolve(__dirname, "../dist");

  function go(portal = "admin") {
    if (!mainWindow || !desktopServer) return;
    const chosen = portal === "client" ? "client" : "admin";
    void mainWindow.loadURL(desktopServer.origin + "/?desktop=1&portal=" + chosen);
  }
  async function diagnose() {
    const host = "https://nukvroaolkxewfnqfiui.supabase.co/functions/v1/";
    const checks = [
      ["证券数据", host + "project4-securities-api?scope=client"],
      ["客户认证", host + "project4-client-api?action=me"],
      ["后台报表", host + "project4-reporting-api?action=clients"],
    ];
    const lines = await Promise.all(checks.map(async ([name, url]) => {
      try {
        const response = await fetch(url, { method: "GET", signal: AbortSignal.timeout(8000) });
        return name + "：服务器可达（HTTP " + response.status + "）";
      } catch {
        return name + "：无法连接（请检查网络、DNS、代理及防火墙）";
      }
    }));
    dialog.showMessageBoxSync(mainWindow, {
      type: "info",
      title: "P004 连接诊断",
      message: "本地安装程序状态",
      detail: ["桌面前端：本地已启动", ...lines, "", "401 表示服务可达但未登录，并不代表功能验收通过。", "不会在本地存储真实客户数据库。"].join("\n"),
      buttons: ["确定"],
    });
  }
  async function createWindow() {
    desktopServer = await startDesktopServer({ distDir });
    const win = new BrowserWindow({
      width: 1536,
      height: 864,
      minWidth: 980,
      minHeight: 640,
      show: false,
      backgroundColor: "#f4f6f9",
      title: "Brantone Veylor | P004 Desktop",
      autoHideMenuBar: true,
      webPreferences: {
        sandbox: true,
        contextIsolation: true,
        nodeIntegration: false,
        webviewTag: false,
        devTools: false,
        spellcheck: false,
      },
    });
    mainWindow = win;
    const origin = desktopServer.origin;
    win.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
    win.webContents.on("will-navigate", (event, url) => {
      let target;
      try { target = new URL(url); } catch { event.preventDefault(); return; }
      if (target.origin !== origin || target.pathname !== "/") event.preventDefault();
    });
    win.webContents.session.setPermissionRequestHandler((_web, _permission, callback) => callback(false));
    win.webContents.session.webRequest.onBeforeRequest((details, callback) => {
      const url = details.url;
      callback({ cancel: !url.startsWith(origin + "/") });
    });
    const menu = Menu.buildFromTemplate([
      { label: "账户", submenu: [
        { label: "管理后台", click: () => go("admin") },
        { label: "客户登录", click: () => go("client") },
        { type: "separator" },
        { label: "退出", role: "quit" },
      ] },
      { label: "系统", submenu: [
        { label: "刷新当前页面", role: "reload" },
        { label: "检查服务连接", click: () => void diagnose() },
      ] },
    ]);
    Menu.setApplicationMenu(menu);
    win.once("ready-to-show", () => win.show());
    win.on("closed", () => { mainWindow = null; });
    await win.loadURL(origin + "/?desktop=1&portal=admin");
    return win;
  }
  app.on("second-instance", () => {
    if (mainWindow) { if (mainWindow.isMinimized()) mainWindow.restore(); mainWindow.focus(); }
  });
  app.whenReady().then(async () => {
    if (process.argv.includes("--p004-smoke")) {
      let smokeServer;
      let code = 1;
      try {
        smokeServer = await startDesktopServer({ distDir });
        const response = await fetch(smokeServer.origin + "/");
        const html = await response.text();
        const forbidden = await fetch(smokeServer.origin + "/gateway/reporting", {
          method: "POST",
        });
        if (response.ok && html.includes('id="root"') && forbidden.status === 405) {
          code = 0;
        }
      } catch (err) {
        console.error("P004_WINDOWS_SMOKE_FAILED", err instanceof Error ? err.message : "unknown");
      } finally {
        if (smokeServer) await smokeServer.close();
        app.exit(code);
      }
      return;
    }
    try { await createWindow(); }
    catch (error) {
      dialog.showErrorBox("P004 本地启动失败",
        "无法加载安装包中的静态资源或启动本地回环服务。请重新安装程序。\\n" +
        (error instanceof Error ? error.message : ""));
      app.quit();
    }
  });
  app.on("window-all-closed", () => { app.quit(); });
  app.on("before-quit", () => {
    if (desktopServer) {
      void desktopServer.close().catch(() => {});
      desktopServer = null;
    }
  });
}
