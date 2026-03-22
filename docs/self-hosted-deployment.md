# 自建服务器部署指南

本指南说明如何将「汇款用车审批平台」部署到您自己的服务器（如阿里云、腾讯云、AWS 等）。

---

## 一、架构概览

| 组件 | 说明 |
|------|------|
| **前端** | Vite + React 构建的静态 SPA，由 nginx 托管 |
| **数据存储** | Supabase（云端）或本地 localStorage |
| **图片上传** | 可选：自建 Node 上传服务（保存到服务器磁盘）|

---

## 二、服务器环境要求

- **系统**：Ubuntu 22.04 LTS 或 Debian 12（推荐）
- **配置**：1 核 2G 内存起
- **软件**：Node.js 18+、nginx、PM2（可选）

---

## 三、安装依赖

### 3.1 安装 Node.js 20

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
node -v   # 应显示 v20.x.x
npm -v
```

### 3.2 安装 nginx

```bash
sudo apt-get update
sudo apt-get install -y nginx
sudo systemctl enable nginx
```

### 3.3 安装 PM2（用于守护上传服务进程）

```bash
sudo npm install -g pm2
```

---

## 四、项目构建与上传

### 4.1 在本地或 CI 中构建

```bash
# 克隆项目
git clone https://github.com/你的用户名/remittance-vehicle-app.git
cd remittance-vehicle-app

# 安装依赖
npm ci

# 构建（部署到根路径时可不设 VITE_BASE_PATH）
VITE_BASE_PATH= \
VITE_SUPABASE_URL=https://xxx.supabase.co \
VITE_SUPABASE_ANON_KEY=你的anon_key \
VITE_UPLOAD_API_URL=https://你的域名/api/upload \
npm run build
```

**环境变量说明：**

| 变量 | 必填 | 说明 |
|------|------|------|
| `VITE_BASE_PATH` | 否 | 部署子路径时填写，如 `/app/`；根路径留空 |
| `VITE_SUPABASE_URL` | 是 | Supabase 项目 URL |
| `VITE_SUPABASE_ANON_KEY` | 是 | Supabase anon key |
| `VITE_UPLOAD_API_URL` | 否 | 上传接口地址，如 `https://域名/api/upload`；不填则用 base64 本地存储 |

### 4.2 上传到服务器

```bash
# 使用 scp 或 rsync
rsync -avz --delete dist/ user@你的服务器IP:/var/www/remittance-app/
rsync -avz server/ user@你的服务器IP:/var/www/remittance-app/server/
rsync -avz package.json package-lock.json user@你的服务器IP:/var/www/remittance-app/
```

---

## 五、服务器端配置

### 5.1 目录结构

```
/var/www/remittance-app/
├── dist/              # 前端构建产物（index.html、assets/）
├── server/            # 上传服务代码
│   └── upload-server.js
├── uploads/           # 上传图片存储目录（由上传服务创建）
├── package.json
└── package-lock.json
```

### 5.2 安装并启动上传服务

```bash
cd /var/www/remittance-app
npm ci --omit=dev   # 仅安装生产依赖

# 创建上传目录
mkdir -p uploads

# 使用 PM2 启动
PORT=3001 \
UPLOAD_DIR=/var/www/remittance-app/uploads \
PUBLIC_URL=https://你的域名 \
CORS_ORIGIN=https://你的域名 \
pm2 start server/upload-server.js --name remittance-upload

pm2 save
pm2 startup   # 按提示执行，开机自启
```

**上传服务环境变量：**

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PORT` | 3001 | 上传服务监听端口 |
| `UPLOAD_DIR` | ./uploads | 图片保存目录 |
| `PUBLIC_URL` | http://localhost:3001 | 图片访问根 URL（需与 nginx 代理后的域名一致）|
| `CORS_ORIGIN` | * | 允许的前端来源，生产建议填域名 |

### 5.3 使用 systemd 管理上传服务（可选）

若不使用 PM2，可创建 systemd 服务：

```bash
sudo tee /etc/systemd/system/remittance-upload.service << 'EOF'
[Unit]
Description=Remittance App Upload Server
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/remittance-app
Environment="PORT=3001"
Environment="UPLOAD_DIR=/var/www/remittance-app/uploads"
Environment="PUBLIC_URL=https://你的域名"
Environment="CORS_ORIGIN=https://你的域名"
ExecStart=/usr/bin/node server/upload-server.js
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable remittance-upload
sudo systemctl start remittance-upload
sudo systemctl status remittance-upload
```

---

## 六、Nginx 配置

### 6.1 创建站点配置

```bash
sudo nano /etc/nginx/sites-available/remittance-app
```

内容如下（替换 `你的域名` 和 `你的服务器IP`）：

```nginx
server {
    listen 80;
    server_name 你的域名;   # 例如 app.example.com

    root /var/www/remittance-app/dist;
    index index.html;

    # 前端 SPA 路由
    location / {
        try_files $uri $uri/ /index.html;
    }

    # 上传接口代理到 Node 服务
    location /api/upload {
        proxy_pass http://127.0.0.1:3001/upload;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        client_max_body_size 4M;
    }

    # 上传图片静态访问（若上传服务与前端同域）
    location /uploads/ {
        alias /var/www/remittance-app/uploads/;
    }
}
```

### 6.2 启用站点并重载 nginx

```bash
sudo ln -s /etc/nginx/sites-available/remittance-app /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 6.3 配置 HTTPS（Let's Encrypt）

