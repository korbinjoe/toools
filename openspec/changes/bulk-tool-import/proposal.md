# Bulk Tool Import — 规模化工具数据采集

## Summary

当前站点仅有 ~120 个手动录入的工具，无法形成有效的工具目录规模。本提案实现两条批量导入管线，将数据量从 120 提升到 5000+。

## Motivation

- 工具目录站的核心竞争力是覆盖面和发现效率
- 手动录入无法扩展，需要自动化采集管线
- Product Hunt 和 GitHub Awesome Lists 是最高质量的两个公开数据源

## Goals

1. 实现 Product Hunt API 批量导入脚本，可按分类/时间范围拉取工具
2. 实现 GitHub Awesome Lists 解析器，从 awesome-* 仓库提取工具链接和元信息
3. 两个脚本均支持去重、自动分类、幂等运行

## Non-Goals

- 不做实时同步（本期只做批量/手动触发）
- 不做 AlternativeTo / G2 等需要反爬的站点
- 不做用户提交流程优化（已有基础版）

## Approach

### Product Hunt API

- 使用 Product Hunt GraphQL API（公开，需 API token）
- 按 topic/category 拉取 posts，映射到本站分类体系
- 提取：name, tagline, description, url, thumbnail, topics, votesCount
- 存入数据库时自动匹配最近的 category，标记 status=PENDING 待审核

### GitHub Awesome Lists

- 目标仓库：awesome-selfhosted, awesome-tools, awesome-design-tools, awesome-mac, awesome-creative-coding 等
- 解析 README.md 的 markdown 链接结构（section → category, list item → tool）
- 提取：name, description, url, github repo url
- 自动推断 category 和 tags，标记 isOpenSource=true

### 数据质量保障

- 入库前按 url domain 去重
- Google Favicon API 获取图标（复用已有 ToolAvatar 逻辑）
- 新导入工具默认 status=PENDING，可批量 approve

## Risks

- Product Hunt API 有 rate limit（需控制请求频率）
- Awesome Lists 格式不统一，解析器需处理多种 markdown 结构
- 分类映射可能不精确，需人工复核

## Data Source Analysis

| 来源 | 方式 | 预估增量 | 数据质量 |
|------|------|----------|----------|
| Product Hunt | GraphQL API | 3000-5000 | 高（有描述、图标、投票数） |
| GitHub Awesome Lists | README 解析 | 2000-3000 | 中（描述简短，需补充） |
| 合计 | - | 5000-8000 | - |
