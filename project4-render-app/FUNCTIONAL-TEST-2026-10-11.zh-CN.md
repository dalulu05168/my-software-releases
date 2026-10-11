# P004 功能测试报告｜2026-10-11

## 范围与证据
- 验证对象：已发布 Floot 客户前台 `https://jiaoyipingtai-app.floot.app`、P004 Supabase `nukvroaolkxewfnqfiui`、GitHub 开发分支 `p004-account-flow-readonly-20261011`。
- GitHub CI：最新开发分支 Build + Security/layout static regression + `dist/index.html` 校验 **成功**：[run 38133922339](https://github.com/dalulu05168/my-software-releases/actions/runs/38133922339)。
- Supabase：通过所连接 Supabase 插件直接读取 Edge Function 清单、核心业务表计数、索引、授权及安全 Advisor；**未写入生产库**。
- Floot：`get_publish_status` 确认已发布，域名为 `jiaoyipingtai-app.floot.app`，无自定义域名。当天 Floot 日构建操作额度已耗尽，无法进一步打开/运行站内交互测试。
- 网络 HTTP 直接探针：公开端点/未登录管理员端点、只读报表端点和 Floot 前台请求均因当前测试环境 DNS 不可解析而无法连通。**没有得到任何 HTTP 状态码；不能声称已验证真实页面/接口响应**。
- 无管理员、OPS、客户测试登录凭据；没有进行带身份的生产操作，亦未创建 OPS/客户/邀请。

## 核心业务数据库真实计数
| 表/业务 | 实际条数 |
|---|---:|
| master_account_auth | 1 |
| ops_accounts | 0 |
| ops_account_auth | 0 |
| ops_invite_codes | 0 |
| client_accounts | 0 |
| client_registration_attribution | 0 |
| orders | 0 |
| positions | 0 |
| cash_requests | 0 |

总账户 TOTP：`master_account_auth` 中 1/1 行 `totp_enabled=true`，仅验证配置，未验证动态验证码实际登录。

## 已执行检查与结果
| 项目 | 状态 | 证据、限制 |
|---|---|---|
| 前端打包 | PASS | GitHub Actions Vite build |
| 代码安全回归 | PASS | GitHub Actions 静态断言，非真实 E2E |
| 总账户已配置 TOTP | PASS (配置) | DB 1/1，未用 Google Authenticator 实际登录 |
| 固定六位数字客户邀请码 | FAIL (生产旧版) | 正式 `project4-securities-api` 的 `generateInviteCode` 返回 `OPS-` 加字母；开发分支改为六位数字，**未部署** |
| 邀请码全局唯一性 | PASS (结构) | `ops_invite_codes.code_digest` 唯一索引、`display_code` 唯一索引；尚无实例记录 |
| 创建 OPS 同时绑定 TOTP+邀请码 | NOT RUN | 数据库 OPS=0；不能在生产乱建 |
| 关联邀请码的客户注册 | NOT RUN (结构存在) | 已部署客户端 Edge Function 含 `register`；DB `register_client_with_invite` RPC 事务负责 OPS 归属；无客户测试账号 |
| 新六位数字邀请码与客户端注册的生产闭环 | FAIL (版本不一致) | 开发分支前后端已要求六位数字；正式 OPS 创建仍产生旧格式，正式注册仍要求旧码长度 |
| 报表端点隔离 | PASS (代码/授权检查)，NOT RUN (登录场景) | 连接 GitHub 的静态测试通过，真实 OPS-A/OPS-B 越权请求未运行 |
| 数据库直接匿名访问业务表 | PASS (权限) | 核心 `identities` / 客户 / 资金 / 订单 / 身份凭据表 `anon` 和 `authenticated` 不具备直接 SELECT/INSERT GRANT；RLS 未启用，须保持严格权限且后续评估 RLS |
| 敏感 RPC 被客户端直接执行 | PASS (权限) | `register_client_with_invite`、`project4_verify_totp`、`project4_set_ops_credentials`、`project4_store_totp_secret` 对 `anon` 与 `authenticated` EXECUTE 均为 false |
| 客户列表→客户订单、持仓及资金 | PASS (静态)，NOT RUN (生产) | 开发分支接入只读筛选；生产报表未部署该分支更新，DB 无客户样本 |
| APP 镜像 | NOT IMPLEMENTED | 旧模拟组件仍不是已验证真实手机镜像 |
| 实际下单、资金审批、余额账本 | NOT IMPLEMENTED / CLOSED | 只读与占位功能，不能假称可操作 |
| Floot 前台已发布 | PASS (发布状态) | Floot `get_publish_status` 直接返回 published=true；页面点击和布局验收未进行 |

## 发现的缺陷（按修复优先级）
1. **P0 / 线上与开发版本不一致**：正式项目子账户邀请码仍为 `OPS-` 字母数字码，不符合六位数字要求。须先在隔离环境部署安全的六位生成代码与客户端注册校验，再安排创建 OPS/实际注册测试；严禁把已通过 CI 等同于已上线。
2. **P0 / 缺少 E2E 数据与账户**：OPS、客户、交易数据全零，无法完成登录、绑定 2FA、邀请码注册、权限归属及客户明细联调。必须使用经允许的隔离测试环境创建测试账户，而不是往生产环境填造假交易数据。
3. **P1 / Supabase 安全 Advisor**：报告 3 个函数 `public.project4_base32_decode`、`public.project4_totp_code` 和 `public.project4_verify_totp_secret` 的 `search_path` 为 mutable，需专项修复与验证。官方修复指引：https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable
4. **P1 / 六位数字邀请码抗猜测机制需复核**：邀请码仅 100 万种，需对实际服务端执行 IP/设备/账号限流、异常审计、挑战验证和撞库防护的独立测试。
5. **P1 / 前端真实点击测试受限**：Floot 每日 build action 额度耗尽，且测试环境无法解析目标域名；无法验证页面操作或白屏。
6. **P2 / 其余业务模块**：订单执行、资金审批、真实余额、KYC/VIP 可写权限、APP 实镜像等未达到使用条件。

## 下一轮必须完成的 E2E 用例（需隔离测试环境）
- 总账户正确密码+TOTP登录通过，错误/过期六位 TOTP 拒绝。
- 总账户创建 OPS-A、OPS-B，各获**不同的独立密钥**和**不同的固定六位纯数字邀请码**，支持前导零。
- OPS-A/OPS-B 使用各自 TOTP 登录，观察失败次数和锁定机制。
- 客户使用 OPS-A 的邀请码注册并自动写入归属；OPS-B 不可查询此客户。
- 非六位、已停用、猜测邀请码一律拒绝；触发服务端限流。
- 2FA 重置不影响既有客户邀请码；禁用 OPS 使其邀请码不能继续邀请。
- 客户仅看自身订单/持仓；无资金账本时不得显示伪造余额或允许下单。
- 16:9及手机端核验注册、登录、子账户列表、客户列表以及镜像入口的真实点击。

**执行原则**：本轮全程只读核验外部环境；开发分支保持草稿 PR，未合并、未部署、未变更数据库或资金。
