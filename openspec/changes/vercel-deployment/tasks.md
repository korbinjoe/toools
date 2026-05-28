# Tasks: Vercel Deployment

## Phase 1: 代码准备

- [ ] 修改 `package.json` build 脚本，加入 `prisma generate && prisma migrate deploy`
- [ ] 添加 `postinstall` 脚本：`prisma generate`
- [ ] 确认 `.gitignore` 包含 `.env*`（防止泄露数据库凭证）
- [ ] 确认 `prisma/migrations/` 已提交到 git

## Phase 2: Vercel 项目配置

- [ ] 将代码推送到 GitHub 仓库
- [ ] 在 Vercel Dashboard 导入 GitHub 仓库
- [ ] 确认 Framework Preset 为 Next.js
- [ ] 确认 Node.js 版本 >= 18

## Phase 3: 数据库创建

- [ ] 在 Vercel Dashboard → Storage 创建 Postgres 数据库
- [ ] 将数据库关联到项目（自动注入环境变量）
- [ ] 确认环境变量 `DATABASE_URL` 已注入（Settings → Environment Variables）

## Phase 4: 首次部署

- [ ] 触发部署（Redeploy 使环境变量生效）
- [ ] 确认 build 日志中 `prisma migrate deploy` 成功执行
- [ ] 确认应用可正常访问

## Phase 5: 数据初始化

- [ ] 从 Vercel Dashboard 复制生产 `DATABASE_URL`
- [ ] 本地执行 `DATABASE_URL="..." npx prisma db seed`
- [ ] 验证生产站点数据显示正常

## Phase 6: 验证

- [ ] 首页加载正常，工具列表显示
- [ ] 分类页导航正常
- [ ] 工具详情页可访问
- [ ] `/submit` 提交表单功能正常（如已实现）
- [ ] Preview 部署（开 PR 验证）可正常生成
