## ADDED Requirements

### Requirement: Tools list supports sort by popularity signals

The tools browse page (`/tools`) SHALL support a `sort` query parameter with values `popular` (default), `newest`, and `clicks`.

#### Scenario: Default popular sort

- **WHEN** a user visits `/tools` without a `sort` parameter
- **THEN** tools SHALL be ordered by `featured` descending, then `viewCount` descending

#### Scenario: Newest sort

- **WHEN** a user visits `/tools?sort=newest`
- **THEN** tools SHALL be ordered by `createdAt` descending

#### Scenario: Clicks sort

- **WHEN** a user visits `/tools?sort=clicks`
- **THEN** tools SHALL be ordered by `clickCount` descending

### Requirement: Tools list supports signal-based filters

The tools browse page SHALL support query parameters to filter by open source status, featured status, and platform.

#### Scenario: Open source filter

- **WHEN** a user visits `/tools?openSource=1`
- **THEN** only tools with `isOpenSource = true` SHALL be returned

#### Scenario: Featured filter

- **WHEN** a user visits `/tools?featured=1`
- **THEN** only tools with `featured = true` SHALL be returned

#### Scenario: Platform filter

- **WHEN** a user visits `/tools?platform=Mac`
- **THEN** only tools whose `platforms` array contains `"Mac"` SHALL be returned

#### Scenario: Filters compose with existing filters

- **WHEN** a user applies category, pricing, and signal filters together
- **THEN** the result set SHALL satisfy all active filter conditions (logical AND)

### Requirement: Filter panel exposes sort and signal filters

The FilterPanel component SHALL provide UI controls for sort order, open source filter, featured filter, and platform filter that update URL query parameters.

#### Scenario: Sort chip updates URL

- **WHEN** a user selects "Newest" in the sort control
- **THEN** the URL SHALL include `sort=newest` and the page parameter SHALL reset to 1

#### Scenario: Toggling open source filter

- **WHEN** a user clicks the "Open Source" filter chip while it is inactive
- **THEN** the URL SHALL include `openSource=1`
- **WHEN** the user clicks the same chip while active
- **THEN** the URL SHALL remove `openSource`
