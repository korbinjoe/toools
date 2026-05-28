# Technical Design — Bulk Tool Import

## Architecture

```
scripts/
  import-producthunt.ts    # PH API → DB
  import-awesome-lists.ts  # GitHub Awesome → DB
  lib/
    category-matcher.ts    # 工具 → 本站分类 映射
    dedup.ts               # URL 去重逻辑
    favicon.ts             # Google Favicon URL 生成
```

两个脚本独立运行，共享分类匹配和去重逻辑。

## Product Hunt Import

### API 接入

- Endpoint: `https://api.producthunt.com/v2/api/graphql`
- Auth: Bearer token（Developer Token，无需 OAuth）
- Rate limit: 每分钟 450 次（宽裕）

### GraphQL Query

```graphql
query GetPosts($cursor: String, $topic: String) {
  posts(first: 20, after: $cursor, topic: $topic, order: VOTES) {
    edges {
      node {
        id
        name
        tagline
        description
        url
        website
        thumbnail { url }
        topics { edges { node { name slug } } }
        votesCount
        createdAt
      }
    }
    pageInfo { hasNextPage endCursor }
  }
}
```

### Topic → Category 映射

| PH Topic | 本站 Category |
|----------|---------------|
| artificial-intelligence | ai-assistants |
| design-tools | design |
| developer-tools | development |
| productivity | productivity |
| marketing | seo-marketing |
| analytics | data-analytics |
| web-hosting | deploy-hosting |
| security | security-privacy |
| media-tools | image-media |
| video | video-audio |
| writing-tools | writing-notes |
| apis | api-integration |

### 导入流程

1. 按 topic 列表循环拉取
2. 每个 topic 拉取前 200 条（按投票排序）
3. 去重检查（domain match）
4. 映射 category + 生成 slug
5. 插入 DB（status=PENDING）
6. 记录导入日志

## GitHub Awesome Lists Import

### 目标仓库

```typescript
const AWESOME_REPOS = [
  "awesome-selfhosted/awesome-selfhosted",
  "jaywcjlove/awesome-mac",
  "sindresorhus/awesome",
  "goabstract/Awesome-Design-Tools",
  "bradtraversy/design-resources-for-developers",
  "viatsko/awesome-vscode",
  "agarrharr/awesome-cli-apps",
  "rothgar/awesome-tuis",
];
```

### 解析策略

1. 通过 GitHub API 获取 README.md raw content
2. 解析 markdown 结构：
   - H2/H3 → category hint
   - List item with link → tool entry
   - 格式：`- [Name](url) - Description`
3. 正则提取：`/^-\s+\[([^\]]+)\]\(([^)]+)\)\s*[-–—]\s*(.+)$/`

### Category 推断

使用 section heading + 关键词匹配：
- heading 含 "editor/IDE/code" → development
- heading 含 "design/UI/color" → design
- heading 含 "security/privacy/encrypt" → security-privacy
- etc.

无法匹配时默认 → productivity

### 去重逻辑

```typescript
function normalizeUrl(url: string): string {
  const u = new URL(url);
  // 去掉 www.、trailing slash、query params
  return u.hostname.replace(/^www\./, "") + u.pathname.replace(/\/$/, "");
}
```

按 normalized URL 做 unique 检查，已存在则 skip。

## Database Impact

- 新增工具默认 `status: PENDING`，不影响前端展示
- 需要新增 `source` 字段记录来源（可选，本期用 tags 标记）
- 批量 approve 通过后续管理脚本完成

## Decisions

1. **不修改 schema** — 导入来源信息暂存于 description 末尾或 tags，避免 migration
2. **脚本放 scripts/ 目录** — 与 prisma/seed.ts 分离，可独立运行
3. **默认 PENDING** — 保护前端数据质量，需人工或批量审核后展示
