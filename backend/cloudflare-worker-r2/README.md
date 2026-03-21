# Cloudflare Worker + R2 上传服务（无服务器）

这是“汇款与用车平台”的免维护上传后端版本，适合公网部署。

## 1) 准备

```bash
cd backend/cloudflare-worker-r2
npm install
npx wrangler login
```

## 2) 创建 R2 Bucket

```bash
npx wrangler r2 bucket create remittance-upload-bucket
```

> 如果你使用了其他 bucket 名称，请同步修改 `wrangler.toml` 中的 `bucket_name`。

## 3) 配置环境变量

编辑 `wrangler.toml`：

- `ALLOWED_ORIGIN`: 你的前端域名（开发阶段可用 `*`）
- `MAX_FILE_SIZE_MB`: 单文件限制，默认 `8`
- `PUBLIC_BASE_URL`: 可留空（自动使用 Worker 域名），或填自定义域名

## 4) 本地调试

```bash
npm run dev
```

- 健康检查：`GET /health`
- 上传接口：`POST /upload`（`multipart/form-data`，字段 `file`）
- 文件读取：`GET /files/:key`

## 5) 部署

```bash
npm run deploy
```

部署完成后得到 Worker URL，例如：

`https://remittance-upload-worker.<your-subdomain>.workers.dev`

前端环境变量设置：

```bash
VITE_UPLOAD_API_URL=https://remittance-upload-worker.<your-subdomain>.workers.dev/upload
```

## 6) 接口返回格式

```json
{
  "message": "上传成功",
  "data": {
    "url": "https://.../files/settlement%2F2026%2F03%2F21%2Fxxxx.jpg"
  }
}
```

该格式与前端已实现的上传解析逻辑兼容。
