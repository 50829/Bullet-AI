# Supabase 设置说明

## 本地连接远端 Supabase

1. 在 Supabase Dashboard 打开你的项目。
2. 进入 `Project Settings` -> `API`。
3. 复制：
   - `Project URL`
   - `anon public` key
4. 在项目根目录创建 `.env.local`：

```bash
cp .env.example .env.local
```

5. 填入真实值：

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

6. 重启开发服务器：

```bash
pnpm dev
```

## Auth 回调地址

在 Supabase Dashboard 进入 `Authentication` -> `URL Configuration`。

本地开发建议配置：

```text
Site URL: http://localhost:3000
Redirect URLs:
http://localhost:3000/auth/callback
```

线上部署后，再额外添加线上域名：

```text
https://your-domain.com/auth/callback
```

## profiles 表

当前版本不再强制用户设置用户名。`username` 是可选显示名，在设置里修改。

## 推荐执行方式

新 Supabase 项目直接执行当前全量快照：

```sql
db/migrations/000_current_schema.sql
```

这个文件会创建缺失表、修补旧表字段、配置 RLS、创建 Storage buckets 和 policies，并在最后执行 `notify pgrst, 'reload schema';` 刷新 Supabase PostgREST schema cache。

已经运行过旧版 SQL 的 Supabase 项目，按文件序号继续执行增量迁移：

```sql
db/migrations/001_goal_color_and_sort_order.sql
db/migrations/002_reliability_schema_guard.sql
```

`001_goal_color_and_sort_order.sql` 是历史增量迁移，相关字段已经合入 `000_current_schema.sql`。`002_reliability_schema_guard.sql` 是幂等守护迁移，用于补齐当前代码依赖的查询列、`deleted_at`、`client_id` 唯一索引、habit check-in 历史、触发器、AI 限流 RPC、RLS 和 Storage policies。所有迁移都应保持可重复执行。

说明：

- cookie 只用于 Supabase auth session，不存主题、语言或业务数据。
- 语言、外观、强调色、颜色模式和完成目标保留策略保存在 `profiles.preferred_language/ui_theme/accent_color/color_scheme/completed_goal_retention`，前端会先读 localStorage，再用云端偏好校准。
- 显示名冷却使用 `username_updated_at`，不要用通用 `updated_at` 判断，因为偏好保存也会更新 profiles 行。
- 习惯打卡历史表 `habit_checkins`、唯一约束、RLS、旧 `habits.last_checkin` 兼容迁移都已经包含在 `000_current_schema.sql` 里。
- AI 调用频率记录表 `ai_usage_events` 已经包含在 `000_current_schema.sql` 里，默认用于每个登录用户每小时 20 次的限流。

## 验证

本地启动后验证：

```bash
pnpm exec tsc --noEmit
pnpm lint
pnpm build
pnpm dev
```

未登录访问：

```text
http://localhost:3000/dashboard
```

应该跳转到：

```text
http://localhost:3000/login?next=%2Fdashboard
```
