# 本地开发访问性能分析

分析日期：2026-10-13（Asia/Shanghai）  
目标服务：`http://localhost:3000`，现有 `npm run dev` 进程  
环境：Node.js 24.4.0 / Next.js 16.2.7 / Prisma 7.8.0 / Turbopack

## 结论

**当前主要瓶颈是本机 DNS 解析路径异常，导致 Neon PostgreSQL 连接失败，页面等待 15 秒连接超时。**

系统 DNS 将数据库域名解析为 `59.82.113.122`，该地址的 5432 端口连接超时。Google 公共 DNS 返回的三个地址均能在严格校验证书、保留原域名 SNI 的条件下建立 PostgreSQL 连接并执行 `SELECT 1`。这证明数据库端点和凭据可用，故障集中在系统解析出的地址及其访问路径。具体是哪一层 DNS、网络分流或网关产生了异常，尚未查明。

绕过系统 DNS 后，单独复现首页的 Prisma 读取：新建连接池耗时 **4.247 秒**，复用连接池耗时 **1.417 秒**。因此，修复 DNS 后还有远程数据库往返及多条关联查询造成的次级延迟。

本次只新增分析文档；应用代码、环境变量、系统 DNS 和现有开发进程均未修改。数据库探测仅执行读取。

## 1. 页面实测

使用 curl 获取完整 HTML，记录连接耗时、首字节时间（TTFB）和响应结束时间。首页、提交页各测两次，其余各一次；样本用于定位故障，不代表统计分位数。

| 页面 | HTTP 状态 | TTFB | 响应总耗时 | 实际表现 |
| --- | --- | --- | --- | --- |
| `/`，第一次 | 200 | 15.129 s | 15.138 s | 数据查询失败后返回降级页面 |
| `/`，第二次 | 200 | 15.095 s | 15.099 s | 重复访问仍然等待连接超时 |
| `/tools` | 500 | 15.247 s | 15.249 s | 查询异常未被页面捕获 |
| `/categories` | 500 | 15.179 s | 15.180 s | 查询异常未被页面捕获 |
| `/stacks` | 200 | 15.079 s | 15.081 s | 超时后使用静态预览数据 |
| `/submit`，第一次 | 200 | 0.240 s | 15.211 s | 主体可先输出，页脚查询拖延流结束 |
| `/submit`，第二次 | 200 | 0.030 s | 15.020 s | 首字节很快，页脚仍等待 15 秒 |

首次首页请求的 localhost 建连仅 **0.421 ms**。第二次首页改用 `127.0.0.1` 后仍耗时约 15 秒，排除了 localhost 名称解析或 IPv6 选择作为这次主要原因。

首页虽然返回 200，HTML 中没有 `Editor's Picks` 和 `Recently Added` 区块。这与查询失败后 `.catch(() => [])` 的行为一致；HTTP 200 不代表数据库加载成功。

`/submit` 的响应总耗时不能直接当作白屏时间或 LCP：页脚已包裹 Suspense，主体首字节在 30 ms 内到达，但响应流要等页脚超时才结束。

## 2. 数据库和 DNS 的对照验证

数据库来自 `.env` 中的 `DATABASE_URL`，域名为：

```text
ep-weathered-shape-aky91jmc-pooler.c-3.us-west-2.aws.neon.tech
```

| 探测 | 结果 |
| --- | --- |
| Node `dns.lookup` | 4 ms，返回 `59.82.113.122` |
| Node `dns.resolve4` | 同样返回 `59.82.113.122` |
| 系统解析地址 TCP 5432 | 5.005 s 后达到探测超时，未建连 |
| 与应用相同的 PostgreSQL 域名连接 | 15.003 s 后报 `Connection terminated due to connection timeout` |
| Google DNS over HTTPS | 返回 `44.236.37.42`、`44.240.112.28`、`100.20.233.178` |
| Cloudflare DNS over HTTPS | 请求被重置，未取得结果；未作为证据使用 |

对公共 DNS 返回的三个 IP 分别进行 PostgreSQL 只读验证，显式保留原数据库域名作为 TLS `servername`，启用 `rejectUnauthorized: true`：

