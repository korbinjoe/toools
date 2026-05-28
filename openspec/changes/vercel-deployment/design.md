# Technical Design: Vercel Deployment

## Architecture

```
┌─────────────────────────────────────────────────┐
│                   Vercel Edge Network            │
├─────────────────────────────────────────────────┤
│                                                  │
│  ┌──────────────┐    ┌───────────────────────┐  │
│  │  Static/ISR  │    │  Serverless Functions  │  │
│  │  (Next.js)   │    │  (API Routes)          │  │
│  └──────────────┘    └───────────┬───────────┘  │
│                                  │               │
└──────────────────────────────────┼───────────────┘
                                   │
                    ┌──────────────▼──────────────┐
                    │   Vercel Postgres (Neon)     │
                    │   PostgreSQL 16              │
                    │   Region: us-east-1          │
                    └─────────────────────────────┘
```

## Database Setup

### Provider: Vercel Postgres

- 底层为 Neon Serverless PostgreSQL
- 支持连接池（通过 PgBouncer 代理）
- 自动注入环境变量：`POSTGRES_URL`, `POSTGRES_PRISMA_URL`, `POSTGRES_URL_NON_POOLING`

### Prisma 配置

当前 `prisma.config.ts` 使用 `DATABASE_URL`，Vercel Postgres 会自动注入该变量，无需修改。

连接方式使用 `@prisma/adapter-pg`（项目已安装），适配 Neon 的 serverless 连接模式。

### 环境变量

| Variable | Source | Purpose |
|----------|--------|---------|
| `DATABASE_URL` | Vercel Postgres 自动注入 | Prisma 连接（带连接池） |
| `POSTGRES_URL_NON_POOLING` | Vercel Postgres 自动注入 | Prisma migrate 使用（直连） |

## Build Pipeline

```
Install Dependencies
       │
       ▼
prisma generate        ← 生成 Prisma Client
       │
       ▼
prisma migrate deploy  ← 应用迁移到生产数据库（使用 NON_POOLING URL）
       │
       ▼
next build             ← 构建 Next.js 应用
```

### package.json 修改

```json
{
  "scripts": {
    "build": "prisma generate && prisma migrate deploy && next build",
    "postinstall": "prisma generate"
  }
}
```

### vercel.json（可选，如需自定义）

```json
{
  "buildCommand": "prisma generate && prisma migrate deploy && next build",
  "framework": "nextjs"
}
```

## Seed Strategy

生产环境 seed 不应在每次 build 时执行，采用以下策略：

1. **首次部署**：本地连接生产 DB 手动执行 `npx prisma db seed`
2. **后续数据**：通过 `/submit` 页面或未来的管理后台添加

```bash
# 手动 seed 生产数据库
DATABASE_URL="postgresql://..." npx prisma db seed
```

## Preview Environments

Vercel 为每个 PR 自动创建 Preview 部署：

- Preview 环境共享同一个数据库（Vercel Postgres 默认行为）
- 如需隔离，可在 Vercel 设置中为 Preview 配置独立的 `DATABASE_URL`（指向 Neon 的 branch）

## Decisions

### D1: 选择 Vercel Postgres 而非独立 Neon/Supabase

**原因**：零配置集成，环境变量自动注入，控制台统一管理。免费额度对工具收集站足够（256MB 存储）。未来数据量增长可平滑迁移到 Neon Pro（同底层）。

### D2: Build 阶段执行 migrate deploy

**原因**：确保每次部署 schema 与代码同步。`prisma migrate deploy` 是幂等的，只会应用未执行的迁移。使用 `POSTGRES_URL_NON_POOLING`（直连）避免连接池干扰 DDL 操作。

### D3: 不使用 Edge Runtime

**原因**：当前阶段优先稳定性。Prisma + Edge 需要额外配置（Data Proxy 或 Accelerate），增加复杂度。Serverless Functions 的冷启动对工具站可接受。
