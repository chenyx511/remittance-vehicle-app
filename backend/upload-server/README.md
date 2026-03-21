# 最小上传后端（Node/Express）

这是给“汇款与用车平台”准备的最小可部署上传服务。

## 1. 本地运行

```bash
cd backend/upload-server
npm install
cp .env.example .env
npm run dev
```

默认地址：`http://localhost:8787`

健康检查：

```bash
curl http://localhost:8787/health
```

## 2. 上传接口

- 方法：`POST`
- 路径：`/upload`
- Content-Type：`multipart/form-data`
- 字段：
  - `file`：图片文件（必填）
  - `type`：`settlement` 或 `proof`（可选，仅透传）
  - `filename`：原文件名（可选，仅透传）

成功返回：

```json
{
  "message": "上传成功",
  "data": {
    "url": "https://your-domain/uploads/xxx.jpg"
  }
}
```

静态访问目录：`/uploads/*`

## 3. 前端对接

在前端项目根目录 `.env` 配置：

```bash
VITE_UPLOAD_API_URL=http://localhost:8787/upload
```

## 4. 直接部署建议

- **Render / Railway / Fly.io**：可直接部署该目录
- 启动命令：`npm start`
- 需要配置环境变量：
  - `PORT`（平台通常会自动注入）
  - `BASE_URL`（建议设置为公网域名，避免生成内网 URL）
  - `CORS_ORIGIN`（建议设置为前端域名）

> 注意：如果部署平台文件系统是临时盘，重启后上传文件可能丢失。生产建议把文件落到对象存储（S3/OSS/R2/Supabase Storage）。
