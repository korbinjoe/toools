# Design: 围绕场景化工具链（Stacks）重构 Toools

## 概述

本文档围绕「场景化工具链推荐（Stacks）」这一核心差异点，重新设计 Toools 的信息架构、数据模型、页面体系和用户旅程。Stacks 不是在现有目录站上加一个功能模块，而是重新定义 Toools 的价值叙事 —— 从「工具目录」变为「工具链策展平台」。

**设计原则**：
1. **场景优先，工具其次** — 用户先选择自己要做的事，再看需要哪些工具
2. **编辑策展起步，UGC 后续** — 质量优先于数量，初期由编辑策展 Stacks
3. **两个入口，一个闭环** — Stacks（场景维度）和 Browse（工具维度）是两个入口，最终都汇聚到工具详情页完成决策
4. **不做内嵌试用** — 大量工具不支持 iframe，外链跳转是更好的体验

---

## 〇、视觉设计稿

> 完整交互原型见 [`mockup.html`](./mockup.html)，可在浏览器中直接打开切换 4 个页面。

### 视觉规范总结

**设计语言**：Warm Neutral — 浅暖色画布 + 白色卡片 + amber 品牌色

| Token | 值 | 用途 |
|-------|-----|------|
| `--canvas` | `#FAFAF9` | 页面背景 |
| `--surface` | `#FFFFFF` | 卡片/面板 |
| `--ink` | `#1C1917` | 正文 |
| `--amber` | `#D97706` | 品牌色、CTA、高亮 |
| `--amber-wash` | `#FEF3C7` | 轻量标签背景 |
| `--border` | `#E7E5E4` | 分割线、卡片边框 |
| `--radius-xl` | `1rem` | 卡片圆角 |
| `--shadow-md` | `0 4px 12px rgba(28,25,23,0.06)` | hover 阴影 |
| `--font` | `system-ui, -apple-system, ...` | 正文 |
| `--mono` | `ui-monospace, 'Cascadia Code', ...` | 数据信号 |

**布局策略**：
- 最大宽度 `1200px`，左右 `clamp(16px, 4vw, 32px)` padding
- 移动端 768px 断点单列重排
- Header sticky + 毛玻璃效果 (`backdrop-filter: blur(16px)`)

### 页面视觉设计

#### Page 1: 首页

- **Hero**：左文右图非对称布局（`1fr 380px` grid）
  - 左侧：大标题 "Find the right tools for your entire workflow." + 副标题 + 双 CTA + 搜索框
  - 右侧：Stack 概念预览卡片（Indie Developer Toolkit 的 6 个阶段缩影），带 amber 标签角标
  - 移动端：右侧预览隐藏
- **Popular Stacks**：2 列 Grid
  - 卡片结构：顶部 header（渐变色 icon + 名称 + 描述 + 受众 badge）→ 中间 flow（竖向时间线 + 每 stage 的工具 avatar 小图标）→ 底部 stats（stage 数 + 工具数 + "Explore stack →"）
  - 时间线用 `::before` 伪元素竖线 + 圆点实现
  - hover: 卡片上浮 + 圆点变 amber + link 变深
- **Editor's Picks**：1 大 + 4 小不对称 grid（`1fr 1fr`，左侧大卡跨 2 行）
  - 大卡：56px icon + 大号名称 + 长 tagline + 标签/信号
  - 小卡：40px icon + 名称 + tagline（单行溢出省略）+ meta
- **Recently Added**：紧凑列表（无 grid），圆角容器内 border-bottom 分隔

#### Page 2: Stack 详情页

- **面包屑**：Stacks / Indie Developer Toolkit
- **Hero**：标题 + 描述 + 标签 pills
- **横向进度条**：所有 stage 名称并排（flex = 1 等宽），用于快速浏览全貌
- **Stage 块**：竖向时间线布局
  - 左侧 amber 圆点 + 渐变竖线（`::before` + `::after`）
  - Stage 编号（mono 小字 amber）+ 标题 + 描述
  - 工具推荐 3 列 grid（每张小卡：icon + 名称 + tagline + 定价/信号 badge）
  - 底部 editor-note：左侧 amber 竖线 + 浅灰背景引用块

