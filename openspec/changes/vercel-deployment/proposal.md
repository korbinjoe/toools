# Vercel Deployment

## Summary

将 Toools 应用部署到 Vercel 平台，使用 Vercel Postgres（底层 Neon）作为生产数据库，实现零运维的全栈部署。

## Motivation

项目已具备基础功能（工具列表、分类、详情页），需要上线供用户访问。Vercel 是 Next.js 官方推荐的部署平台，与框架深度集成，支持 Edge Runtime、ISR、Serverless Functions 等特性，且提供内置 Postgres 服务，无需额外管理数据库基础设施。

## Goals

- 应用可通过公网域名访问
- 数据库稳定运行，支持 Prisma ORM 连接
- CI/CD 自动化：push to main 自动部署
- Preview 环境：PR 自动生成预览链接
- Seed 数据可一次性导入生产环境

## Non-Goals

- 自定义域名配置（后续单独处理）
- CDN / 图片优化策略（后续优化）
- 监控告警体系搭建
- 多区域部署

## Approach

1. **数据库**：使用 Vercel Postgres（免费额度 256MB 存储 + 60h/月计算），通过 Vercel Dashboard 创建并自动注入环境变量
2. **应用部署**：GitHub 仓库连接 Vercel，自动 CI/CD
3. **迁移策略**：build 阶段执行 `prisma migrate deploy`，确保 schema 同步
4. **Seed**：首次部署后手动执行一次，后续通过管理后台或 API 管理数据

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Vercel Postgres 免费额度不够 | 服务中断 | 监控用量，超限前迁移到 Neon Pro 或 Supabase |
| Serverless 冷启动 + DB 连接延迟 | 首次请求慢 | 使用 Prisma 连接池，考虑 Edge Runtime |
| Build 时 migrate 失败阻塞部署 | 无法发布 | 本地先测试迁移，保持迁移文件幂等 |
