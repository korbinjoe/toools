## ADDED Requirements

### Requirement: Tool stores external trust metrics

The system SHALL persist optional external trust metrics on each `Tool` record: `phVotes` (integer), `githubStars` (integer), `source` (enum: MANUAL, PRODUCT_HUNT, AWESOME_LIST), and `sourceUrl` (string URL).

#### Scenario: Product Hunt import writes votes

- **WHEN** a tool is imported from Product Hunt with `votesCount` of 842
- **THEN** the tool record SHALL have `phVotes = 842`, `source = PRODUCT_HUNT`, and `sourceUrl` set to the PH post URL

#### Scenario: Awesome List import writes GitHub stars

- **WHEN** a tool is imported with a valid `github` URL and the GitHub API returns `stargazers_count` of 1200
- **THEN** the tool record SHALL have `githubStars = 1200` and `source = AWESOME_LIST`

#### Scenario: Manual tools omit external metrics

- **WHEN** a tool is submitted via the submit form without external source data
- **THEN** `phVotes`, `githubStars`, `source`, and `sourceUrl` SHALL remain null

### Requirement: Click count increments on outbound navigation

The system SHALL increment `clickCount` by 1 when a user navigates to a tool's external website through the official outbound redirect.

#### Scenario: Outbound redirect tracks click

- **WHEN** a user requests `GET /api/tools/{slug}/out` for an approved tool
- **THEN** the system SHALL increment that tool's `clickCount` and respond with a redirect to `tool.url`

#### Scenario: Unknown slug does not increment

- **WHEN** a user requests `GET /api/tools/{invalid-slug}/out`
- **THEN** the system SHALL respond with 404 and SHALL NOT modify any clickCount

### Requirement: Platform values are normalized on import

Import scripts SHALL normalize platform strings to the canonical set: `Web`, `Mac`, `Windows`, `Linux`, `iOS`, `Android` before persisting to `platforms`.

#### Scenario: Case-insensitive platform normalization

- **WHEN** an import record contains platform `"web"` or `"WEB"`
- **THEN** the stored value SHALL be `"Web"`