#### Page 3: 工具详情页（双栏）

- **布局**：`1fr 320px` grid（左主右侧）
- **左侧主内容**：
  - Hero：52px icon + 标题 + tagline + 标签
  - About：段落文本（`max-width: 60ch`）
  - Use Cases：amber 圆点列表
  - Pros & Cons：双列 grid，绿色 `+` / 红色 `-` 前缀
  - Part of these Stacks：圆角行列表 + hover 背景变色
  - Alternatives：4 列 grid 小卡（icon + 名称 + tagline + 信号）
- **右侧 sidebar**（sticky `top: 80px`）：
  - 主 CTA 按钮 "Visit Website"（amber 全宽）
  - At a Glance 卡片：key-value 行列表，数值用 mono 字体，amber 高亮关键数字

#### Page 4: Stacks 列表页

- **Hero**：简洁标题 + 副标题
- **Grid**：2 列，每张卡片包含名称 + 描述 + meta（stage 数/工具数）+ CTA link
- 最后一张占位卡：虚线边框 + 半透明，引导 "Suggest a stack"

### 组件规范

| 组件 | 规格 |
|------|------|
| `.btn-primary` | amber 背景 + 白文字 + hover 加深 + press translateY(1px) |
| `.btn-outline` | 透明背景 + border + hover 浅灰底 |
| `.btn-ghost` | 无边框 amber 文字 + hover 深色 |
| `.badge` | pill 形状（9999px radius）+ 浅灰底 |
| `.badge-wash` | amber-wash 背景 + 深 amber 文字 |
| `.card` | 白底 + 1px border + radius-xl + hover 上浮 + shadow 加深 |
| `.sig` | mono 字体 + 12px icon + warm-gray 文字，用于 stars/votes 数据 |
| `.icon` | 40px 圆角方形（10px radius），纯色/渐变背景 + 白色字母 |

---

## 一、站点信息架构

### 1.1 页面结构

```
/                          首页（Stacks 入口 + Featured 策展 + 最新工具）
├── /stacks                Stack 列表页（按角色/场景浏览工具链）
│   └── /stacks/[slug]     Stack 详情页（完整工具链 + 每阶段推荐）
├── /tools                 工具浏览页（搜索 + 多维筛选，现有功能增强）
│   └── /tools/[slug]      工具详情页（加厚版：信号 + 使用场景 + 替代品）
├── /categories            分类总览页（保持不变）
│   └── /categories/[slug] 分类详情页（保持不变）
└── /submit                提交工具页（保持 GitHub Issue 方式，优化引导）
```

### 1.2 导航体系

**主导航栏**（Header navLinks）：

```
Stacks  |  Browse  |  Categories  |  Submit
```

变更说明：
- 新增 **Stacks** 作为第一项，突出场景化推荐的核心地位
- 原 "Browse" 保持不变，对应 `/tools`
- Categories 和 Submit 保持不变

**页面间关系**（用户在两个维度间自由流转）：

```
                ┌─────────────────────────┐
                │         首页            │
                │  Stacks 入口 + Featured │
                └────┬──────────┬─────────┘
                     │          │
              ┌──────▼──┐  ┌───▼──────┐
              │ /stacks │  │  /tools  │
              │ 场景维度 │  │ 工具维度 │
              └────┬────┘  └────┬─────┘
                   │            │
           ┌───────▼───────┐   │
           │/stacks/[slug] │   │
           │ Stage → 推荐  │   │
           └───┬───────────┘   │
               │               │
               │  点击推荐工具  │  点击工具卡片
               │               │
               └───────┬───────┘
                       │
               ┌───────▼───────┐
               │ /tools/[slug] │
               │  工具详情页   │
               │  (决策中心)   │
               └───────────────┘
```

