# 一周好食：免费云同步配置

方案：Vercel Hobby 托管 Expo 静态网页，Supabase Free 提供账号和 PostgreSQL。
应用直接使用受 RLS 保护的 Supabase API；不需要运行仓库里的 Manus/Express/MySQL 模板。

## 1. 创建 Supabase Free 项目

- 登录 https://supabase.com/dashboard ，创建 Free 组织与项目，不选择付费计划。
- 保存数据库密码到自己的密码管理器；不要放入前端、GitHub 或聊天。
- 在项目 SQL Editor 中执行 `supabase/migrations/202610100001_planner.sql`。
- Project Settings → API / Connect 中取得 Project URL 和 **publishable key**（`sb_publishable_` 开头）。
- 应用只接受 publishable key；不要用 `service_role` 或 `sb_secret_`。

脚本创建每个账号一行的 `planner_states`、自己的记录读取权限，以及
`save_planner_state` 函数。函数检查当前登录账号并原子检查版本；客户端无直接写表权限。
已存在的记录不会因为重复执行脚本而删除。

## 2. 配置登录

Authentication → URL Configuration：

- Site URL 设为正式 HTTPS 网址。
- Redirect URLs 添加 `https://你的正式域名/account`。
- 本地测试时可加 `http://localhost:4173/account`，测试完可移除。
- 原生 App 使用实际构建的 deep link `scheme://account`，需将该地址加入允许列表。

保留邮箱确认。注册后验证邮箱，再用邮箱和密码登录；密码至少 8 位。
账号页支持忘记密码和通过邮件返回后设置新密码。

Supabase 默认邮件服务的收件人和发送频率有限：
个人测试优先使用项目成员的邮箱；更多用户应配置自己的 SMTP，
或另外接入 OAuth。不要为了绕过邮件限制关闭所有账号的验证。
参考：https://supabase.com/docs/guides/auth/auth-smtp

## 3. 配置 Vercel

在已链接的 `mealweek` 项目 Settings → Environment Variables 添加：

```env
EXPO_PUBLIC_SUPABASE_URL=https://你的项目标识.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_你的公开密钥
```

这两个值会进入前端包，属于公开配置。数据库安全由登录验证和 RLS 保证。
至少配置 Production；Preview 使用独立测试项目或确认的同一项目。
不要给 `EXPO_PUBLIC_` 变量填入私密密钥。

构建仍使用仓库 `vercel.json`：
Node 24、`corepack pnpm install --frozen-lockfile`、
`corepack pnpm build:web`、输出目录 `web-build`。
环境变量在构建时写入，所以修改后必须重新部署。

本地验证：将 `.env.example` 复制为 `.env.local` 并填写公开配置，然后使用：

```sh
corepack pnpm check
corepack pnpm test
corepack pnpm build:web
```

未配置时界面明确显示“仅保存在本机”，不会显示“已同步到云端”。

## 4. 迁移现有排餐

旧记录仍留在原来的 AsyncStorage 键 `@yizhouhaoshi/planner-v1`。
请在**保存旧记录的同一浏览器和网址**中登录，然后打开“我的账号”，
点击“导入登录前的本机记录”。导入只补充账号中缺少的餐次及采购勾选，不覆盖已有内容。
原始本地记录保留。账号缓存按 Supabase 项目和用户 ID 分开。

从 localhost、旧域名换到 Vercel 正式域名时，浏览器无法直接读取旧网址的存储。
可先在旧网址开通同一个 Supabase 项目并导入；或者保存 JSON 备份后迁移。
本版可导出 JSON 备份，尚未提供任意 JSON 文件的导入界面。

## 5. 同步行为与验证

- 本地修改立即进入账号缓存和待上传队列，约 600ms 后尝试上传。
- 页面打开、恢复网络、回到前台时同步；前台每 30 秒检查其他设备的更新。
- 云端是跨设备的保存位置；本机保留缓存和待上传修改，不能保证刚操作完就已上传。
- 多设备修改不同字段会合并。同一条记录冲突时，到账号页选择保留本机修改或使用云端记录。
- 保留本机修改仅应用自己修改过的字段；使用云端会放弃当前待上传修改，并在本机留一份冲突备份。
- 退出账号不会把该账号的记录显示到另一个账号；未上传修改留在原设备，下次登录同账号后重试。
- 无网络时使用缓存；不包含离线网页资源缓存，首次离线打开网址不保证可用。
- 同一浏览器同时打开多个编辑标签页尚未做共享队列协调，建议单标签编辑；跨设备同步已实现。

正式验收应使用真实 Supabase 项目：

1. 设备 A 登录，添加排餐并勾选购物项；等待“已同步到云端”。
2. 设备 B 登录同账号，确认排餐和勾选恢复。
3. A 断网修改，刷新确认本地仍在；联网后重试并在 B 查看。
4. 两台设备修改不同餐次，确认合并；修改同一餐，确认冲突提示和两种解决方式。
5. 另一个账号登录，确认无法看到前一账号记录。
6. 导出排餐备份，核对 JSON 内容不含登录令牌或任何密钥。

Supabase Free 不提供自动数据库备份，低活跃项目可能暂停；请定期使用账号页的备份导出。
免费额度及限制以官方为准：https://supabase.com/pricing
