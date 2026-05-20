// ============================================================
// Supabase 云端配置
// ============================================================
//
// 【快速接入步骤】
//
// 1. 打开 https://supabase.com 注册账号（免费，支持 GitHub 登录）
// 2. 点击 "New Project"，创建项目：
//    - Name: 天机阁
//    - Database Password: 设一个密码（记下来）
//    - Region: 选 Northeast Asia (Tokyo) 或 Southeast Asia (Singapore)
// 3. 创建完成后，进入 Settings > API，复制以下信息：
//    - Project URL
//    - anon public key
// 4. 填入下方配置，将 enabled 改为 true
// 5. 在 SQL Editor 中执行建表语句（见下方）
//
// 【免费额度】
// - 50,000 月活用户
// - 500MB 数据库
// - 1GB 文件存储
// - 50MB 数据库备份
// 完全够个人项目使用
//
// 【建表 SQL - 在 Supabase SQL Editor 中执行】
//
// -- 测算记录表
// CREATE TABLE IF NOT EXISTS user_history (
//   id BIGSERIAL PRIMARY KEY,
//   user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
//   type TEXT NOT NULL,
//   detail TEXT,
//   created_at TIMESTAMPTZ DEFAULT NOW()
// );
//
// -- 安全策略：用户只能读写自己的记录
// ALTER TABLE user_history ENABLE ROW LEVEL SECURITY;
// CREATE POLICY "Users can read own history" ON user_history
//   FOR SELECT USING (auth.uid() = user_id);
// CREATE POLICY "Users can insert own history" ON user_history
//   FOR INSERT WITH CHECK (auth.uid() = user_id);
// CREATE POLICY "Users can delete own history" ON user_history
//   FOR DELETE USING (auth.uid() = user_id);
//
// -- 用户资料表（存储昵称等额外信息）
// CREATE TABLE IF NOT EXISTS user_profiles (
//   id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
//   nick TEXT DEFAULT '用户',
//   avatar TEXT DEFAULT '',
//   social_type TEXT DEFAULT '',
//   is_guest BOOLEAN DEFAULT FALSE,
//   created_at TIMESTAMPTZ DEFAULT NOW()
// );
//
// ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
// CREATE POLICY "Users can read own profile" ON user_profiles
//   FOR SELECT USING (auth.uid() = id);
// CREATE POLICY "Users can update own profile" ON user_profiles
//   FOR UPDATE USING (auth.uid() = id);
// CREATE POLICY "Users can insert own profile" ON user_profiles
//   FOR INSERT WITH CHECK (auth.uid() = id);
//
// -- 新用户自动创建 profile
// CREATE OR REPLACE FUNCTION handle_new_user()
// RETURNS TRIGGER AS $$
// BEGIN
//   INSERT INTO user_profiles (id, nick)
//   VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nick', '用户'));
//   RETURN NEW;
// END;
// $$ LANGUAGE plpgsql SECURITY DEFINER;
//
// CREATE TRIGGER on_auth_user_created
//   AFTER INSERT ON auth.users
//   FOR EACH ROW EXECUTE FUNCTION handle_new_user();
//
// 【社交登录配置】
// 在 Supabase 控制台 > Authentication > Providers 中：
// - 微信：填入微信开放平台的 AppID 和 AppSecret
// - QQ：需要通过 Custom OAuth2 Provider 配置
// - Apple：启用 Sign in with Apple
//
// ============================================================

var SUPABASE_CONFIG = {
  enabled: true,

  // 从 Supabase 控制台 > Settings > API 获取
  url: 'https://unkciqwuchynlzmoiixv.supabase.co',
  anonKey: 'sb_publishable_qjYeVxMYrQnw_ac_LxihHg_YqHiVZih'
};

// Resend 邮件服务 API Key（用于密码重置等邮件发送）
var RESEND_KEY = 're_VNWKNrSQ_J1PuB5ZGnpNyENVXV5MVJ8X4';