**交叉链接**：
- Stack 详情页的每个推荐工具 → 链接到工具详情页
- 工具详情页 → 显示「该工具出现在哪些 Stacks 中」
- 工具详情页的 Alternatives 区域 → 链接到同分类其他工具
- 分类页 → 顶部提示「Looking for a complete workflow? Try our Stacks」

### 1.3 首页重新设计

首页从上到下的内容区块：

```
┌──────────────────────────────────────────────┐
│  Hero                                        │
│  标题: Find the right tools for your          │
│        entire workflow.                       │
│  副标题: Curated tool stacks for indie devs,  │
│          creators, and startups.              │
│  CTA: [Browse Stacks] [Search Tools]         │
│  搜索框: Search by name or use case...       │
└──────────────────────────────────────────────┘
┌──────────────────────────────────────────────┐
│  Stacks 入口区（新增）                         │
│  标题: "Popular Stacks"                       │
│  展示 3 个 Stack 卡片（横向排列）               │
│  每张卡片: 名称 + 描述 + stage 数 + 工具数     │
│  [View all stacks →]                         │
└──────────────────────────────────────────────┘
┌──────────────────────────────────────────────┐
│  Featured（修复后）                            │
│  标题: "Editor's Picks"                       │
│  展示 6 个 featured=true 的工具，按信号权重排序  │
│  不再自动轮换，用户手动刷新                      │
└──────────────────────────────────────────────┘
┌──────────────────────────────────────────────┐
│  Recently Added（保持不变）                     │
│  最新添加的 6 个工具                            │
└──────────────────────────────────────────────┘
┌──────────────────────────────────────────────┐
│  Explore Categories（保持不变，从 Hero 移到此处）│
│  分类导航 pill 列表                             │
└──────────────────────────────────────────────┘
```

**Hero 变更要点**：
- 文案从 "The tools you need, ready to use." → "Find the right tools for your entire workflow."
- 双 CTA：主按钮「Browse Stacks」+ 次按钮「Search Tools」
- 搜索框保留在 Hero 区域
- 分类导航从 Hero 右侧移到页面底部独立区块（降低视觉权重）

---

## 二、Stacks 功能设计

### 2.1 Stack 是什么

**定义**：一个 Stack 是面向特定用户角色或场景的完整工具链推荐。它将一个场景拆解为若干阶段（Stages），每个阶段推荐 2-3 个候选工具，用户可以根据自己的需求和偏好，从每个阶段选择最合适的那个。

**类比**：Stack 之于工具，就像食谱之于食材。食谱告诉你做一道菜需要哪些材料、按什么顺序操作；Stack 告诉你完成一件事需要哪些工具、按什么流程使用。

**示例**：

```
Stack: "Indie Developer Toolkit"
描述: Everything you need to ship a SaaS product as a solo developer.

Stage 1: Idea & Research
  → Perplexity (AI search) | Notion (notes) | Whimsical (wireframes)

Stage 2: Design
  → Figma (UI design) | Canva (quick graphics) | Excalidraw (diagrams)

Stage 3: Development
  → Cursor (AI coding) | VS Code (editor) | GitHub (version control)

Stage 4: Deploy & Host
  → Vercel (frontend) | Railway (backend) | Supabase (database)

Stage 5: Analytics & Feedback
  → PostHog (product analytics) | Sentry (error tracking) | Canny (feedback)

Stage 6: Launch & Grow
  → Product Hunt (launch) | Mailchimp (email) | Buffer (social)
```

### 2.2 Stack 列表页 (`/stacks`)

**页面布局**：

