# 将本项目部署为网站（GitHub Pages）供团队访问

部署完成后，团队可通过 **https://chenyx511.github.io/remittance-vehicle-app/** 直接打开并登录测试（使用登录页的演示账号）。

---

## 一、在仓库里开启 GitHub Pages（必做一次）

1. 打开：**https://github.com/chenyx511/remittance-vehicle-app/settings/pages**
2. 在 **Build and deployment** 区域：
   - **Source** 选择 **GitHub Actions**（不要选 “Deploy from a branch”）
3. 保存后无需其他设置，发布由本仓库的 Actions 工作流完成。

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

推送后约 1～2 分钟，Actions 会自动构建并发布。

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

1. 再确认 **Settings → Pages** 里 Source 为 **GitHub Actions**
2. 打开 **Actions** 页，看最近一次 “Deploy to GitHub Pages” 是否成功（绿色勾）；若失败，点进去看报错信息。
