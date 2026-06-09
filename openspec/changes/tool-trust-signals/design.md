# Technical Design — Tool Trust Signals

## Context

Toools 是一个 Next.js + Prisma + PostgreSQL 的工具目录站。`Tool` 模型已包含 `viewCount`、`clickCount`、`featured`、`isOpenSource`、`platforms`、`github`、`embedMode` 等字段，但 UI 几乎未展示这些信号。批量导入（Product Hunt、Awesome Lists）会进一步放大工具数量，且 PH 导入已有 `votesCount` 映射到 `featured` 的逻辑，投票数本身未持久化。

当前卡片（`ToolCard`）仅展示：名称、tagline、分类、pricing badge、最多 2 个 tag。详情页有 platforms 和 GitHub 链接，但缺少结构化的决策辅助信息。

## Goals / Non-Goals

**Goals:**

- 让用户在列表页 2 秒内感知工具的可信度与基本适配性
- 在详情页提供「At a Glance」面板，集中回答：多少钱、跑在哪、是否开源、有多热、能否站内试用、信息是否新鲜
- 扩展 schema 存储外部指标（PH votes、GitHub stars），由导入脚本回填
- 实现 click 追踪，使 `clickCount` 成为可用的 secondary 信号
- 列表页支持按热度排序、开源/Featured 筛选

**Non-Goals:**

- 用户评分/评论系统（UGC）
- 实时调用 GitHub/PH API 展示最新 stars/votes（仅导入时快照）
- AI 生成的「是否适合你」个性化推荐
- 复杂的 trust score 算法或单一综合评分
- 管理后台批量编辑信号字段

## Decisions

### 1. Schema 扩展

在 `Tool` 上新增可选字段：

```prisma
phVotes      Int?          // Product Hunt 投票数快照
githubStars  Int?          // GitHub star 数快照（导入时获取）
source       ToolSource?   // 数据来源
sourceUrl    String?       // 原始 listing URL（PH post / awesome list item）

enum ToolSource {
  MANUAL
  PRODUCT_HUNT
  AWESOME_LIST
}
```

**Rationale**: 外部指标作为快照存储，避免运行时 API 依赖与 rate limit。`source` + `sourceUrl` 提供溯源透明度，增强信任。

**Alternative considered**: JSON `metadata` 字段 — 拒绝，因查询/排序/filter 需要 typed columns。

### 2. 信号分层展示


| 层级        | 位置                 | 信号                                                                                                |
| --------- | ------------------ | ------------------------------------------------------------------------------------------------- |
| Micro     | ToolCard footer    | pricing（已有）、Featured ★、Open Source、热度 tier                                                        |
| Macro     | 详情页 At a Glance    | pricing、platforms、isOpenSource + githubStars、viewCount/clickCount、embedMode、updatedAt、source link |
| Discovery | FilterPanel + sort | sort=popular|newest、filter openSource、filter featured、filter platform                             |


**热度 tier**（卡片用，避免精确数字噪音）:

```typescript
function popularityTier(views: number): "hot" | "warm" | null {
  if (views >= 500) return "hot";
  if (views >= 50) return "warm";
  return null;
}
```

详情页展示精确 `viewCount` / `clickCount`（带 tabular-nums 格式化）。

### 3. Click 追踪

新增 Route Handler `GET /api/tools/[slug]/out`：

1. 查找 approved tool
2. `clickCount` increment（fire-and-forget）
3. `302` redirect 到 `tool.url`

详情页与卡片的外链统一走此 redirect。"Visit Website" 按钮改用 `/api/tools/{slug}/out`。

**Alternative considered**: Client-side `fetch` + `window.open` — 拒绝，因 ad blocker 和 popup 策略不稳定；server redirect 更可靠。

### 4. GitHub Stars 获取

仅在 `import-awesome-lists.ts` 和 seed 流程中，当 `github` URL 存在时，调用 GitHub REST API `GET /repos/{owner}/{repo}` 获取 `stargazers_count`。单次导入 batch 内 throttle（100ms/request）。手动录入工具不强制获取。

PH 导入写入 `phVotes = post.votesCount`，`source = PRODUCT_HUNT`。

### 5. 组件结构

```
src/components/
  tool-signals.tsx       # ToolSignalBadges (micro), ToolAtAGlance (macro)
  tool-card.tsx          # 集成 ToolSignalBadges
  filter-panel.tsx       # 新增 sort / openSource / platform chips
```

共享类型 `ToolSignals` 从 Prisma select 派生，供 `ToolItem` 扩展。

### 6. 列表排序

`/tools` 新增 query param `sort`:


| value         | orderBy                                     |
| ------------- | ------------------------------------------- |
| `popular`（默认） | `[{ featured: desc }, { viewCount: desc }]` |
| `newest`      | `{ createdAt: desc }`                       |
| `clicks`      | `{ clickCount: desc }`                      |


FilterPanel 新增 `openSource=1`（`isOpenSource: true`）、`featured=1`、`platform=web|mac|...`（`platforms: { has: value }`）。

## Risks / Trade-offs

- **[Stale metrics]** GitHub stars / PH votes 为导入快照 → 详情页标注 "as of import" 或仅展示数字不加实时承诺；长期可通过 cron 刷新（Non-Goal 本期不做）
- **[Sparse data]** 大量工具缺少外部指标 → UI 仅在有值时展示对应行/ badge，不显示空占位
- **[Popularity cold start]** 新工具 viewCount=0 → tier 为 null，不展示热度 badge；Featured 仍可见
- **[Platform filter fragmentation]** platforms 为自由文本数组 → 导入脚本 normalize 为 `Web`、`Mac`、`Windows`、`Linux`、`iOS`、`Android`；seed 数据逐步对齐

## Migration Plan

1. 添加 Prisma migration（新字段均可 null，零 downtime）
2. 部署 schema + 更新 import scripts
3. 运行一次性 backfill script：`UPDATE` 已有 PH-sourced tools 的 phVotes（若可从 featured 推断则跳过）
4. 部署 UI 组件与 redirect route
5. Rollback：新字段 nullable，UI 可独立回滚；redirect route 移除后恢复直链

## Open Questions

- 是否在卡片上展示 platform 摘要（如 "Web · Mac"）还是仅详情页？→ **MVP 卡片不展示 platform**，避免 footer 拥挤
- clickCount 是否在卡片展示？→ **否**，仅详情页 At a Glance