```
┌───────────────────────────────────────────────────┐
│  页面标题: Tool Stacks                             │
│  副标题: Complete tool chains curated for          │
│          specific roles and workflows.              │
└───────────────────────────────────────────────────┘
┌───────────────────────────────────────────────────┐
│  Stack 卡片网格 (2 列 desktop, 1 列 mobile)       │
│                                                    │
│  ┌─────────────────┐  ┌─────────────────┐         │
│  │ 🚀 Indie Dev    │  │ ✏️ Content      │         │
│  │ Toolkit         │  │ Creator Suite   │         │
│  │                 │  │                 │         │
│  │ Ship a SaaS as  │  │ Create, publish │         │
│  │ a solo dev      │  │ and grow your   │         │
│  │                 │  │ content         │         │
│  │ 6 stages        │  │ 5 stages        │         │
│  │ 18 tools        │  │ 15 tools        │         │
│  │ [Explore →]     │  │ [Explore →]     │         │
│  └─────────────────┘  └─────────────────┘         │
│                                                    │
│  ┌─────────────────┐  ┌─────────────────┐         │
│  │ 🏢 Startup      │  │ ...              │         │
│  │ Foundation      │  │                  │         │
│  │ ...             │  │                  │         │
│  └─────────────────┘  └──────────────────┘         │
└───────────────────────────────────────────────────┘
```

**Stack 卡片信息**：
- Stack 图标（emoji，存在数据模型中）
- 名称
- 一句话描述
- Stage 数量
- 包含的工具总数
- 点击进入详情

**排序**：按 `sortOrder` 字段排序（编辑手动排列）。

### 2.3 Stack 详情页 (`/stacks/[slug]`)

**页面布局**：

```
┌──────────────────────────────────────────────────┐
│  面包屑: Stacks > Indie Developer Toolkit         │
│                                                   │
│  标题: 🚀 Indie Developer Toolkit                │
│  描述: Everything you need to ship a SaaS product │
│        as a solo developer.                        │
│  标签: #indie-hacker #saas #solo-dev              │
└──────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────┐
│  Stage 1: Idea & Research                         │
│  描述: Validate your idea and research the market │
│                                                   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐         │
│  │Perplexity│ │  Notion  │ │Whimsical │         │
│  │AI search │ │  Notes   │ │Wireframes│         │
│  │⭐ GH 12k │ │⭐ GH 40k │ │Free      │         │
│  │Freemium  │ │Freemium  │ │Freemium  │         │
│  │[View →]  │ │[View →]  │ │[View →]  │         │
│  └──────────┘ └──────────┘ └──────────┘         │
│                                                   │
│  编辑注: 推荐 Perplexity 做快速市场调研，           │
│         Notion 记录想法，Whimsical 画草图。        │
└──────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────┐
│  Stage 2: Design                                  │
│  ...                                              │
└──────────────────────────────────────────────────┘

... 后续 Stages ...
```

**每个 Stage 的内容**：
- Stage 名称 + 描述（这个阶段要做什么）
- 2-3 个推荐工具卡片（复用现有 `ToolCard` 组件的精简版）
- 可选的编辑注释（editorNote）：一句话说明为什么推荐这几个工具、它们的差异

**交互细节**：
- Stage 之间用连接线（竖向）或分隔区域表示流程顺序
- 每个推荐工具的 `[View →]` 链接到 `/tools/[slug]` 详情页
- 工具卡片展示：名称、tagline、定价 badge、核心信任信号（GitHub stars 或 PH votes，取最突出的一个）
- 移动端 Stage 内工具卡片从横向排列变为纵向堆叠

### 2.4 每阶段推荐逻辑

**原则**：每个 Stage 推荐 2-3 个工具，不做单一推荐，给用户选择权。

**推荐覆盖策略**（编辑在策展时考虑）：
- 至少一个免费或开源选项（降低入门门槛）
- 至少一个市场领导者（高信任信号）
- 差异化覆盖（如：一个全能型 vs 一个轻量型 vs 一个开源替代）

**排序**：在 Stage 内，工具按 `sortOrder` 排序（编辑手动排列，第一个是默认推荐）。

### 2.5 策展方式

**初期（编辑策展）**：
- Stacks 由项目维护者在 seed 脚本或管理脚本中定义
- 新增 `prisma/seed-stacks.ts` 脚本，包含初始 Stack 数据
- 工具推荐基于编辑的专业判断 + 信任信号数据

