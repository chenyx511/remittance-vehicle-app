## 项目简介

本项目是一个基于 **React + TypeScript + Vite** 的前端单页应用，用于模拟“汇款 / 用车审批平台”的业务流程，包含登录注册、仪表盘、汇款/用车申请与审批、通知、个人资料等模块。

主要技术栈：

- React 19、React Router 7
- TypeScript
- Vite 7
- Tailwind CSS + Radix UI + 自定义 UI 组件
- Zustand 状态管理
- i18next 国际化

---

## 本地开发

- 安装依赖：

```bash
npm install
```

- 本地启动开发服务器：

```bash
npm run dev
```

---

## 代码检查（Lint）

项目使用 **ESLint** 做基础代码规范检查：

```bash
npm run lint
```

---

## 测试（Vitest）

项目集成了 **Vitest + jsdom + React Testing Library**，当前包含：

- `src/stores/authStore.test.ts`：覆盖登录 / 登出等核心鉴权逻辑；
- `src/App.test.tsx`：覆盖 `ProtectedRoute` 在登录/未登录状态下的路由行为。

常用命令：

- 运行全部测试：

```bash
npm test
```

- 监听模式（适合开发时持续运行）：

```bash
npm run test:watch
```

测试会自动使用 `vitest.config.ts` 中的配置（jsdom 环境、`@` 路径别名等），无需额外手动设置。

---

## 代码格式化（Prettier）

项目使用 **Prettier** 统一代码风格，配置位于 `.prettierrc.json`，忽略规则见 `.prettierignore`。

- 一键格式化整个项目：

```bash
npm run format
```

推荐在提交代码前执行一次 `npm run format` 与 `npm run lint`，确保代码风格与质量一致。

---

## 构建与预览

- **本地构建**（产出在 `dist/`）：

```bash
npm run build
```

- **本地预览构建结果**（默认用 Vite 的 `base: './'`，根路径访问即可）：

```bash
npm run preview
```

如需模拟 GitHub Pages 子路径（如 `/remittance-vehicle-app/`），可先按子路径构建再起静态服务：

```bash
VITE_BASE_PATH=/remittance-vehicle-app/ npm run build
npx serve dist -p 5000
```

浏览器访问 `http://localhost:5000/remittance-vehicle-app/` 进行验证。

---

## 最小后端接入（图片上传）

为了解决“担当上传图片后，上司在其他浏览器/设备看不到”的问题，项目已支持**可配置上传后端**：

1. 复制环境变量示例并配置上传接口：

```bash
cp .env.example .env
```

在 `.env` 中设置：

```bash
VITE_UPLOAD_API_URL=https://your-upload-api.example.com/upload
```

2. 启动前端后，汇款申请中的“决算明细/汇款凭证”上传会优先走后端接口。
3. 若不配置该变量，系统会回退到本地模式（仅当前浏览器可见，不跨浏览器共享）。

仓库已提供可直接运行的最小后端示例：`backend/upload-server/`。
也提供了无服务器版本：`backend/cloudflare-worker-r2/`（Cloudflare Worker + R2）。

### 上传接口约定（最小）

- 请求：`POST` `multipart/form-data`
  - `file`: 文件（二进制）
  - `type`: `settlement` 或 `proof`
  - `filename`: 原文件名
- 成功响应（任一形式均支持）：

```json
{ "url": "https://cdn.example.com/xxx.jpg" }
```

或

```json
{ "data": { "url": "https://cdn.example.com/xxx.jpg" } }
```

建议后端将文件存入对象存储（如 S3 / OSS / Supabase Storage）并返回可访问 URL。

---

## 部署到 GitHub

### 一、把代码推送到 GitHub

1. **在 GitHub 上新建仓库**  
   打开 [GitHub New Repository](https://github.com/new)，填写仓库名（例如 `remittance-vehicle-app`），选择 Public，**不要**勾选 “Add a README”，创建空仓库。

2. **在项目根目录执行：**

```bash
cd "/Users/chenyx/Documents/app开发/汇款用车审批平台/app"

# 初始化 Git（若尚未初始化）
git init

# 添加所有文件
git add .
git commit -m "Initial commit: 汇款用车审批平台"

# 添加远程仓库（把 <你的用户名> 和 <仓库名> 换成你的）
git remote add origin https://github.com/<你的用户名>/<仓库名>.git

# 推送到 main 分支（若本地是 master，可先执行: git branch -M main）
git branch -M main
git push -u origin main
```

推送成功后，代码就在你的 GitHub 仓库里了。

### 二、开启 GitHub Pages（可选：在线访问）

若希望在线访问该应用（例如 `https://<你的用户名>.github.io/<仓库名>/`）：

1. 打开仓库 **Settings → Pages**（如：`https://github.com/<用户名>/<仓库名>/settings/pages`）。
2. 在 **Build and deployment** 里：
   - **Source** 选择 **Deploy from a branch**（不要选 GitHub Actions）。
   - **Branch** 选择 **gh-pages**，目录选 **/ (root)**，保存。
3. 每次推送到 `main` 分支会触发 `.github/workflows/deploy.yml`：在 Actions 里构建，并把 `dist` 推到 **gh-pages** 分支；Pages 从该分支发布，所以必须选 gh-pages。
4. 部署完成后访问：`https://<你的用户名>.github.io/<仓库名>/`；详细步骤见 **docs/github-pages-setup.md**。

若仓库默认分支是 `master`，需把 `.github/workflows/deploy.yml` 里的 `branches: [main]` 改为 `branches: [master]`，或将默认分支改为 `main`。
