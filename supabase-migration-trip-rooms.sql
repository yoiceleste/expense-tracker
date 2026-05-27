-- =============================================
-- 旅行分账 Schema 迁移：房间模式
-- 移除旅行相关表的 user_id，改为公开访问
-- =============================================

-- 1. 删除旧的 RLS 策略
DROP POLICY IF EXISTS "Users can manage own trips" ON trips;
DROP POLICY IF EXISTS "Users can manage own trip_members" ON trip_members;
DROP POLICY IF EXISTS "Users can manage own trip_expenses" ON trip_expenses;

-- 2. 关闭 RLS（旅行相关表改为公开）
ALTER TABLE trips DISABLE ROW LEVEL SECURITY;
ALTER TABLE trip_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE trip_expenses DISABLE ROW LEVEL SECURITY;

-- 3. 移除 user_id 列（如果存在）
ALTER TABLE trips DROP COLUMN IF EXISTS user_id;
ALTER TABLE trip_members DROP COLUMN IF EXISTS user_id;
ALTER TABLE trip_expenses DROP COLUMN IF EXISTS user_id;

-- 4. 移除旧的唯一约束（如果有）
ALTER TABLE trip_members DROP CONSTRAINT IF EXISTS trip_members_trip_id_id_key;

-- 5. 添加分享码字段到 trips 表
ALTER TABLE trips ADD COLUMN IF NOT EXISTS share_code TEXT UNIQUE;

-- 6. 为已有旅行生成分享码
UPDATE trips SET share_code = upper(substring(md5(random()::text), 1, 8)) WHERE share_code IS NULL;

-- 7. 创建索引
CREATE INDEX IF NOT EXISTS idx_trips_share_code ON trips(share_code);