**数据维护**：
- Stack 的 CRUD 通过直接修改 seed 脚本 + `npx prisma db seed` 完成
- 后期可增加 Prisma Studio 作为简易管理界面
- 不建设独立的管理后台（MVP 阶段）

**后期（社区策展，非 MVP 范围）**：
- 允许用户通过 GitHub Issue 提交 Stack 建议
- 允许用户对 Stack 中的工具推荐进行投票
- 社区贡献者可以 PR 方式贡献新的 Stack 定义

---

## 三、现有功能重构

### 3.1 工具详情页加厚

**当前**：`Tool` model 只有 `tagline` + `description` 两个文本字段。

**加厚方案**：在 `Tool` model 新增以下字段：

| 字段 | 类型 | 说明 |
|------|------|------|
| `useCases` | `String[]` | 使用场景列表，如 ["UI design for web apps", "Design system management"] |
| `pros` | `String[]` | 优点列表 |
| `cons` | `String[]` | 缺点列表 |

**替代品（Alternatives）**：不在 Tool model 中新增字段，而是通过同分类 + 同标签的关系自动推导。在工具详情页底部展示 "Alternatives" 区域（取代或增强当前的 "More in {category}" 区域）：

```
┌──────────────────────────────────────────────────┐
│  Alternatives to {tool.name}                      │
│                                                   │
│  同分类工具，排除自身，按信号权重排序，取 top 4     │
│  复用 ToolCard 组件                                │
└──────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────┐
│  Part of these Stacks                             │
│                                                   │
│  展示包含该工具的所有 Stack，链接到 Stack 详情页    │
│  如："🚀 Indie Developer Toolkit → Stage: Design" │
└──────────────────────────────────────────────────┘
```

**详情页新布局**：

```
面包屑
Header (名称 + tagline + 标签 + 按钮)
At a Glance 信号面板
描述 (description)
使用场景 (useCases) — 新增
优缺点 (pros / cons) — 新增
截图 / 外链区域
Part of these Stacks — 新增
Alternatives — 增强
```

### 3.2 搜索增强

**当前**：搜索只匹配 `name` 和 `tagline`（`contains`, `insensitive`）。

**增强方案**：扩展 `buildWhere` 函数的 `OR` 条件：

```typescript
if (params.q) {
  where.OR = [
    { name: { contains: params.q, mode: "insensitive" } },
    { tagline: { contains: params.q, mode: "insensitive" } },
    { description: { contains: params.q, mode: "insensitive" } },
    { tags: { some: { tag: { name: { contains: params.q, mode: "insensitive" } } } } },
  ];
}
```

**影响范围**：仅 `src/app/tools/page.tsx` 的 `buildWhere` 函数。

### 3.3 Featured 修复

**当前**：`getFeaturedTools()` 用 `ORDER BY RANDOM() LIMIT 6`，客户端每 10 秒自动刷新。

**修复方案**：

首页 `getFeaturedTools()` 改为：
```typescript
async function getFeaturedTools() {
  return prisma.tool.findMany({
    where: { status: "APPROVED", featured: true },
    include: {
      category: { select: { name: true, slug: true } },
      tags: { include: { tag: { select: { name: true } } } },
    },
    orderBy: [
      { githubStars: { sort: "desc", nulls: "last" } },
      { phVotes: { sort: "desc", nulls: "last" } },
      { viewCount: "desc" },
    ],
    take: 6,
  });
}
```

`FeaturedSection` 组件改动：
- 移除 `setInterval` 自动刷新
- 保留手动刷新按钮（点击触发 `/api/featured` 获取新一批）
- `/api/featured` 路由也改为按 `featured: true` + 信号权重排序（随机取 6 个 featured 工具，但不是全库随机）
- 标题从 "Featured" 改为 "Editor's Picks"

### 3.4 信任信号优化

**viewCount = 0 的处理**：
- 卡片和详情页：当 `viewCount === 0` 时，不展示 views 相关的 MetricSignal
- 已在 `ToolCard` 中处理（`viewCount ? ... : null`），保持不变
- `ToolAtAGlance` 中也已有 `viewCount > 0` 判断，保持不变

