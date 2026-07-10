# Bullet-AI

Bullet-AI 是一个以 Today 为入口的个人生活工作区，用于记录生活、沉淀感悟、安排目标和追踪习惯。AI 只负责把大目标拆成可执行步骤，不承担泛聊天、陪伴或自动读取个人记录。

## 当前业务

- **Today**：聚合今日目标、当前周期习惯和近期记录。
- **Moments**：按发生日期组织的图文生活记录。
- **Reflections**：只有标题和正文的思考记录。
- **Goals**：待安排或安排到某天的目标，可完成、排序，并可由 AI 规划生成。
- **Habits**：每日或每周习惯；weekly 按用户设置的周起始日计算完成状态和连续周数。

删除采用物理删除。业务页面先隐藏记录并提供 5 秒撤销，倒计时结束后才写入删除 mutation。

## 数据流

Supabase Postgres 是事实源。浏览器中的 IndexedDB 是可丢弃的 90 天近期快照和持久化写队列，不是第二套业务数据库。

```text
React feature hook
  -> IndexedDB mutation + optional image Blob (atomic)
  -> React Query pending overlay
  -> DataSyncWorker (online + visible + Web Lock)
  -> Supabase CAS write (client_id + version)
  -> remote snapshot / conflict draft
```

- create 使用稳定 `clientId`，可幂等重试。
- patch/delete 使用 `version` 做 compare-and-swap，冲突不会静默覆盖云端。
- 临时网络错误无限退避；鉴权错误暂停；永久错误和冲突在设置页可见。
- 首次读取建立 change-log 游标；后续只拉取变更行和物理删除 tombstone，并与游标一起原子写入本地快照。
- Moments/Reflections 离线保留近期快照；在线记录页用稳定 keyset 游标按页加载完整历史，不把旧页整体写入近期缓存。
- IndexedDB 有数据时先立即渲染，云端读取与队列 flush 在后台进行；过期远端响应不能覆盖较新的本地快照。
- 已同步的空集合也有持久标记，冷启动不会因为“没有行”退化成等待慢网络。
- Moment 只持久化私有 Storage 路径，签名 URL 与本地 `blob:` URL 只存在于内存视图。
- JSON 导出在线分页读取完整云端历史，再叠加本地 pending/conflict，并包含离线附件元数据。

详细边界和不变量见 [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)。

## 技术栈

- Next.js 15.5、React 19、TypeScript
- Tailwind CSS v4
- TanStack Query v5、IndexedDB (`idb`)
- Supabase Auth、Postgres、Storage、RLS
- OpenAI-compatible LLM endpoint，仅由 `/api/ai` 服务端路由调用

## 本地开发

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

必填环境变量：

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

启用目标规划 AI 时还需配置：

```text
LLM_API_KEY
LLM_BASE_URL
LLM_MODEL
```

## 数据库

新项目执行基线和后续前向迁移：

```text
db/migrations/000_current_schema.sql
db/migrations/006_incremental_sync_change_log.sql
db/migrations/007_habit_started_on_invariant.sql
```

生产数据库已经应用至 `007_habit_started_on_invariant.sql`，不要重复执行 `005-007`。`005` 只作为已应用基线记录保留，`001-004` 和对应 legacy 测试已经退役删除；下一条迁移从 `008` 开始。

## 验证

```bash
pnpm exec tsc --noEmit
pnpm lint
pnpm format:check
pnpm migration:check
pnpm test
pnpm build
```

安装 Docker 后还可运行真实 Supabase/pgTAP 契约测试：

```bash
pnpm test:db
```

`docs/requirements-analysis.md`、数据库课程报告和 ER 材料是历史交付快照，不是当前实现契约。
