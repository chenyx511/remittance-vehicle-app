-- 在 Supabase Dashboard → SQL Editor 中执行此脚本
-- 用于汇款用车审批平台的共享数据存储

-- 用户表（password_hash 用于管理员等需密码验证的用户，SHA-256）
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT,
  role TEXT NOT NULL CHECK (role IN ('STAFF','SUPERVISOR','FINANCE','ADMIN')),
  department TEXT,
  position TEXT,
  employment_status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (employment_status IN ('ACTIVE','INACTIVE')),
  permissions TEXT[] DEFAULT '{}'::TEXT[],
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 为已有表添加 password_hash 列（若表已存在）
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS position TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS employment_status TEXT NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE users ADD COLUMN IF NOT EXISTS permissions TEXT[] DEFAULT '{}'::TEXT[];
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_employment_status_check'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_employment_status_check CHECK (employment_status IN ('ACTIVE','INACTIVE'));
  END IF;
END $$;
UPDATE users SET employment_status = 'ACTIVE' WHERE employment_status IS NULL;
-- 为已有 admin 用户设置默认密码 123456
UPDATE users SET password_hash = '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92' WHERE id = 'admin' AND (password_hash IS NULL OR password_hash = '');

-- 车辆表
CREATE TABLE IF NOT EXISTS vehicles (
  id TEXT PRIMARY KEY,
  plate_number TEXT NOT NULL UNIQUE,
  brand TEXT,
  model TEXT,
  color TEXT,
  status TEXT NOT NULL DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE','IN_USE','MAINTENANCE')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 汇款申请表
CREATE TABLE IF NOT EXISTS remittance_requests (
  id TEXT PRIMARY KEY,
  request_no TEXT NOT NULL,
  applicant_id TEXT NOT NULL REFERENCES users(id),
  amount NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'CNY',
  recipient_name TEXT NOT NULL DEFAULT '',
  recipient_account TEXT,
  recipient_bank TEXT,
  settlement_detail_url TEXT,
  contract_no TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','SUPERVISOR_APPROVED','FINANCE_PROCESSING','COMPLETED','REJECTED')),
  supervisor_id TEXT REFERENCES users(id),
  supervisor_comment TEXT,
  supervisor_approved_at TIMESTAMPTZ,
  finance_id TEXT REFERENCES users(id),
  finance_comment TEXT,
  remittance_proof_url TEXT,
  remittance_date TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 用车申请表
CREATE TABLE IF NOT EXISTS vehicle_requests (
  id TEXT PRIMARY KEY,
  request_no TEXT NOT NULL,
  applicant_id TEXT NOT NULL REFERENCES users(id),
  vehicle_id TEXT NOT NULL REFERENCES vehicles(id),
  purpose TEXT NOT NULL DEFAULT '',
  destination TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  passengers INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','APPROVED','IN_USE','COMPLETED','REJECTED')),
  approver_id TEXT REFERENCES users(id),
  approver_comment TEXT,
  approved_at TIMESTAMPTZ,
  actual_start_time TIMESTAMPTZ,
  actual_end_time TIMESTAMPTZ,
  mileage_start NUMERIC,
  mileage_end NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 通知表
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  related_type TEXT,
  related_id TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_remittance_status ON remittance_requests(status);
CREATE INDEX IF NOT EXISTS idx_remittance_created ON remittance_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vehicle_req_status ON vehicle_requests(status);
CREATE INDEX IF NOT EXISTS idx_vehicle_req_created ON vehicle_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

-- 允许匿名读写（演示用；生产环境应配置 RLS）
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE remittance_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 先删除已有 policy，支持重复执行
DROP POLICY IF EXISTS "Allow all for users" ON users;
DROP POLICY IF EXISTS "Allow all for vehicles" ON vehicles;
DROP POLICY IF EXISTS "Allow all for remittance_requests" ON remittance_requests;
DROP POLICY IF EXISTS "Allow all for vehicle_requests" ON vehicle_requests;
DROP POLICY IF EXISTS "Allow all for notifications" ON notifications;

CREATE POLICY "Allow all for users" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for vehicles" ON vehicles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for remittance_requests" ON remittance_requests FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for vehicle_requests" ON vehicle_requests FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for notifications" ON notifications FOR ALL USING (true) WITH CHECK (true);

-- 初始用户数据（预设管理员：admin / 123456，password_hash 为 123456 的 SHA-256）
INSERT INTO users (id, username, email, password_hash, role, department, position, employment_status, permissions, phone) VALUES
  ('admin', 'admin', 'admin@company.com', '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', 'ADMIN', '管理部', '管理员', 'ACTIVE', ARRAY['USER_MANAGE','REMITTANCE_APPROVE','REMITTANCE_PROCESS','VEHICLE_APPROVE','VEHICLE_USE'], '13800138000'),
  ('1', '张三', 'zhangsan@company.com', NULL, 'STAFF', '不动产部', '担当', 'ACTIVE', ARRAY['VEHICLE_USE'], '13800138001'),
  ('2', '李四', 'lisi@company.com', NULL, 'SUPERVISOR', '不动产部', '上司', 'ACTIVE', ARRAY['REMITTANCE_APPROVE','VEHICLE_APPROVE'], '13800138002'),
  ('3', '王五', 'wangwu@company.com', NULL, 'FINANCE', '财务部', '财务', 'ACTIVE', ARRAY['REMITTANCE_PROCESS'], '13800138003'),
  ('4', '赵六', 'zhaoliu@company.com', NULL, 'STAFF', '租赁部', '担当', 'ACTIVE', ARRAY['VEHICLE_USE'], '13800138004')
ON CONFLICT (id) DO NOTHING;

-- 初始车辆数据
INSERT INTO vehicles (id, plate_number, brand, model, color, status) VALUES
  ('1', '京A12345', '丰田', '凯美瑞', '黑色', 'AVAILABLE'),
  ('2', '京B67890', '本田', '雅阁', '白色', 'IN_USE'),
  ('3', '京C11111', '大众', '帕萨特', '银色', 'AVAILABLE')
ON CONFLICT (id) DO NOTHING;
