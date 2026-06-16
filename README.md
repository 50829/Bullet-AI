# Bullet-AI 🚀

**个人成长与生活管理 Web 应用** — 记录瞬间、沉淀思考、管理目标、养成习惯，AI 伴你成长。

> 在线体验: [react-test1-kappa-ten.vercel.app](https://react-test1-kappa-ten.vercel.app/)

## 项目文档

| 文档 | 说明 |
|------|------|
| [需求分析](docs/requirements-analysis.md) | 完整功能需求、用户角色、非功能需求、页面路由 |
| [数据库 ER 图](docs/er-diagram.md) | 实体关系图、表结构、关系说明、图片存储方案 |
| [Supabase 设置](SUPABASE_SETUP.md) | 数据库初始化 SQL、RLS 策略配置 |

## 功能概览

- **Moments** — 图文日记，回溯记录生活瞬间
- **Reflections** — 结构化思想感悟，支持来源/地点标注
- **Goals** — 日历视图目标管理 + 迁移清单
- **Habits** — 每日/每周习惯打卡追踪
- **AI 助手** — 树洞/生活/哲思/规划 4 种 AI 对话

## 技术栈

- **框架**: Next.js 15.5 + React 19 + TypeScript
- **样式**: Tailwind CSS v4
- **后端**: Supabase（Postgres + Auth + Storage）
- **AI**: 可配置的第三方 LLM API
- **部署**: Vercel

## 本地开发

```bash
pnpm install
pnpm dev
```

需要配置环境变量:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `LLM_API_KEY`（AI 功能）
- `LLM_BASE_URL`（AI 功能）
