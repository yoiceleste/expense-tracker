-- =============================================
-- 记账本 Supabase 数据库 Schema
-- 请在 Supabase SQL Editor 中执行此脚本
-- =============================================

-- 1. 启用 UUID 扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. 个人记账：分类表
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '📦',
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. 个人记账：账户表
CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '💵',
  balance NUMERIC(12,2) NOT NULL DEFAULT 0,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. 个人记账：记录表
CREATE TABLE IF NOT EXISTS records (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  amount NUMERIC(12,2) NOT NULL,
  original_amount NUMERIC(12,2),
  currency TEXT NOT NULL DEFAULT 'CNY',
  category_id TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  date TEXT NOT NULL,
  created_at BIGINT NOT NULL,
  tags TEXT[] NOT NULL DEFAULT '{}',
  account_id TEXT NOT NULL,
  created_at_tz TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. 个人记账：预算表
CREATE TABLE IF NOT EXISTS budgets (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  category_id TEXT NOT NULL DEFAULT '',
  amount NUMERIC(12,2) NOT NULL,
  month TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. 旅行表
CREATE TABLE IF NOT EXISTS trips (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'CNY',
  start_date TEXT NOT NULL DEFAULT '',
  end_date TEXT NOT NULL DEFAULT '',
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  created_at_tz TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. 旅行成员表
CREATE TABLE IF NOT EXISTS trip_members (
  id TEXT PRIMARY KEY,
  trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#4f6ef7',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(trip_id, id)
);

-- 8. 旅行消费记录表
CREATE TABLE IF NOT EXISTS trip_expenses (
  id TEXT PRIMARY KEY,
  trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  payer_id TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  split_among TEXT[] NOT NULL DEFAULT '{}',
  split_mode TEXT NOT NULL DEFAULT 'equal' CHECK (split_mode IN ('equal', 'custom')),
  split_amounts JSONB NOT NULL DEFAULT '{}',
  category_id TEXT NOT NULL,
  pay_method TEXT NOT NULL DEFAULT '',
  images TEXT[] NOT NULL DEFAULT '{}',
  note TEXT NOT NULL DEFAULT '',
  date TEXT NOT NULL,
  created_at BIGINT NOT NULL,
  created_at_tz TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- 索引
-- =============================================
CREATE INDEX IF NOT EXISTS idx_records_user_date ON records(user_id, date);
CREATE INDEX IF NOT EXISTS idx_budgets_user_month ON budgets(user_id, month);
CREATE INDEX IF NOT EXISTS idx_trips_user ON trips(user_id);
CREATE INDEX IF NOT EXISTS idx_trip_members_trip ON trip_members(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_expenses_trip ON trip_expenses(trip_id);

-- =============================================
-- RLS (Row Level Security) 策略
-- =============================================

-- 启用 RLS
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE records ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_expenses ENABLE ROW LEVEL SECURITY;

-- 用户只能操作自己的数据
CREATE POLICY "Users can manage own categories" ON categories
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can manage own accounts" ON accounts
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can manage own records" ON records
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can manage own budgets" ON budgets
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can manage own trips" ON trips
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can manage own trip_members" ON trip_members
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can manage own trip_expenses" ON trip_expenses
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
