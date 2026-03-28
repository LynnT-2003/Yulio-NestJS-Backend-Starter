# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Created a dedicated repository layer (`src/user/user.repo.ts`) to securely encapsulate MongoDB operations from business logic.
- Implemented environment-driven token limits utilizing `MAX_SESSIONS` via `ConfigService`.

### Changed
- Extensively refactored `UserService` (`src/user/user.service.ts`) to cleanly delegate database queries to `UserRepo`.
- Replaced the direct `userModel` injection within `UserService` with the internally managed repository layer.

### Fixed
- Mitigated MongoDB `refreshTokens` unbounded array growth (memory leak) by enforcing an active sessions cap.
- Enforced session constraints directly inside database update operations utilizing `$each`, `$sort`, and `$slice` rather than fetching and mapping arrays manually.
