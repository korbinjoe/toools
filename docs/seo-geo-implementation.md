# SEO and GEO implementation

Implemented on 2026-10-13. Content remains in English, targeting indie developers, AI product builders, and creators.

## Changes and scope

- Shared metadata in `src/lib/seo.ts`: page-specific canonical URLs, Open Graph URLs, Twitter metadata, and a generated PNG sharing image. The root layout retains the site's title template; page titles no longer append the template's brand suffix manually.
- `/tools`: normal pagination remains indexable with its own canonical. Searches, category/pricing/platform filters, featured/open-source filters, and alternative sorts use `noindex, follow`. Tracking and UI parameters are removed from canonical URLs. Malformed page numbers and invalid pricing enum values are handled without forwarding unsafe pagination or enum values to Prisma. Out-of-range pages return 404.
- Pagination uses native links that preserve the active search and filters. Links work without JavaScript and retain keyboard and screen-reader navigation.
- Sitemap uses the shared database client and lists approved tools, nonempty categories, and stack routes backed by database or preview data. It includes About, Editorial Standards, and the automation comparison. It omits `lastmod` because existing row dates were affected by counters, and parent Stack row dates do not capture every change to stages or recommendations. Add modification dates only when a reliable page-content revision record exists.
- View and click counters use parameterized, atomic SQL increments. They no longer trigger Prisma's `@updatedAt`. Next.js `after()` completes the counter write after the response, including on the serverless deployment. Errors are logged. This does not repair historical timestamps or make counters unique-human visitor measurements.
- JSON-LD uses a shared serializer that escapes script-breaking characters. The homepage identifies the website and publisher; category, tool, and stack details include breadcrumbs. Tool details describe the software without inventing ratings or prices. Stack lists identify linked tool pages and include the editorial guide where available. Only approved recommendations are exposed in stack details.
- Three existing Stack URLs now include documentation-based selection guides, comparison tables, handoffs, budgeting checks, questions, sources, and review dates: `/stacks/ai-product-builder`, `/stacks/indie-developer-toolkit`, and `/stacks/content-creator-suite`.
- Twenty tool slugs have documentation-based editorial configuration in `src/lib/tool-editorial.ts`. Guidance appears when the corresponding approved tool exists. Curated alternatives explain the task-specific rationale; automatic same-category suggestions are labeled as more category tools. No production database records are inserted by this change.
- `/about` and `/editorial-policy` explain the project, editorial identity, review basis, popularity signals, and corrections. `/compare/n8n-vs-make-vs-zapier` provides a source-linked comparison without unverified exact prices or benchmark results.
- AI search agents receive blocking metadata in the HTML head; the existing Next.js 16.2.7 limited-bot defaults remain covered. Missing detail records and invalid pagination are checked in metadata as well as page rendering. A shared approved-tool query also guards the detail layout outside its loading boundary: the initial detail response waits for record existence, while layout, metadata, and page reuse the same request-scoped lookup. Next.js can otherwise stream a 200 shell before `notFound()` adds a not-found UI and `noindex`; the tool layout guard ensures missing or unapproved detail records return 404 before that skeleton is sent.
- `OAI-SearchBot` is explicitly included in the existing public-crawl rule, retaining the `/api/` and `/admin` exclusions. Training crawler policy is unchanged.
- The tool-detail website CTA emits `tool_website_click` with `{ tool, source: "tool_detail" }` through the existing Vercel Analytics integration. It does not transmit search text, uploaded content, or credentials. The server-side click counter remains separate.

No database migration or new runtime dependency is required. Existing uncommitted work is preserved. This implementation does not change deployment, DNS, CDN, or account settings.

## Publication and measurement setup

