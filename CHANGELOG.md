# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2026-04-11]

### Added

- Optional **`FRONTEND_OAUTH_CALLBACK_URL`** (`serverConfig.frontendOauthCallbackUrl`): when set, successful OAuth callbacks for **Google, LINE, GitHub, Discord, and Microsoft** respond with **302** to that URL and pass `accessToken`, `refreshToken`, and `userId` in the URL **fragment** (hash), for first-party SPAs without a BFF.
- `src/auth/helpers/oauth-spa-redirect.helper.ts` to build the redirect target consistently.

### Changed

- **`JwtGuard`** now overrides `handleRequest` so JWT failures use deterministic **`message`** strings (still only the usual error envelope: `success`, `statusCode`, `message`, `path`, `timestamp`): **`jwt expired`** when `TokenExpiredError` is reported by passport-jwt (SPA refresh flow), **`invalid access token`** for other JWT verification failures; existing **`HttpException`** from `JwtStrategy.validate()` (e.g. user removed) is rethrown unchanged.
- OAuth callback handlers in `AuthController` now use `@Res()` and a shared **`respondOAuthSuccess`** path: either redirect (when the env is set) or the same **JSON success envelope** as before (`success`, `statusCode`, `data`, `timestamp`) when integrating manually with `TransformInterceptor`-shaped responses for callbacks that bypass the interceptor on redirect only.

### Notes (template / demos)

- **Default behavior is unchanged** for anyone who does **not** set `FRONTEND_OAUTH_CALLBACK_URL` (including empty `.env` / clone-and-run demos): callbacks still return **JSON on the API host**, which is ideal for Swagger, mobile, or “inspect the token payload” flows.
- Setting the variable is **opt-in** for browser SPAs that need to land back on a frontend origin after OAuth.

---

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
