# Bullet-AI 🚀

**个人成长与生活管理 Web 应用** — 记录瞬间、沉淀思考、管理目标、养成习惯。

> 在线体验: [react-test1-kappa-ten.vercel.app](https://react-test1-kappa-ten.vercel.app/)

## 项目文档

| 文档 | 说明 |
|------|------|
| [需求分析](docs/requirements-analysis.md) | 完整功能需求、用户角色、非功能需求、页面路由 |
| [数据库 ER 图](docs/ER/er-diagram.md) | 实体关系图、表结构、关系说明、图片存储方案 |
| [Supabase 设置](SUPABASE_SETUP.md) | 数据库初始化 SQL、RLS 策略配置 |

## 功能概览

- **Moments** — 图文日记，回溯记录生活瞬间
- **Reflections** — 结构化思想感悟，支持来源/地点标注
- **Goals** — 日历视图目标管理 + 迁移清单
- **Habits** — 基于 `habit_checkins` 的每日/每周习惯历史打卡追踪

Moments、Reflections、Goals、Habits 和 Habit Check-ins 均采用本地优先写入：浏览器先将实体与 outbox 原子写入 IndexedDB，再由同步引擎异步提交到 Supabase。断网期间的变更会在恢复联网后自动重试。

## 技术栈

- **框架**: Next.js 15.5 + React 19 + TypeScript
- **样式**: Tailwind CSS v4
- **后端**: Supabase（Postgres + Auth + Storage）
- **对话服务**: 可配置的第三方 LLM API
- **部署**: Vercel

## 本地开发

```bash
pnpm install
pnpm dev
```

需要配置环境变量:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `LLM_API_KEY`（可选对话服务）
- `LLM_BASE_URL`（可选对话服务）

## 数据库迁移

在 Supabase SQL Editor 执行这一个文件即可。它同时支持新库建表和旧库修复：

```sql
db/migrations/000_current_schema.sql
```

这个脚本会：

- 创建 `habit_checkins` 历史打卡表。
- 为习惯打卡补齐稳定 `client_id`、`habit_client_id` 和可合并的打卡状态字段。
- 创建 `ai_usage_events`，用于限制登录用户的 AI 调用频率。
- 为同一用户、同一习惯客户端 ID、同一日期添加唯一约束。
- 为目标补齐颜色和手动排序字段。
- 启用 RLS，限制用户只能读写自己的打卡记录。
- 将旧 `habits.last_checkin` 最近一次打卡兼容迁移为一条历史记录。
- 将语言、强调色、浅色/深色/跟随系统、完成目标保留策略等偏好保存到 `profiles`。
- 刷新 Supabase/PostgREST schema cache。

## 验证命令

```bash
pnpm exec tsc --noEmit
pnpm lint
pnpm build
```
