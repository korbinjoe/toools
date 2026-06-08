## ADDED Requirements

### Requirement: Tool cards display compact trust badges

The system SHALL display compact trust/fit badges on each tool card when applicable data exists, without exceeding one additional row beyond the existing pricing and tag badges.

#### Scenario: Featured tool shows star badge

- **WHEN** a tool has `featured = true`
- **THEN** the tool card SHALL display a "Featured" badge with a star indicator

#### Scenario: Open source tool shows badge

- **WHEN** a tool has `isOpenSource = true` or `pricing = OPEN_SOURCE`
- **THEN** the tool card SHALL display an "Open Source" badge

#### Scenario: Popular tool shows heat tier

- **WHEN** a tool's `viewCount` is at least 500
- **THEN** the tool card SHALL display a "Popular" heat badge
- **WHEN** a tool's `viewCount` is between 50 and 499
- **THEN** the tool card SHALL display a "Trending" heat badge
- **WHEN** a tool's `viewCount` is below 50
- **THEN** the tool card SHALL NOT display a heat badge

#### Scenario: Missing signals are omitted

- **WHEN** a tool lacks data for a given signal (e.g. not featured, viewCount = 0)
- **THEN** the tool card SHALL omit that badge rather than show an empty or "unknown" state

### Requirement: Tool detail page shows At a Glance panel

The system SHALL render an "At a Glance" panel on the tool detail page that summarizes pricing, platforms, open-source status, popularity metrics, embed availability, last updated date, and external source when data is available.

#### Scenario: Full signal panel

- **WHEN** a user views a tool detail page with pricing, platforms, viewCount, clickCount, embedMode IFRAME, and updatedAt
- **THEN** the panel SHALL list each available signal in a structured layout with human-readable labels

#### Scenario: GitHub stars shown when present

- **WHEN** a tool has `githubStars` greater than 0 and a `github` URL
- **THEN** the panel SHALL display the star count formatted with locale-aware grouping (e.g. "1,200 stars")

#### Scenario: Product Hunt votes shown when present

- **WHEN** a tool has `phVotes` greater than 0
- **THEN** the panel SHALL display the vote count and link to `sourceUrl` when available

#### Scenario: Embed availability indicated

- **WHEN** a tool's `embedMode` is IFRAME or API
- **THEN** the panel SHALL indicate that the tool can be tried in-site
- **WHEN** a tool's `embedMode` is EXTERNAL
- **THEN** the panel SHALL indicate external-only access

### Requirement: External links use outbound redirect

All "Visit Website" and equivalent primary outbound actions on tool detail pages SHALL navigate through `/api/tools/{slug}/out` instead of linking directly to `tool.url`.

#### Scenario: Visit Website uses redirect

- **WHEN** a user clicks "Visit Website" on a tool detail page
- **THEN** the link target SHALL be `/api/tools/{slug}/out`
