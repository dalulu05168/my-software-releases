# P004 客户端身份认证与资产只读 API：待审核实施说明

**当前状态：源代码提案，不是已部署功能。** 此目录不会由 `project4-render-app` 的 Vite 前端构建自动部署；不包含生产密钥。

## 实现分层

- `backend/PROPOSED-client-auth.sql`：针对既有 `identities` / `client_accounts` / `client_auth` 的服务端密码校验与连续失败锁定；需要安全复核之后，才可在**隔离测试环境**执行。
- `backend/project4-client-api/index.ts`：独立客户端登录、服务端会话、登出、只读本人订单／资金申请／持仓；所有数据查询强制使用经验证的 `user_id`，资金账户余额在账本核算逻辑完成前明确返回空值。
- `helpers/project4ClientApi.ts`：客户端 SDK，默认关闭。仅测试环境显式设置 `VITE_PROJECT4_CLIENT_API_ENABLED=true`，并提前验证 Edge Function 可用后才可能开启。
- `components/ClientPortfolioPage.tsx`：只展示服务器已核验的客户数据，不伪造订单、余额、浮盈或审核结果。

## 上线前必过的人工/自动验收门禁

1. 在独立 Supabase 测试项目复核 `SECURITY DEFINER` 的 `search_path`、`EXECUTE` 授权和数据 API 暴露范围，不得直接将测试 SQL 应用于生产；确认 `pgcrypto` 在 `extensions` schema、角色枚举 `CLIENT` 与表字段匹配。
2. 在隔离环境的 Edge Function 设置 `SUPABASE_URL`、`SUPABASE_SERVICE_ROLE_KEY`、`PROJECT4_ALLOWED_ORIGINS`，后者只允许经过批准的网页来源。绝不可将 `service_role` 放入 Vite `VITE_*` 变量。
3. 仅创建测试客户并验证：正确凭证、错误凭证、连续失败锁定、账户停用、子账户暂停、会话失效／登出、到期时间、跨用户与跨子账户越权访问、未授权读取是否返回 401。
4. 验证所有订单／资金／持仓数据只来自本人真实服务端记录；空列表正确显示为空。持仓表中的持仓成本不应误认为实时市值。
5. 单独实现并验收后台账号范围的数据查询、余额账本结算、真实客户注册、密码找回、下单幂等性、资金审批双人授权后，才能开放相应操作。
6. 通过预发布端到端测试、回滚演练与安全复核，**再次单独向用户申请生产数据库变更、部署、域名及正式上架许可**。

## 已知限制

- **未执行** `PROPOSED-client-auth.sql`，未部署 `project4-client-api`，未创建实际账户或转账。
- 现有线上 `project4-securities-api` 不会因此发生任何修改。原总账户／子账户 2FA 接口继续保持现状。
- 源码契约测试与 TypeScript/Vite 构建不是登录及数据隔离的端到端安全证明。
- 本次代码限定“可查询本人数据”；不包含客户交易、提现、贷款申请或修改密码。
