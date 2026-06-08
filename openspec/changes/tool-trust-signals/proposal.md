# Tool Trust Signals — 工具可信度与适配信息透出

## Why

随着批量导入管线将工具规模从 ~120 扩展到 5000+，用户在浏览和选型时面临信息过载：当前卡片仅展示名称、tagline、分类、定价和少量标签，详情页也缺少结构化的「是否靠谱、是否适合我」判断依据。数据库中已有 popularity、开源、平台、embed 等信号，以及导入管线可带来的外部指标（如 Product Hunt 投票），但均未系统化呈现，导致用户难以快速筛选和建立信任。

## What Changes

- 扩展 `Tool` 数据模型，存储可选的外部可信度指标（GitHub stars、Product Hunt votes、数据来源）
- 在工具卡片上增加紧凑的 trust/fit 微标签（开源、Featured、热度、平台摘要）
- 在工具详情页增加「At a Glance」信息面板，结构化展示定价、平台、开源、热度、可试用（embed）、更新时间等
- 扩展列表页筛选与排序：按热度、开源、Featured 排序；增加平台筛选
- 导入脚本回填外部指标字段（PH votes → `phVotes`，GitHub URL → 可选 `githubStars`）
- 点击「Visit Website」时递增 `clickCount`，并在 UI 中作为 secondary 热度信号展示

## Capabilities

### New Capabilities

- `tool-signal-schema`: Tool 模型的外部指标字段定义、回填策略与数据完整性规则
- `tool-signal-display`: 卡片与详情页的可信度/适配信号 UI 组件与展示规则
- `tool-signal-discovery`: 列表页基于信号的排序、筛选与用户-facing 文案

### Modified Capabilities

（无现有 spec，留空）

## Impact

- **Schema**: `prisma/schema.prisma` — 新增 `phVotes`、`githubStars`、`source` 等可选字段
- **UI**: `tool-card.tsx`、`tool-grid.tsx`、`tools/[slug]/page.tsx`、`filter-panel.tsx`
- **API/Actions**: Visit 外链 click 追踪（route handler 或 client 事件）
- **Scripts**: `import-producthunt.ts`、`import-awesome-lists.ts` — 写入外部指标
- **Queries**: 工具列表/详情查询需 select 新字段；排序逻辑扩展
