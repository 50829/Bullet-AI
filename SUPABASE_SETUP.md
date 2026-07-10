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

新 Supabase 项目只执行最终 schema：

```sql
db/migrations/000_current_schema.sql
```

不要再对新项目执行 `001` 至 `005`。`000_current_schema.sql` 已包含最终表结构、版本触发器、索引、RLS、AI 限流 RPC 和 Moments Storage 策略；Auth 用户创建后会由数据库触发器原子创建对应 Profile。

## 已有项目升级

`005_domain_schema_v2.sql` 是破坏性迁移。它会保留未删除的核心记录，但会：

- 物理删除所有 `deleted_at` 非空的记录以及 `checked = false` 的打卡；
- 将 Moment 的旧日期回填到 `occurred_on`；
- 将 Reflection 的旧 `content` 回填到非空 `title/body`；
- 将 Goal 的 `status/progress` 完成状态回填到 `completed_at`；
- 删除 soft-delete、旧图片能力、单值主题及统计缓存等遗留列；
- 给业务实体增加 `version`，由数据库在每次 update 时原子递增；
- 将 AI 限流改为无参数 `reserve_ai_usage_event()`，固定每用户每小时 20 次；
- 撤销客户端直接写入 `ai_usage_events` 的 RLS policy；
- 将浏览器 Storage 权限限制为 Moments bucket、5MB 和明确的图片 MIME 类型。
- 回填缺失的 Profile，并在持有 `auth.users` 锁期间安装新用户 Profile 触发器，避免迁移窗口内漏建。

升级顺序：

1. 停止应用写入并备份完整数据库和四个旧 Storage buckets。
2. 确认项目已经执行过历史 `000` 至 `004`。
3. 在 SQL Editor 执行只读的 `db/operations/preflight_domain_schema_v2.sql`，保存每个结果集。
4. 使用下方脚本审计 Storage，保存 JSON 输出。
5. 执行 `db/migrations/005_domain_schema_v2.sql`。
6. 部署新版应用并完成冒烟测试。
7. 再次审计，确认无需保留旧 bucket 后显式删除。

迁移应在维护窗口执行。它会锁定核心业务表，并且不应在已经使用新版 `000` 创建的数据库上运行。

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
- Habit 的 `started_on` 是不可变的业务起始日，离线同步不会用服务器同步时间改写它。
- `username` 是可重复、可为空的显示名，不是账号 handle。
- AI 使用事件只能通过安全定义的无参数 RPC 预留，客户端不能指定用户、窗口或限额。

## 验证

部署前至少运行：

```bash
pnpm exec tsc --noEmit
pnpm lint
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
