# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2026-03-30]

### Added

- Added consistent Swagger response documentation for `GET /api/auth/verify-email` and introduced `EmailResponseDto`.
- Added `documentation/EMAIL.md` to document SMTP configuration and email verification setup for non-technical users.
- Added a reusable email wrapper template (`baseEmailTemplate`) and new email content templates for verification and welcome emails.
- Added `sendWelcomeEmail()` and `sendCustomEmail()` to `IMailService`/`MailService`.
- Added `isUserHasAnySocialLoginProvider()` to `IUserService`/`UserService`.

### Changed

- Refactored `MailService` to centralize delivery logic in a single `send()` method that wraps content with `baseEmailTemplate`.
- Updated Swagger UI configuration to use branded title + favicon.
- Updated OAuth user flows so non-local providers can be considered verified automatically (when appropriate).

### Fixed

- Prevented resending a verification email for users who are already verified.
- Marked `POST /api/auth/resend-verification` as a Bearer-authenticated route in Swagger.

---

## [2026-03-28]

### Added

- Created a dedicated repository layer (`src/user/user.repo.ts`) to securely encapsulate MongoDB operations from business logic.
- Implemented environment-driven token limits utilizing `MAX_SESSIONS` via `ConfigService`.

### Changed

- Extensively refactored `UserService` (`src/user/user.service.ts`) to cleanly delegate database queries to `UserRepo`.
- Replaced the direct `userModel` injection within `UserService` with the internally managed repository layer.

### Fixed

- Mitigated MongoDB `refreshTokens` unbounded array growth (memory leak) by enforcing an active sessions cap.
- Enforced session constraints directly inside database update operations utilizing `$each`, `$sort`, and `$slice` rather than fetching and mapping arrays manually.