```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d 你的域名
```

按提示完成证书申请，certbot 会自动修改 nginx 配置。

---

## 七、环境变量与构建

### 7.1 部署到根路径

构建时：

```bash
VITE_BASE_PATH= \
VITE_SUPABASE_URL=https://xxx.supabase.co \
VITE_SUPABASE_ANON_KEY=eyJ... \
VITE_UPLOAD_API_URL=https://你的域名/api/upload \
npm run build
```

### 7.2 部署到子路径（如 /app/）

构建时：

```bash
VITE_BASE_PATH=/app/ \
VITE_SUPABASE_URL=... \
VITE_SUPABASE_ANON_KEY=... \
VITE_UPLOAD_API_URL=https://你的域名/app/api/upload \
npm run build
```

nginx 需调整：

```nginx
root /var/www/remittance-app/dist;
location /app/ {
    alias /var/www/remittance-app/dist/;
    try_files $uri $uri/ /app/index.html;
}
location /app/api/upload {
    proxy_pass http://127.0.0.1:3001/upload;
    # ... 同上
}
```

---

## 八、Supabase 数据准备

1. 在 [supabase.com](https://supabase.com) 创建项目  
2. 在 SQL Editor 中执行 `docs/supabase-schema.sql`  
3. 在 Settings → API 中获取 Project URL 和 anon key  
4. 将上述值填入构建时的 `VITE_SUPABASE_URL` 和 `VITE_SUPABASE_ANON_KEY`

---

## 九、部署检查清单

- [ ] Node.js、nginx、PM2 已安装  
- [ ] 项目已构建，`dist/` 已上传到服务器  
- [ ] 上传服务已启动（PM2 或 systemd）  
- [ ] nginx 已配置并重载  
- [ ] 域名已解析到服务器  
- [ ] HTTPS 已配置（生产环境推荐）  
- [ ] Supabase 已建表并填入 URL 和 anon key  
- [ ] 构建时的 `VITE_UPLOAD_API_URL` 与 nginx 代理路径一致  

---

## 十、常见问题

### 上传 404

- 确认上传服务已启动：`pm2 list` 或 `systemctl status remittance-upload`
- 确认 nginx 中 `location /api/upload` 的 `proxy_pass` 指向正确端口

### 图片无法显示

- 确认 `PUBLIC_URL` 为最终访问域名（含 https）
- 确认 nginx 中 `location /uploads/` 的 `alias` 路径正确

### CORS 错误

- 将 `CORS_ORIGIN` 设为前端实际域名，如 `https://app.example.com`

### 刷新页面 404

- 确认 nginx 中 `try_files` 配置为 `$uri $uri/ /index.html`（根路径）或对应子路径

---

## 十一、简要部署流程（命令汇总）

```bash
# 1. 服务器安装
sudo apt update && sudo apt install -y nginx
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm i -g pm2

# 2. 本地构建
git clone https://github.com/你的用户名/remittance-vehicle-app.git
cd remittance-vehicle-app
npm ci
VITE_BASE_PATH= VITE_SUPABASE_URL=xxx VITE_SUPABASE_ANON_KEY=xxx VITE_UPLOAD_API_URL=https://域名/api/upload npm run build

# 3. 上传
rsync -avz dist/ server/ package*.json user@服务器:/var/www/remittance-app/

# 4. 服务器启动
ssh user@服务器
cd /var/www/remittance-app && npm ci --omit=dev
mkdir -p uploads
PORT=3001 UPLOAD_DIR=/var/www/remittance-app/uploads PUBLIC_URL=https://域名 CORS_ORIGIN=https://域名 pm2 start server/upload-server.js --name remittance-upload
pm2 save && pm2 startup

# 5. 配置 nginx（见上文）并重载
sudo nginx -t && sudo systemctl reload nginx
```