| 地址 | 建连耗时，含 TLS/认证 | 建连后 `SELECT 1` 耗时 | 结果 |
| --- | --- | --- | --- |
| `44.236.37.42` | 1.536 s | 178 ms | 成功 |
| `44.240.112.28` | 1.134 s | 632 ms | 成功 |
| `100.20.233.178` | 1.308 s | 219 ms | 成功 |

这组对照隔离了系统 DNS 的影响。IP 仅为分析时的探测值，会随服务变化；正式连接应继续使用域名，通过正确的 DNS 解析和网络路径访问。

补充观察：系统解析路径下，对数据库域名发起 HTTPS 探测报 `SELF_SIGNED_CERT_IN_CHAIN`。这与网络中存在证书替换或拦截相符，但不足以确定具体原因。成功的 PostgreSQL 对照测试没有关闭 TLS 校验。

## 3. 为什么整个页面被拖慢

### 首页顶层等待数据库

[`src/app/page.tsx`](../src/app/page.tsx) 第 60 行在返回页面之前等待三项并行查询。Hero、搜索入口、Popular Stacks 本身可以使用静态数据，但也必须等这三项查询结束才能输出。

连接池在 [`src/lib/db.ts`](../src/lib/db.ts) 第 12 行配置 `connectionTimeoutMillis: 15_000`，与页面反复出现的 15 秒延迟吻合。并行查询已经存在，继续增加 `Promise.all` 无法解决连接失败。

首页、工具列表、分类等页面使用 `force-dynamic`，直接调用 Prisma，没有应用层跨请求缓存；重复访问会再次触发数据库读取。

### 所有页面的页脚也读取数据库

`FooterUpdatedAt` 调用 `getDataUpdatedAt()`，执行已批准工具的 `MAX(updatedAt)` 查询，并调用 `noStore()`。根布局包含此页脚，因此提交说明页也会访问数据库。

页脚已有 Suspense，实测能先输出提交页主体；但数据库异常仍使响应流持续约 15 秒。首页主查询与页脚查询可以并发，不能简单把两处超时相加成 30 秒。

### 失败处理掩盖或放大了问题

- 首页：失败后返回空数组，动态区块消失，缺少错误可见性。
- Stacks：失败后返回静态预览，但降级发生在连接超时之后。
- Tools、Categories：没有对应的页面级降级，直接返回 500。
- 页脚：失败后返回 null，主页面可用，但响应结束时间受影响。

## 4. 正常连接下的首页查询成本

在独立诊断进程中使用公共 DNS 地址连接，保留严格 TLS 校验。通过 `PrismaPg`、`max: 5` 的连接池，复现首页的三个查询和页脚聚合查询；没有请求工具详情页，也没有执行浏览量更新。

| 查询 | 新建连接池 | 复用连接池 | 返回量 |
| --- | --- | --- | --- |
| Featured tools | 4.247 s | 748 ms | 5 个工具 |
| Recent tools | 2.506 s | 1.417 s | 4 个工具 |
| Categories + counts | 3.237 s | 202 ms | 17 个分类 |
| Footer updatedAt | 3.187 s | 182 ms | 1 个聚合结果 |
| 四项并行总耗时 | **4.247 s** | **1.417 s** | 每轮 **10 条 SQL** |

这是查询层对照，不是修复后页面的 TTFB；未包含页面编译、渲染和浏览器执行。数据为各一轮，网络波动会影响结果。

Featured 和 Recent 都包含 category、tags、tag 的关联读取，因此四个 Prisma 调用最终产生十条 SQL。远程跨区域往返会累计延迟。作为往返成本的对照，数据库端 `EXPLAIN (ANALYZE) SELECT 1` 的执行时间仅 **0.018 ms**，而客户端收到 `SELECT 1` 结果耗时 **178–632 ms**。此探测不代表首页实际 SQL 的执行计划；数据库索引是否需要优化仍需另行分析。

## 5. 编译、资源和次级问题

