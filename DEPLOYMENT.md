# 一周好食：手机网页版部署

本项目的排餐、食谱和购物清单可导出为静态网页。Vercel 或 Cloudflare Pages 任选一个即可，无需同时部署。本地模式可直接使用；启用跨设备同步时，需按照 CLOUD_SETUP.md 配置 Supabase。云同步不依赖 Manus 登录。

## 本地构建

使用 Node.js 24（本地验证版本 24.13.0）及 package.json 中指定的 pnpm 9.12.0：

```sh
corepack pnpm install --frozen-lockfile
corepack pnpm build:web
```

网页输出目录是 `web-build`。原有 `build` 命令仍构建 Express 后端到 `dist`，不能用它替代网页构建。

## Vercel（首选）

1. 将本次配置提交并推送到 GitHub 仓库 HuizhiXu/mealweek。
2. 在 Vercel 中导入此仓库，选择你要使用的账号/团队。
3. Root Directory 使用仓库根目录，Framework Preset 使用 Other，Node.js 使用 24.x。
4. 仓库内 vercel.json 已指定安装命令、构建命令和 web-build 输出目录，本地模式无需额外环境变量。云同步需要 CLOUD_SETUP.md 中的两个 EXPO_PUBLIC_SUPABASE 环境变量，并重新构建。
5. 部署成功后，在手机打开控制台提供的正式 HTTPS 地址。

此项目使用 Expo static 导出，每条路由有独立 HTML。cleanUrls 支持直接打开或刷新 /recipes、/shopping；无需将所有路径重写到首页。

## Cloudflare Pages（备选）

创建 Pages 项目并连接同一 GitHub 仓库，选择无框架预设：

- 构建命令：`corepack pnpm install --frozen-lockfile && corepack pnpm build:web`
- 构建输出目录：`web-build`
- 根目录：仓库根目录
- Node.js：24.13.0（仓库 .node-version 已声明；也可在构建环境设置 NODE_VERSION）

也可在本地构建后，通过 Pages Direct Upload 上传 web-build 目录。发布后使用平台提供的正式 HTTPS 地址。

## 手机上验证

- 打开首页、食谱和购物清单，确认无横向溢出且按钮可点击。
- 从食谱选择菜品并加入某天，再查看购物清单、勾选食材。
- 刷新页面，确认排餐和勾选状态保留。
- 直接访问 /recipes、/shopping 并刷新，确认不出现 404。
- iPhone 可使用 Safari 的“添加到主屏幕”；Android 可在浏览器菜单创建桌面快捷方式。本版本未实现离线缓存。

## 数据与图片限制

未配置 Supabase 或未登录时，排餐及勾选状态保存在当前浏览器本地。配置 Supabase 后，已登录账号的记录会自动同步；未上传的离线修改仍只在本机。更换域名或浏览器不会带走旧的本地记录，需在旧网址登录后导入。账号页可导出 JSON 备份。

原食谱照片使用 /manus-storage 图片代理，原始图片文件未包含在仓库中。静态部署不提供此代理；加载失败时会显示餐盘图标和菜名，排餐功能仍可使用。要恢复照片，请将有权使用的图片放入 public/recipes，并将 lib/recipes.ts 中的路径改为 /recipes/文件名，重新构建部署。

server/ 中的 Manus 登录、API 和 MySQL 模板不会随静态站部署。本次云同步通过 Supabase Auth、受行级权限保护的数据 API 和版本检查函数完成，无需额外 Express 服务器。请先运行 supabase/migrations/202610100001_planner.sql；仅填写环境变量不能创建数据库表。

## 参考

- Expo：https://docs.expo.dev/guides/publishing-websites/
- Cloudflare Pages：https://developers.cloudflare.com/pages/framework-guides/deploy-anything/
