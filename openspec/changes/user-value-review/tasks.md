# Implementation Tasks

## Phase 1: Data Layer

- [x] Schema 变更 — 新增 Stack / Stage / StageRecommendation model，Tool 增加 useCases / pros / cons 字段
- [x] Prisma client generate
- [x] 创建 seed-stacks.ts 脚本（4 个 Stack 完整数据）
- [ ] 运行 `prisma migrate dev` 创建 migration（需数据库连接）
- [ ] 运行 `npx tsx prisma/seed-stacks.ts` 填充数据

## Phase 2: Core Pages（严格还原 mockup.html）

- [x] 首页改版（Hero 左文右图 + Popular Stacks grid + Editor's Picks 不对称布局 + Recently Added 紧凑列表）
- [x] Stacks 列表页 `/stacks`（2 列 grid + placeholder 卡片）
- [x] Stack 详情页 `/stacks/[slug]`（面包屑 + 横向进度条 + 时间线 Stage 布局 + editor-note）
- [x] 工具详情页 `/tools/[slug]` 双栏重写（左主右 sidebar + About / Use Cases / Pros & Cons / Part of Stacks / Alternatives）

## Phase 3: Infrastructure Changes

- [x] Header 导航新增 Stacks 入口
- [x] 搜索增强 — buildWhere 扩展到 description + tags
- [x] Featured 修复 — 移除 10 秒自动轮换，改标题为 Editor's Picks，按信号权重排序

## Phase 4: Polish（后续）

- [ ] 信任信号优化 — viewCount=0 时不显示
- [ ] 分类页交叉引导 — 顶部 Stacks 提示
- [ ] SEO — Stack 页面 meta + JSON-LD 结构化数据
- [ ] 工具数据回填 — 为 30+ 工具补充 useCases / pros / cons
- [ ] 暗色模式验证
