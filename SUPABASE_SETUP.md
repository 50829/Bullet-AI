# Supabase 数据库设置说明

## 需要创建的 profiles 表

为了支持用户名功能，需要在 Supabase 中创建一个 `profiles` 表。

### SQL 创建语句

在 Supabase SQL Editor 中执行以下 SQL：

```sql
-- 创建 profiles 表
CREATE TABLE IF NOT EXISTS profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS profiles_username_idx ON profiles(username);
CREATE INDEX IF NOT EXISTS profiles_user_id_idx ON profiles(user_id);

-- 启用 Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 创建策略：用户只能查看和更新自己的 profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 创建函数：自动更新 updated_at 时间戳
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 创建触发器：在更新时自动更新 updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### 表结构说明

- **user_id** (UUID, PRIMARY KEY): 关联到 `auth.users` 表的用户 ID，使用 CASCADE 删除确保用户删除时自动删除 profile
- **username** (TEXT, UNIQUE, NOT NULL): 用户名，必须唯一且不能为空
- **created_at** (TIMESTAMP): 创建时间，自动设置为当前 UTC 时间
- **updated_at** (TIMESTAMP): 更新时间，通过触发器自动更新

### 安全设置

1. **Row Level Security (RLS)**: 已启用，确保用户只能访问自己的数据
2. **策略**:
   - 用户只能查看自己的 profile
   - 用户只能插入自己的 profile
   - 用户只能更新自己的 profile

### 注意事项

1. 对于现有用户，他们将在下次登录时被重定向到 `/username` 页面来设置用户名
2. 新用户注册后，首次登录也会被重定向到 `/username` 页面
3. 用户名在数据库中必须唯一，应用层会检查重复

### 验证设置

执行以下查询来验证表是否创建成功：

```sql
-- 查看表结构
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles';

-- 查看策略
SELECT * FROM pg_policies WHERE tablename = 'profiles';
```
