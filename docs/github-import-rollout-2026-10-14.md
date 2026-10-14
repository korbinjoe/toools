# Production import verification — 2026-10-14

[Import guide](github-import.md) · [README](../README.md)

The production Neon branch was verified against the Neon control plane as the Toools project's production, default, primary branch. No credentials or complete candidate inventories are included in this document.

## Migration

Applied `20261014090000_add_import_provenance` atomically over Neon HTTPS and registered its exact source checksum in Prisma's migration history:

```text
25222aaa452a44cffa8431788a9046e1ee61fae2bd49dd6ddf4f07ff03df631b
```

The migration added `ToolIdentity`, `ToolDiscovery`, and the two GitHub source types. It preserved 5,082 existing primary sources as legacy discovery records. Existing migration checksums were checked before execution; no destructive schema changes were made.

## Imported candidates

| Measurement | Before | After |
| --- | ---: | ---: |
| Total tools | 6,586 | 7,086 |
| APPROVED | 5,550 | 5,550 |
| PENDING | 1,036 | 1,536 |

Exactly **500 new tools** were imported, all `PENDING`. The first pass created 276; the second used the remaining new-tool budget of 224 and stopped at that limit. The 500 reported creation IDs match the actual database additions.

Both passes made 364 matches to existing tools and skipped 101 candidates under the configured filters. Nine conflicting candidate attempts were rejected without merging. The first pass also reported 12 source timeouts and one missing repository. These errors remain in the local reports; discovery was bounded rather than exhaustive. No run reported an indeterminate database write.

## Database verification

All 6,586 original records were compared with the saved baseline. Moderation and editorial fields remained unchanged. Existing non-null primary sources were preserved; importers may fill missing primary sources/GitHub URLs and refresh popularity snapshots.

- New candidates have **1,490 identity aliases** and **539 discovery records**.
- Every candidate has its website/repository identities and provenance; aliases belong to the correct tool and observed repository IDs have matching identity aliases.
- No new candidate duplicates another tool's normalized website. Source uniqueness and first/last discovery timestamp ordering were verified.
- **222 tools** now have multiple discovery records, including tools with preserved legacy provenance.
- Replaying 10 imported candidates created **zero tools** and **zero additional source records**; their IDs and `PENDING` status remained unchanged.

Discovery rows across the database after this import (tools may appear in several rows):

| Method | Discovery records | Distinct tools |
| --- | ---: | ---: |
| directory | 100 | 87 |
| keyword | 111 | 111 |
| legacy | 5,082 | 5,082 |
| organization | 63 | 63 |
| topic | 491 | 442 |

## Code and documentation verification

- 26 tests passed, including real isolated PostgreSQL transactions, migration backfill, concurrent identity claims, Neon SQL transactions, ambiguous responses, and exact new-tool limits.
- TypeScript and the production build passed.
- ESLint reported no errors; the existing `tool-avatar.tsx` image warning remains.
- English is the default README, with seven complete translations; command blocks and local links were checked for parity.
- MIT LICENSE and package metadata are included. GitHub retains the configured 17 repository topics.

The production website HTTP check returned 403 from the local network, so public website availability was not confirmed in this verification. Production database identity, migration, import, and replay results were checked directly. Detailed operational reports remain local under ignored `reports/imports/`.
