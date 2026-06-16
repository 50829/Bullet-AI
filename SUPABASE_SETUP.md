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

在 Supabase SQL Editor 中执行：

```sql
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists profiles_username_idx on public.profiles(username);
create index if not exists profiles_user_id_idx on public.profiles(user_id);

alter table public.profiles enable row level security;

drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

drop trigger if exists update_profiles_updated_at on public.profiles;
create trigger update_profiles_updated_at
  before update on public.profiles
  for each row
  execute function public.update_updated_at_column();
```

如果你已经按旧文档创建了 `profiles.username not null`，需要执行：

```sql
alter table public.profiles
  alter column username drop not null;
```

## habit_checkins 迁移

习惯打卡历史需要执行：

```sql
db/migrations/001_habit_checkins.sql
```

它会创建 `habit_checkins`、唯一约束、RLS，并把旧 `habits.last_checkin` 兼容迁移成最近一次历史记录。

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
