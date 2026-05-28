# Tasks — Bulk Tool Import

## 共享基础设施

- [x] 创建 `scripts/lib/category-matcher.ts` — 关键词 → category slug 映射
- [x] 创建 `scripts/lib/dedup.ts` — URL 规范化 + DB 去重检查
- [x] 创建 `scripts/lib/favicon.ts` — Google Favicon URL 生成工具

## Product Hunt Import

- [x] 创建 `scripts/import-producthunt.ts` — 主脚本
- [x] 实现 GraphQL 查询 + 分页游标
- [x] 实现 topic → category 映射
- [x] 实现去重 + 入库逻辑
- [x] 添加 rate limit 控制 + 错误重试
- [ ] 端到端测试运行（需要 PRODUCTHUNT_TOKEN）

## GitHub Awesome Lists Import

- [x] 创建 `scripts/import-awesome-lists.ts` — 主脚本
- [x] 实现 GitHub raw README 获取（免 auth）
- [x] 实现 markdown 链接解析器
- [x] 实现 section heading → category 推断
- [x] 实现去重 + 入库逻辑
- [x] 端到端测试运行 ✅ 4484 tools imported, 0 errors

## 验证

- [x] 运行 awesome-lists 脚本确认无报错
- [x] 验证数据库新增记录正确性
- [x] 确认去重逻辑有效（重复运行 imported=0, skipped=4909）