1. Set `NEXT_PUBLIC_BASE_URL=https://toools.top` in the production build environment. Preview hosts should not become the canonical domain.
2. Verify the domain in Google Search Console, preferably with DNS ownership verification. For HTML-tag verification, set `GOOGLE_SITE_VERIFICATION` to the supplied token and redeploy. `BING_SITE_VERIFICATION` supports the corresponding Bing HTML token. Tokens are optional; no placeholder verification is emitted.
3. Submit `https://toools.top/sitemap.xml` and inspect representative homepage, category, tool, Stack, and comparison URLs. Confirm the rendered text, declared canonical, response status, and index eligibility from the search engine's view.
4. Confirm that the hosting firewall/CDN permits real Googlebot and OAI-SearchBot traffic. A user-agent string alone is not an identity check; use the providers' published verification guidance where applicable.
5. Enable the existing Vercel Analytics dashboard. Check that the deployed plan supports custom events and that `tool_website_click` is actually received before using it as a conversion metric. A local SDK call is not proof of dashboard ingestion.
6. Record the first complete 28-day baseline after release. Review indexed canonical pages, non-brand impressions/clicks, CTR by landing page and query, identifiable AI referrers, and outbound tool events. Compare equivalent windows and content cohorts; exclude test traffic where possible.

AI referral traffic and citation visibility are different measurements. Referrers can be absent, and a cited page does not necessarily receive a visit. Do not use an increase in aggregate page views as proof of GEO success.

## Citation observation set

Use the following prompts as a fixed observation set in the chosen AI search products. Record date, product/model or mode, browsing status, locale, exact prompt, response URL or captured evidence, whether Toools was named, and which Toools URL was cited. Run comparable conditions and keep results unfilled until actually observed.

1. What tools should a solo developer use to build and launch a SaaS?
2. What is a minimal tool stack for an indie developer?
3. Which tools connect research, design, development, and deployment?
4. How should I choose a hosting platform for a small SaaS?
5. What should I budget for a solo SaaS tool stack?
6. What tools should I use to prototype an AI product?
7. How do I turn an AI product prototype into a maintainable app?
8. What is a practical AI product development workflow?
9. How should I choose between Replit and a repository-based coding workflow?
10. Which tools help with research and specifications for an AI app?
11. How should I choose between n8n, Make, and Zapier?
12. What costs should I consider when self-hosting workflow automation?
13. How do automation billing units differ between providers?
14. Is n8n open source and where can I check its license?
15. What should I test before choosing an automation platform?
16. What is a practical tool stack for a content creator?
17. How do I connect writing, visuals, video editing, and distribution?
18. Should a creator use Canva or Figma for their visual workflow?
19. What should I check before choosing a transcript-based video editor?
20. How should I budget for a content creation workflow?

## Verification

Run the unit regressions with:

```sh
npx tsx --test src/lib/seo.test.ts src/lib/home-discovery.test.ts
npm run lint
npm run build
```

Validation completed: production build and TypeScript passed; 15 unit regressions passed; lint passed with two existing warnings (`import-awesome-lists.ts` and `tool-avatar.tsx`); 16 rendered-page cases passed, including crawler head metadata and 404 checks. The temporary fixture databases were confirmed removed.

Runtime verification uses an isolated local PostgreSQL fixture and the production build, rather than the production database. It covers rendered canonicals and robots, Open Graph URLs, JSON-LD parsing, normal and filtered pagination, approval status, actual counter writes without timestamp changes, sitemap contents, 404 behavior, PNG output, and document overflow at a 390px viewport. Test fixtures and the temporary database are removed after the run.

The existing local network resolves the Neon host through a failing DNS path; see `local-dev-performance-analysis-2026-10-13.md`. Production crawl access, real database contents, Search Console indexing, and Analytics event ingestion require verification after deployment from working network/account contexts.

## References

- [Google: AI features and your website](https://developers.google.com/search/docs/appearance/ai-features)
- [Google: Pagination and incremental page loading](https://developers.google.com/search/docs/specialty/ecommerce/pagination-and-incremental-page-loading)
- [Google: Build and submit a sitemap](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)
- [OpenAI: Crawler roles and access](https://developers.openai.com/api/docs/bots)
- Provider references are maintained alongside each tool's editorial configuration. Documentation-based advice is not a comparative performance benchmark.

## Production rollout — 2026-10-13

Production rollout is complete. Google ownership and sitemap submission succeeded (5,584 discovered pages); Bing sitemap submission succeeded and is processing. Final public-domain checks were repeated after a subsequent project release. See [release verification](./seo-geo-release-2026-10-13.md) and the production verification/baseline JSON files for exact deployment IDs, measured facts, account plan limits, and the future measurement window.