**GitHub stars 和 PH votes 的展示优先级**：
- 卡片上的 MetricSignal 最多显示 2 个（而非 4 个），优先展示外部信号（GitHub stars > PH votes > views > clicks）
- 理由：外部信号的可信度高于站内信号（站内 viewCount 在冷启动期数值偏低）

### 3.5 分类体系与 Stacks 的关系

**不变**：分类体系保持不变，继续作为工具维度的组织方式。

**关系**：
- **分类是工具维度**：一个工具属于一个分类（如 Figma → Design）
- **Stack 是场景维度**：一个工具可以出现在多个 Stack 的不同 Stage 中（如 Figma 出现在 "Indie Dev" 的 Design stage，也出现在 "Content Creator" 的 Visual Design stage）
- 两个维度正交，互不干扰

**交叉引导**：
- 分类页顶部增加一行提示："Want a complete workflow? Browse tool stacks →"
- Stack 详情页的每个工具卡片保留分类 badge

---

## 四、数据模型变更

### 4.1 新增 Model: Stack

```prisma
model Stack {
  id          String   @id @default(cuid())
  name        String   @unique
  slug        String   @unique
  tagline     String
  description String
  icon        String?
  sortOrder   Int      @default(0)

  stages      Stage[]

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

### 4.2 新增 Model: Stage

```prisma
model Stage {
  id          String    @id @default(cuid())
  name        String
  description String?
  editorNote  String?
  sortOrder   Int       @default(0)

  stackId     String
  stack       Stack     @relation(fields: [stackId], references: [id], onDelete: Cascade)

  recommendations StageRecommendation[]

  @@index([stackId])
}
```

### 4.3 新增 Model: StageRecommendation

```prisma
model StageRecommendation {
  stageId   String
  toolId    String
  sortOrder Int    @default(0)

  stage     Stage  @relation(fields: [stageId], references: [id], onDelete: Cascade)
  tool      Tool   @relation(fields: [toolId], references: [id], onDelete: Cascade)

  @@id([stageId, toolId])
  @@index([toolId])
}
```

### 4.4 现有 Model 变更: Tool

```prisma
model Tool {
  // ... 现有字段保持不变 ...

  // 新增字段
  useCases    String[]  @default([])
  pros        String[]  @default([])
  cons        String[]  @default([])

  // 新增关系
  stageRecommendations StageRecommendation[]

  // 现有字段和关系保持不变
}
```

### 4.5 关系总览

```
Stack (1) ──── (N) Stage (1) ──── (N) StageRecommendation (N) ──── (1) Tool
                                                                        │
                                                                   Category (1)
                                                                        │
                                                                   ToolTag (N)
                                                                        │
                                                                     Tag (1)
```

**关键约束**：
- 一个 Tool 可以出现在多个 Stage 中（通过 StageRecommendation 多对多）
- 一个 Stage 包含 2-3 个推荐工具（业务约束，不在数据库层面强制）
- Stack 删除时级联删除其所有 Stage 和 StageRecommendation
- Tool 删除时级联删除其在各 Stage 中的推荐记录

---

## 五、用户旅程（重新设计后）

### 场景 A：用户想搭建完整工具链 → Stacks 路径

```
用户想法："我是独立开发者，想知道从零开始做一个 SaaS 产品需要什么工具"

1. 进入首页 → 看到 "Find the right tools for your entire workflow"
2. 看到 "Popular Stacks" → 点击 "Indie Developer Toolkit"
3. 进入 Stack 详情页 → 看到 6 个阶段，每阶段 2-3 个推荐
4. 在 "Design" 阶段看到 Figma、Canva、Excalidraw
5. 对 Figma 感兴趣 → 点击进入工具详情页
6. 在详情页看到 At a Glance 信号面板 + 使用场景 + 优缺点
7. 点击 "Visit Website" 跳转 → 完成
8. 回到 Stack 详情页 → 继续看下一个阶段
```

**旅程特点**：场景驱动 → 阶段导航 → 工具决策 → 外链行动。用户始终知道自己在工具链的哪个位置。

### 场景 B：用户想找某类工具 → 分类浏览路径

```
用户想法："我需要一个设计工具"

