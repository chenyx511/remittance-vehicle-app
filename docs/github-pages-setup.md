# 将本项目部署为网站（GitHub Pages）供团队访问

部署完成后，团队可通过 **https://chenyx511.github.io/remittance-vehicle-app/** 直接打开并登录测试（使用登录页的演示账号）。

---

## ⚠️ 重要：必须用 gh-pages 分支

若打开链接后一直「加载中」或控制台出现 **`/src/main.tsx 404`**，说明 Pages 当前在用 **main 分支的源码**，而不是构建后的网站。

**请务必**在 Settings → Pages 里把 **Branch 选成 gh-pages**（不要选 main）。只有 gh-pages 上才是构建好的 `dist` 内容，main 分支的 index 会直接请求源码导致 404。

---

## 一、在仓库里开启 GitHub Pages（必做一次）

1. 打开：**https://github.com/chenyx511/remittance-vehicle-app/settings/pages**
2. 在 **Build and deployment** 区域：
   - **Source** 选择 **Deploy from a branch**
   - **Branch** 选择 **gh-pages**（必须选此项），目录选 **/ (root)**，点 Save
3. 保存后，网站会从 `gh-pages` 分支发布（该分支由 Actions 自动推送，无需手建）。

---

## 二、触发部署（二选一）

### 方式 A：推送一次代码（推荐）

在项目目录执行：

```bash
cd "/Users/chenyx/Documents/app开发/汇款用车审批平台/app"
git add .
git commit -m "chore: trigger GitHub Pages deploy"
git push origin main
```

推送后约 1～2 分钟，Actions 会自动构建并把结果推到 `gh-pages`，Pages 会自动更新。

### 方式 B：在网页上手动运行工作流

1. 打开：**https://github.com/chenyx511/remittance-vehicle-app/actions**
2. 左侧点击 **Deploy to GitHub Pages**
3. 右侧 **Run workflow** → 选择分支 **main** → 再点 **Run workflow**
4. 等该次运行变绿（约 1～2 分钟）即部署完成。

---

## 三、确认是否成功

- 打开：**https://chenyx511.github.io/remittance-vehicle-app/**
- 若能看到登录页，说明部署成功；团队用该链接即可访问，登录页上有演示账号说明。

若仍是 404：

1. 确认 **Settings → Pages** 里 Source 为 **Deploy from a branch**，Branch 为 **gh-pages**
2. 打开 **Actions**，看最近一次 “Deploy to GitHub Pages” 是否成功（绿色勾）；若失败，点进去看报错。
