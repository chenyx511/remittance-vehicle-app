# Vercel + GitHub 存储部署（图片写入 GitHub 仓库）

上传的图片会直接写入你的 GitHub 仓库，无需 Cloudflare R2 或自建服务器。

## 1. 创建 GitHub Personal Access Token

1. 打开 https://github.com/settings/tokens
2. 点击 **Generate new token (classic)**
3. 勾选 `repo` 权限（需完整 repo 权限以便写入文件）
4. 生成并复制 token（只显示一次，请妥善保存）

## 2. 创建存储仓库（推荐单独仓库）

为避免与前端构建冲突，建议新建一个**仅用于存储图片**的仓库，例如：

- 仓库名：`remittance-vehicle-app-uploads`
- 可见性：Public（raw 链接才能直接访问）
- 无需初始化，空仓库即可

## 3. 部署到 Vercel

### 方式 A：Vercel 网页

1. 登录 https://vercel.com
2. **Add New** → **Project** → 导入你的 `remittance-vehicle-app` 仓库
3. 构建配置保持默认（Vercel 会读取 `vercel.json`）
4. 在 **Environment Variables** 中添加：

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `GITHUB_TOKEN` | `ghp_xxx...` | 你的 GitHub token |
| `GITHUB_REPO` | `chenyx511/remittance-vehicle-app-uploads` | 存储仓库（或使用主仓库） |
| `GITHUB_BRANCH` | `main` | 写入分支 |
| `CORS_ORIGIN` | `https://chenyx511.github.io` | 前端域名 |

5. 点击 **Deploy**

### 方式 B：Vercel CLI

```bash
# 安装 Vercel CLI
npm i -g vercel

# 在项目根目录
cd "/Users/chenyx/Documents/app开发/汇款用车审批平台/app"
vercel

# 按提示登录并部署，然后在 Vercel 控制台添加环境变量
```

## 4. 配置前端

部署完成后，Vercel 会给你一个域名，例如：`remittance-vehicle-app-xxx.vercel.app`。

在项目根目录 `.env` 中设置：

```bash
VITE_UPLOAD_API_URL=https://remittance-vehicle-app-xxx.vercel.app/api/upload
```

重新构建并部署前端（GitHub Actions 或本地构建后推送 gh-pages）后，上传会走 Vercel API，图片会写入你指定的 GitHub 仓库。

## 5. 图片访问

图片 URL 形如：

```
https://raw.githubusercontent.com/chenyx511/remittance-vehicle-app-uploads/main/uploads/settlement/2026/03/21/xxx.jpg
```

前端会把该 URL 存入申请记录，上司在任意浏览器都可访问。

## 6. 重要说明：申请数据存储

当前项目的**申请记录**（谁申请、金额、图片链接等）存在浏览器的 **localStorage**，**不同浏览器/设备互不同步**。

- 担当 在浏览器 A 创建的申请，上司 在浏览器 B 打开时**看不到**（上司的 localStorage 里没有该记录）
- 图片 URL 已写入 GitHub，但承载该 URL 的「申请记录」仍在担当的浏览器里
- 若要在不同设备之间共享数据，需要接入真实后端数据库（非本次 Vercel 方案范围）

建议测试时：用**同一浏览器**，先以担当身份创建申请并上传图片，再退出登录、以上司身份登录，应能看到该申请及图片。

## 7. 排查「图片加载失败」

1. **F12 开发者工具 → Network**：上传时查看是否请求了 Vercel 的 `/api/upload`，返回状态是否为 200
2. 若上传成功，详情页会显示图片 URL；若加载失败，会显示「图片加载失败」及可点击的链接
3. 点击该链接在新窗口打开，若能显示图片则说明 URL 正确，可能是页面内加载被拦截
4. 确认 GitHub 仓库 `remittance-vehicle-app-uploads` 为 **Public**，否则 raw 链接无法匿名访问

## 8. 可选：仅部署 API

若希望前端继续用 GitHub Pages，只把上传 API 部署到 Vercel：从主项目部署后，前端仍用 `chenyx511.github.io`，只把 `VITE_UPLOAD_API_URL` 指到 Vercel 的 `/api/upload` 即可。