1. 进入首页 → 点击搜索框或 Header "Browse"
2. 进入 /tools 页面 → 在 Category 筛选中点击 "Design"
3. 看到设计类工具列表 → 浏览卡片
4. 对 Figma 感兴趣 → 点击进入详情页
5. 在详情页看到 "Part of these Stacks: Indie Developer Toolkit (Design)"
6. 好奇完整工具链 → 点击 Stack 链接 → 进入 Stacks 路径
```

**旅程特点**：工具维度 → 筛选 → 详情 → 可能转入 Stacks 路径。分类浏览是传统路径，通过交叉链接引导用户发现 Stacks。

### 场景 C：用户想找特定工具 → 搜索路径

```
用户想法："Figma 有没有免费替代品"

1. 进入首页 → 在搜索框输入 "figma"
2. 跳转到 /tools?q=figma → 看到 Figma 和相关工具
3. 点击 Figma → 进入详情页
4. 滚动到 "Alternatives" 区域 → 看到同分类其他工具
5. 筛选 pricing=FREE 或 pricing=OPEN_SOURCE 的替代品
6. 找到 Penpot → 点击进入详情页 → "Visit Website"
```

**旅程特点**：搜索 → 详情 → Alternatives。增强后的搜索（匹配 description + tags）确保用户搜 "video editing" 也能找到相关工具。

### 三条路径的交汇点

**工具详情页**是所有路径的终点和交汇点：
- 从 Stacks 来的用户在这里做决策
- 从 Browse 来的用户在这里看信号
- 从搜索来的用户在这里找替代品
- 所有路径的最终行动都是 "Visit Website" 外链跳转

```
Stacks 路径 ──┐
              │
Browse 路径 ──┼──→ /tools/[slug] 工具详情页 ──→ Visit Website (outbound)
              │         │
搜索路径 ────┘         ├── Alternatives (站内循环)
                        └── Part of Stacks (转入 Stacks 路径)
```

---

## 六、起步方案

### 6.1 MVP 范围

| 模块 | 范围 | 优先级 |
|------|------|--------|
| 数据模型 | Stack + Stage + StageRecommendation + Tool 加厚字段 | P0 |
| Stack 列表页 | `/stacks` 基础页面 | P0 |
| Stack 详情页 | `/stacks/[slug]` 完整页面 | P0 |
| 首页改版 | Hero 文案 + Stacks 入口区 + Featured 修复 | P0 |
| 工具详情页加厚 | useCases / pros / cons 展示 + Alternatives 区域 + "Part of Stacks" 区域 | P0 |
| 搜索增强 | 扩展到 description + tags | P0 |
| 导航更新 | Header 增加 Stacks 入口 | P0 |
| 种子数据 | 3 个初始 Stack + 工具加厚数据 | P0 |
| 信任信号优化 | viewCount=0 隐藏 + 卡片信号数量限制 | P1 |
| 分类页交叉引导 | 顶部 Stacks 提示 | P1 |
| SEO 优化 | Stack 页面的 meta + JSON-LD | P1 |

### 6.2 初始 Stacks（3 个场景）

#### Stack 1: Indie Developer Toolkit

```
目标角色: 独立开发者 / 一人创业者
描述: Everything you need to ship a SaaS product as a solo developer.

Stage 1: Idea & Research
  → Perplexity (AI-powered research)
  → Notion (note-taking & docs)
  → Excalidraw (quick diagrams)

Stage 2: Design
  → Figma (UI/UX design)
  → Canva (quick graphics & social)
  → Excalidraw (whiteboarding)

Stage 3: Development
  → Cursor (AI-powered coding)
  → VS Code (code editor)
  → GitHub (version control)

