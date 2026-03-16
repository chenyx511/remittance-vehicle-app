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

1. 打开仓库 **Settings → Pages**。
2. 在 **Build and deployment** 里，**Source** 选择 **GitHub Actions**。
3. 保存后，每次推送到 `main` 分支会自动运行 `.github/workflows/deploy.yml`，构建并部署到 GitHub Pages。
4. 部署完成后，在 **Actions** 里可查看运行记录；访问地址为：  
   `https://<你的用户名>.github.io/<仓库名>/`

若仓库默认分支是 `master`，需要把 `.github/workflows/deploy.yml` 里的 `branches: [main]` 改成 `branches: [master]`，或把默认分支改为 `main`。
