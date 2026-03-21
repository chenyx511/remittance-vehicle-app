# Supabase 服务端存储配置说明

配置 Supabase 后，汇款申请、用车申请、通知、用户和车辆数据将存储在云端，**所有关联账户在任意设备和浏览器上都能看到相同数据**，不再受 localStorage 限制。

## 1. 创建 Supabase 项目

1. 打开 [supabase.com](https://supabase.com) 并登录
2. 点击 **New Project**，填写项目名称和数据库密码
3. 等待项目创建完成

## 2. 执行建表 SQL

1. 在 Supabase 控制台进入项目 → **SQL Editor**
2. 复制 `docs/supabase-schema.sql` 的内容
3. 粘贴到 SQL 编辑器并点击 **Run**
4. 确认执行成功，会创建 `users`、`vehicles`、`remittance_requests`、`vehicle_requests`、`notifications` 表及初始数据

## 3. 获取连接信息

1. 进入项目 **Settings** → **API**
2. 复制 **Project URL** 和 **anon public** key

## 4. 配置环境变量

在项目根目录创建或编辑 `.env`（或 `.env.local`）：

```bash
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

重启开发服务器后生效。

## 5. 本地开发与部署

- **本地**：将 `.env` 加入 `.gitignore`，不要提交密钥
- **Vercel 等平台**：在项目设置的 **Environment Variables** 中配置 `VITE_SUPABASE_URL` 和 `VITE_SUPABASE_ANON_KEY`

## 切换模式

- **已配置 Supabase**：使用云端数据，多端共享
- **未配置 Supabase**：使用 localStorage mock，仅当前浏览器可见（与原有行为一致）

## 图片上传

图片仍通过 `VITE_UPLOAD_API_URL` 指定的 Vercel 接口上传到 GitHub 仓库，与 Supabase 无关。未配置上传接口时，图片会以 data URL 形式保存，体积较大且不推荐生产使用。