Stage 4: Deploy & Host
  → Vercel (frontend hosting)
  → Railway (backend/database)
  → Supabase (backend-as-a-service)

Stage 5: Analytics & Monitoring
  → PostHog (product analytics)
  → Sentry (error tracking)
  → Plausible (privacy-first analytics)

Stage 6: Launch & Grow
  → Product Hunt (launch platform)
  → Mailchimp (email marketing)
  → Buffer (social media management)
```

#### Stack 2: Content Creator Suite

```
目标角色: 内容创作者 / 博主 / 自媒体
描述: Tools to create, publish, and grow your content across platforms.

Stage 1: Writing & Ideation
  → Notion (writing & organization)
  → ChatGPT (ideation & drafting)
  → Hemingway Editor (writing quality)

Stage 2: Visual Design
  → Canva (graphics & thumbnails)
  → Figma (advanced design)
  → Unsplash (stock photos)

Stage 3: Video & Audio
  → Descript (video/podcast editing)
  → CapCut (quick video editing)
  → Riverside.fm (remote recording)

Stage 4: Publishing & Distribution
  → WordPress (blog)
  → Substack (newsletter)
  → Buffer (social scheduling)

Stage 5: Growth & Analytics
  → Google Analytics (web analytics)
  → Mailchimp (email list)
  → Ahrefs (SEO research)
```

#### Stack 3: Startup Foundation

```
目标角色: 早期创业团队 (2-5 人)
描述: Essential tools to set up and run a lean startup team.

Stage 1: Communication
  → Slack (team messaging)
  → Notion (docs & wiki)
  → Loom (async video)

Stage 2: Project Management
  → Linear (issue tracking)
  → Notion (project docs)
  → GitHub Projects (dev tracking)

Stage 3: Design & Prototyping
  → Figma (design)
  → Framer (landing pages)
  → Canva (marketing assets)

Stage 4: Development Infrastructure
  → GitHub (code hosting)
  → Vercel (deployment)
  → Supabase (backend)

Stage 5: Business Operations
  → Stripe (payments)
  → Crisp (customer support)
  → Google Workspace (email & docs)
```

### 6.3 工具数据回填

MVP 需要为初始 Stacks 涉及的工具补充 `useCases`、`pros`、`cons` 数据。预估涉及约 30-40 个工具（3 个 Stack × ~15 个工具，部分重叠）。

回填方式：
1. 在 seed 脚本中为现有工具定义添加新字段
2. 对于 Stacks 中涉及但 seed 中不存在的工具，新增工具定义
3. 编写 `scripts/seed-stacks.ts` 脚本，独立于主 seed

### 6.4 不在 MVP 范围内

- 用户创建/编辑 Stack（社区策展）
- Stack 投票或评分
- 工具对比表格（side-by-side comparison）
- 个性化推荐（基于用户行为）
- Stack 的 JSON-LD 结构化数据（P1 跟进）
- 用户评价系统

---

## Decisions

| 决策 | 选择 | 理由 |
|------|------|------|
| Stack 与 Tool 的关系 | 通过 Stage → StageRecommendation 多对多 | 一个工具可出现在多个 Stack 的不同阶段 |
| Alternatives 推导方式 | 自动（同分类 + 排除自身） | 避免维护成本，后期可补充手动标记 |
| 首页 Hero 改版幅度 | 文案 + 双 CTA + 分类降权 | 最小变更实现最大价值叙事转变 |
| Featured 展示逻辑 | `featured=true` + 信号权重排序 | 编辑精选 + 数据排序，兼顾策展和客观性 |
| Stack 管理方式 | seed 脚本 + Prisma Studio | MVP 阶段不建后台，靠脚本管理 |
| editorNote 字段定位 | 可选的 Stage 级别注释 | 给编辑在每个阶段解释推荐理由的空间 |
| Tool 加厚字段类型 | `String[]` 数组 | 简单直接，前端渲染为列表即可 |
| 搜索增强范围 | description + tag name | 最小改动最大收益，不引入全文搜索引擎 |
