# P004 Brantone Veylor Desktop · Windows 本地安装包

版本：1.1.0（测试版）。平台：Windows 10/11 x64。

## 下载与安装

1. 打开 [GitHub Windows 构建记录](https://github.com/dalulu05168/my-software-releases/actions/workflows/p004-windows-installer.yml)，选择 `p004-windows-installer-20261012` 分支上 **最新成功** 的 `P004 Windows Desktop Installer` 执行记录。
2. 在 Artifacts 下载 `P004-Brantone-Veylor-Windows-x64-Installer` ZIP；解压 ZIP。
3. 运行其中 `P004-Brantone-Veylor-Setup-1.1.0-x64.exe`。可选安装目录；安装程序在开始菜单和桌面创建快捷方式。
4. 双击快捷方式即可启动，无需手动安装 Node.js、打开 CMD、启动 Vite 或复制数据库。
5. 首次使用先在顶部的 `账户` 菜单选择后台或客户登录，或在登录页直接切换入口。后台需对应账号、密码及六位动态 Google 2FA；客户需经真实服务端登记。
6. `系统 → 检查服务连接` 可诊断与 Supabase 的网络可达性。HTTP 401 代表服务器可达但没有有效登录会话，**不代表账户登录通过**。

> **安全提醒**：本项目未配置 Windows 软件发布者数字签名。部分电脑可能提示未知发布者，请仅从本人仓库成功的 Actions 安装包获取软件；正式公开发行需办理签名及版本签署。不要通过他人发送的不明安装文件输入账号密码。

## 本地架构 / 安全边界

- UI/静态文件直接打包进 Electron，本机启动仅绑定 `127.0.0.1` 的随机端口，不开放 LAN/WAN 监听，也不借助外部页面托管来启动。
- 通过本机 `/gateway/admin`、`/gateway/client`、`/gateway/reporting` 三条受限路径连接服务器，防止在正式 Supabase CORS 白名单里加入不受限的 localhost。
- GUI 的 Node.js 集成被禁用、隔离上下文与 sandbox 启用、外部导航阻止、拒绝网页权限请求。
- 管理员认证令牌位于浏览器会话存储，退出时尽力通知后端撤销；未集成到 Windows Credential Manager。网络连接中断时应用可加载登录页，但实际后台操作不能离线执行。
- 客户资料、订单、持仓、资金及 2FA 服务端密钥留在 Supabase；本地程序不是完整离线股票交易服务，也不内置假的账户数据。
- 绝不把服务端 `service_role` / Supabase Secret Key 放进安装程序。

## 构建命令

进入仓库 `project4-render-app` 后：

```powershell
npm install
npm run build
npm run typecheck
npm run desktop:test
node --test tests/security-acceptance.test.mjs
npm run desktop:package
```

产物在 `project4-render-app/desktop-release/`；GitHub Actions 在 Windows runner 上执行以上步骤并运行打包后 .exe 的无 GUI 启动检查（`--p004-smoke`），成功后上传可下载的安装包 Artifact。项目里还保留浏览器网页前台，两者用同一个服务端接口。

## 2026-10-12 的功能状态 / 不得误报

| 模块 | 本地安装程序可提供 | 尚未验证或尚未实现 |
|---|---|---|
| Windows 启动与登录入口 | 两种入口、本地网关、网络诊断、退出及界面加载 | 实际个人 Windows 电脑安装/点击验收仍需执行 |
| MASTER / OPS 身份 | 共用真实服务器登录 API；服务端2FA校验 | 尚无 OPS 测试账户验证整条链路 |
| OPS 管理 | 接口代码已连接创建、停用、启用和 TOTP 重置 | 生产 `project4-securities-api` 尚需发布新版；旧版生成 `OPS-` 格式的邀请码 |
| 六位数字邀请码客户注册 | 开发代码具备六位数字校验及 OPS 归属 RPC 调用 | 正式后端现有版本不一致，**没有完成真实注册联调** |
| 管理员客户列表 | 查询真实客户，含用户归属、只读订单/持仓/资金申请 | 真实数据库先前检查无 OPS/客户业务样本，权限 E2E 不充分 |
| 客户 APP 镜像 | 现有客户业务只读查询，可作为后续统一数据源 | **真实客户端 APP 镜像与行为/画面同步未实现**，旧模拟组件仍不得使用 |
| 行情与证券 | 已入库证券查询和隐藏式手工证券录入 | 外部行情自动检索、历史 K 线/经核实报价未集成 |
| 下单与资金 | 旧 UI 保留位置，危险操作禁用 | 交易执行、真实余额、资金账本、入金提现审批未接入 |

**“构建通过”只表示安装包结构及本地执行环境通过 Windows CI；不代表全部后台业务已打通。** 上线前必须完成三种角色 E2E、真实数据与权限、2FA、注册、交易禁用安全检查、安装/卸载兼容性，并对未接入的业务功能逐一完成后端开发。

详细历史业务修复见 [P004 草稿 PR #5](https://github.com/dalulu05168/my-software-releases/pull/5)。本地安装版本使用独立开发分支，不自动改动 `main`、正式 Supabase 或用户资金。
