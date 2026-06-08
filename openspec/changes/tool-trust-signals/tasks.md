## 1. Schema & Migration

- [x] 1.1 Add `ToolSource` enum and fields `phVotes`, `githubStars`, `source`, `sourceUrl` to `prisma/schema.prisma`
- [x] 1.2 Run Prisma migration and regenerate client
- [x] 1.3 Add `normalizePlatform()` utility in `scripts/lib/` for canonical platform values

## 2. Import Pipeline Updates

- [x] 2.1 Update `import-producthunt.ts` to write `phVotes`, `source`, `sourceUrl` on upsert
- [x] 2.2 Update `import-awesome-lists.ts` to set `source = AWESOME_LIST`, normalize platforms, and optionally fetch `githubStars` via GitHub API with throttle
- [x] 2.3 Add shared `fetchGithubStars(url: string)` helper with error handling (null on failure)

## 3. Click Tracking

- [x] 3.1 Create `GET /api/tools/[slug]/out` route handler: lookup approved tool, increment `clickCount`, redirect to `tool.url`
- [x] 3.2 Return 404 for missing or non-approved slugs without side effects

## 4. Signal Components

- [x] 4.1 Create `src/lib/tool-signals.ts` with `popularityTier()`, `formatCount()`, and shared `ToolSignals` type
- [x] 4.2 Create `src/components/tool-signals.tsx` with `ToolSignalBadges` (Featured, Open Source, heat tier)
- [x] 4.3 Create `ToolAtAGlance` panel component for detail page (pricing, platforms, stars, votes, embed, counts, updatedAt, source link)
- [x] 4.4 Extend `ToolItem` / query selects across pages to include new signal fields

## 5. UI Integration

- [x] 5.1 Integrate `ToolSignalBadges` into `ToolCard` footer
- [x] 5.2 Add `ToolAtAGlance` to `tools/[slug]/page.tsx` below header, above description
- [x] 5.3 Change "Visit Website" button to use `/api/tools/{slug}/out`
- [x] 5.4 Update `FeaturedSection` and homepage queries to pass signal fields to `ToolCard`

## 6. Discovery Filters & Sort

- [x] 6.1 Extend `buildWhere()` in `tools/page.tsx` for `openSource`, `featured`, `platform` query params
- [x] 6.2 Add `sort` param handling (`popular` | `newest` | `clicks`) with corresponding `orderBy`
- [x] 6.3 Add Sort, Open Source, Featured, and Platform controls to `FilterPanel`
- [x] 6.4 Reset `page` param when sort/filter changes (existing pattern)

## 7. Verification

- [x] 7.1 Manually verify tool card badges render correctly for featured, open source, and high viewCount tools
- [x] 7.2 Manually verify At a Glance panel on detail page with and without external metrics
- [x] 7.3 Verify outbound redirect increments `clickCount` in database
- [x] 7.4 Verify `/tools?sort=newest&openSource=1&platform=Web` returns expected filtered results