- `.next/dev/trace` 中相关编译记录：首页 1.421 s，Stacks 183 ms，Submit 182 ms，Tools 163 ms，Categories 127 ms。首页的重复请求仍稳定等待 15 秒，主要延迟来自数据库连接阶段。
- 首页引用的 17 个 Next 静态 JS/CSS 资源逐一获取成功，每个耗时 **1–11 ms**，未压缩响应体合计 **3,995,713 字节（约 3.81 MiB）**。这包含开发模式的 React、Next 和 DevTools 代码，不能作为生产包体积。浏览器解析和执行成本未测量。
- 当前失败后的首页 HTML 没有外部图标图片，因此这些资源无法解释本次首页的 15 秒服务端等待。数据恢复后，`ToolAvatar` 的外部图标与 Google favicon 回退仍需要单独测量。
- `getTool(slug)` 在工具详情页的 metadata 与正文中各调用一次，`getStackBySlug(slug)` 同样被两处调用，均未用 React `cache` 对直接 ORM 查询去重。属于代码层发现，本次未测量详情页性能。
- 首页读取完整 Tool 字段和 tags 关联，但当前展示未使用 tags。可以按实际展示字段收窄 `select`，减少读取和关联往返。
- Stack 详情的 related candidates 查询没有数据库级 `take`，随后在内存中分组、排序、截取；数据量扩大时需评估。

## 6. 建议优先级与影响范围

| 优先级 | 建议 | 影响范围与验收 |
| --- | --- | --- |
| P0 | 修复本机 DNS / 网络分流，让 Neon 域名解析到可用端点并通过 TLS 校验 | 本机开发环境；域名连接 `SELECT 1` 成功，Tools / Categories 返回 200 |
| P1 | 日常开发使用独立的本地 PostgreSQL，通过 `.env.local` 配置 | 开发数据环境；先完成本地迁移和种子数据，隔离跨区域网络往返 |
| P1 | 首页保留同步静态主体，将数据库区块移入异步组件并分别包裹 Suspense | 首页及相关组件；数据库慢或不可用时 Hero、搜索和 Stacks 可先显示。该方法符合 [Next.js 数据加载与流式渲染文档](https://nextjs.org/docs/app/getting-started/fetching-data#streaming) |
| P1 | 为开发环境配置可调的较短连接超时，并提供可见错误状态和服务端计时日志 | 数据层与读取页面；缩短故障等待，方便区分编译、建连和 SQL 耗时。较短超时应按实际网络校准 |
| P2 | 首页收窄字段，移除未使用的 tags 关联；详情共享读取用 React `cache` 去重 | 首页和详情数据读取；使用 SQL 计数与计时验证。参考项目自带 Next 文档的 ORM 去重说明 |
| P2 | 根据更新频率缓存分类、推荐内容和页脚更新时间 | 跨请求读取与数据新鲜度；明确失效策略后实施 |

优先修复 DNS 可解决当前超时与 500；本地数据库和流式渲染针对日常开发速度与故障时的首屏体验。以上优化尚未实施。

## 7. 复测方式与限制

使用与本次一致的命令观察首字节和响应结束时间：

```bash
curl --max-time 30 -sS -o /dev/null \
  -w 'status=%{http_code} connect=%{time_connect} ttfb=%{time_starttransfer} total=%{time_total}\n' \
  http://localhost:3000/
```

依次复测 `/`、`/tools`、`/categories`、`/stacks`、`/submit`，区分首次编译请求和后续请求。数据库健康检查应使用域名连接，不能只用已知 IP 成功来判断修复完成。

SiteX 浏览器 Bridge 在本机 3002 端口不可用，本次没有采集浏览器 Performance 数据，未取得 FCP、LCP、INP、CLS 或 JavaScript 长任务；结论基于 HTTP、Next 开发 trace、源码、DNS 和只读数据库对照。没有运行生产构建或 Lighthouse，开发资源体积不能外推生产性能。

分析过程参考项目自带的 Next 16.2.7 文档：`node_modules/next/dist/docs/01-app/01-getting-started/06-fetching-data.md`、`01-app/02-guides/caching-without-cache-components.md`、`01-app/03-api-reference/04-functions/generate-metadata.md` 和 Turbopack 文档。
