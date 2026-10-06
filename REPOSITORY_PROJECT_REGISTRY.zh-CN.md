# GitHub 仓库中文项目总目录

> 用途：给当前 GitHub 账号下的仓库建立稳定的中文项目对应关系，避免以后仅凭英文仓库名判断项目。

| 仓库 | 中文项目对应 | 角色/状态 |
|---|---|---|
| `cloudphone-manager` | **皮皮爬云端 / 云手机管理系统** | 云手机主项目 |
| `growth-story-workspace` | **辰南撰写 · 人物与创作工作台** | 当前持续更新/部署仓库 |
| `005` | **辰南撰写 · 人物与创作工作台** | 同步/阶段版本，内容与 growth-story-workspace 高度相关 |
| `hei-pi` | **Pi 桌面系统 Web V2** | Web V2 基础工程 |
| `my-software-releases` | **软件发布与修复包中心** | Nuvexa Pro 热修复 + 4号交易平台 Render 部署文件等 |
| `eve-slack-agent` | **Eve Slack AI 智能代理模板** | Slack Agent / Vercel 模板 |
| `desktop-tutorial` | **GitHub Desktop 教程/测试仓库** | 学习/测试用途 |
| `CopilotForXcode` | **GitHub Copilot for Xcode** | Xcode AI 编程助手工程 |
| `-` | **未分配 / 空仓库** | 暂无正式项目 |

## 重点业务项目映射

### 1. 云手机项目
仓库：`dalulu05168/cloudphone-manager`

对应名称：**皮皮爬云端 / 云手机管理系统**

### 2. 辰南撰写项目
主持续更新仓库：`dalulu05168/growth-story-workspace`

相关同步/阶段仓库：`dalulu05168/005`

### 3. Nuvexa Pro
当前在 `dalulu05168/my-software-releases` 中可以明确看到 `nuvexa-hotfix/` 热修复文件。该仓库属于发布/修复中心，不等同于完整 Nuvexa Pro 主源码仓库。

### 4. 4号交易平台
当前在 `dalulu05168/my-software-releases` 中可以明确看到：
- `project4-render-app/`
- `project4-render-gateway/`

用于 4号项目 Render 应用与网关部署相关文件。

## 使用规则

以后处理仓库时，优先读取各仓库根目录的 `PROJECT_NOTE.zh-CN.md`，再判断项目归属。不要仅根据仓库英文名称猜测业务项目。
