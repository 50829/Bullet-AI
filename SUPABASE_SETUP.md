# Supabase 设置与迁移

## 环境变量

在 Supabase Dashboard 的 `Project Settings` -> `API` 中取得项目 URL 和 anon key，然后创建 `.env.local`：

```bash
cp .env.example .env.local
```

应用运行时需要：

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
LLM_API_KEY=your-llm-api-key
LLM_BASE_URL=https://api.openai.com/v1
LLM_MODEL=your-model-name
```

`SUPABASE_SERVICE_ROLE_KEY` 仅用于人工执行 Storage 审计脚本，不应暴露给浏览器，也不再由线上清理接口使用。

## Auth 回调

在 `Authentication` -> `URL Configuration` 中配置：

```text
Site URL: http://localhost:3000
Redirect URLs:
http://localhost:3000/auth/callback
https://your-domain.com/auth/callback
```

## 新项目

新 Supabase 项目先执行最终 schema，再执行当前的前向迁移：

```sql
db/migrations/000_current_schema.sql
db/migrations/006_incremental_sync_change_log.sql
db/migrations/007_habit_started_on_invariant.sql
```

不要对新项目执行 `005`。`000_current_schema.sql` 是当前基线，`006` 及后续编号是基线之上的前向迁移。基线已包含最终表结构、版本触发器、索引、RLS、AI 限流 RPC 和 Moments Storage 策略；Auth 用户创建后会由数据库触发器原子创建对应 Profile。

## 已有项目升级

生产数据库已经应用至 `007_habit_started_on_invariant.sql`，不要重复执行 `005-007`。下一条迁移从 `008` 开始，继续遵守前向、连续编号和不可改写约束。

## 本地数据库契约测试

仓库固定使用 Node `24.15.0`、pnpm `11.9.x` 和 Supabase CLI `2.101.0`。安装 Docker 后运行：

```bash
pnpm install --frozen-lockfile
pnpm test:db
```

该命令启动隔离的本地 Supabase，重置本地数据库，按新库路径应用 `000 + 006 + 007`，再运行 `supabase/tests/database` 下的 pgTAP 测试。重置只作用于 project id 为 `bullet-ai` 的本地 Docker 数据库，不会读取线上项目凭据。

契约测试覆盖：

- `version` 触发器与实际 CAS 竞争；
- 所有用户资源及增量日志的自有/跨用户 RLS；
- Habit 的显式且不可变 `started_on`、同用户引用与级联删除；
- 删除 tombstone 和 change-log 游标基础契约；
- AI 限流 RPC 的角色权限及禁止直接写事件；
- Moments bucket 的私有属性、5 MiB/MIME 元数据和用户目录策略。

文件大小和 MIME 的拒绝发生在 Storage API 层；pgTAP 验证数据库保存的 bucket 限制，上传 API 的端到端验证应另行保留。GitHub Actions 会在每次 push/PR 同时执行应用检查和这套数据库契约。

### 迁移链约定

`005` 是已经执行的生产基线，只保留校验记录，不再由测试或部署流程运行。`001-004` 已退役删除。新数据库使用 `000 + 006 + 007...`；manifest 记录生产已应用至 `007`。以后只新增连续编号的前向迁移，不改写已执行文件。

## Storage 审计与清理

脚本默认只读。它会分页读取所有 Moment 图片引用，递归列出 Storage 对象，并报告缺失引用、超过指定天数的孤儿候选和旧 bucket 对象数：

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key \
pnpm storage:audit --older-than-days=30
```

删除操作必须显式提供操作参数和确认词。先备份并复核只读报告，再执行：

```bash
# 删除超过 30 天且未被 Moment 引用的对象
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key \
pnpm storage:audit \
  --delete-orphans \
  --older-than-days=30 \
  --confirm=DELETE_STORAGE

# 清空并删除 Reflections、Goals、Habits 三个旧 bucket
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key \
pnpm storage:audit \
  --delete-legacy-buckets \
  --confirm=DELETE_STORAGE
```

该脚本通过 Supabase Storage API 删除对象，不直接删除 `storage.objects` 元数据。生产环境不再提供定时 cleanup route，也不需要 Vercel Cron、`CRON_SECRET`、`MAINTENANCE_CLEANUP_SECRET` 或 `DATA_RETENTION_DAYS`。

## 最终数据约束

- `client_id` 是用户范围内的稳定业务 ID；bigint `id` 仅供数据库内部使用。
- `version` 是乐观并发版本。更新必须同时按 `user_id/client_id/version` 匹配；更新成功后数据库返回递增后的版本。
- 删除是物理删除。Habit 删除会通过外键级联删除对应打卡。
- Weekly Habit 按用户 `week_starts_on` 划分自然周；数据库只保存真实存在的打卡行。
- Habit 的 `started_on` 是创建时必须显式提供且之后不可变的业务起始日，离线同步不会用服务器同步时间改写它。
- `username` 是可重复、可为空的显示名，不是账号 handle。
- AI 使用事件只能通过安全定义的无参数 RPC 预留，客户端不能指定用户、窗口或限额。

## 验证

部署前至少运行：

```bash
pnpm exec tsc --noEmit
pnpm lint
pnpm format:check
pnpm migration:check
pnpm test
pnpm build
```

数据库侧应额外验证：

- 两个会话以相同 `baseVersion` 更新同一行时，第二次 CAS 更新影响 0 行；
- 删除 Habit 会级联删除其全部 `habit_checkins`；
- 普通登录用户不能直接 insert `ai_usage_events`；
- 非 Moments bucket 无浏览器读写权限；
- 大于 5MB 或 MIME 不在白名单内的 Moment 图片上传失败；
- 上海时区凌晨创建 Moment 时，`occurred_on` 与用户选择日期一致。
