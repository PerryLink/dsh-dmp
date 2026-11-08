# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed

- `dmp_check` no longer counts scaffold prompts as filled sections; a new
  scaffold reports missing content instead of 100% coverage.
- The open-sharing heuristic requires the word `public`/`open`, so "publication
  in a journal" no longer triggers `open_sharing_of_personal_data`.
- Empty dataset fields and contacts count as missing.
- `dmp_check`/`dmp_export`/`dmp_scaffold` validate the plan shape and the
  `minRetentionYears` override and return `INVALID_INPUT` instead of throwing.
- Package author corrected to the dmp contributors.
- Regression tests for prompt-only scaffolds, publication wording, empty fields
  and malformed plans (14 total).


## [0.1.0] - 2026-11-08

First release: data-management-plan tooling.

### Added

- `dmp_scaffold`: ten prompt-filled sections and optional dataset entries.
- `dmp_check`: completeness, dataset/repository/licence/DOI coverage, personal
  data without security/legal basis, open sharing of personal data without
  de-identification, retention below the configured minimum, storage without
  backup, missing contact.
- `dmp_export`: Markdown + check JSON + SARIF 2.1.0.
- 10 tests.

### Notes

- Checks are completeness/consistency checks, not certification against any
  funder template; the 5-year retention default is a scaffold default that must
  be verified against the current call.
- No network and no file writes.
