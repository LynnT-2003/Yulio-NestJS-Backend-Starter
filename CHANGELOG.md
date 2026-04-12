# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2026-04-12]

### Added

- **`SuspendedUserBlockGuard`** (global, after **`JwtGuard`**): suspended users receive **`403 Forbidden`** with **`message: "Account suspended"`** on JWT-protected routes unless opted out.
- **`@AllowSuspendedUser()`** decorator (`src/common/decorators/allow-suspended-user.decorator.ts`) to allow specific handlers for suspended accounts.
- **`documentation/SUSPENDED_AUTHORIZATION.md`** — how to extend the allowlist.

### Changed

- **Suspension model**: **authentication** vs **authorization** — local login, OAuth, and refresh **no longer** reject suspended users; **`JwtStrategy`** attaches **`isSuspended`** on **`ICurrentUser`** instead of throwing **`401 Account suspended`**.
- **`IUserPublic`** / **`UserPublicDto`** / **`toPublic()`** include **`isSuspended`**, **`suspensionReason`**, **`suspendedAt`** for all consumers of public user JSON.
- **`IUserAdminModerationView`** is now a **type alias** of **`IUserPublic`** (same fields).
- **`GET /api/users/me`** and **`POST /api/auth/logout`** use **`@AllowSuspendedUser()`** so suspended users can read profile and sign out.

### Security

- Suspended users are blocked from **most Bearer-authenticated routes** (**403**) by default; expand allowed behavior only with **`@AllowSuspendedUser()`**. Suspending a user still clears **all refresh tokens**.

## [2026-04-11]

### Added

- Optional **`FRONTEND_OAUTH_CALLBACK_URL`** (`serverConfig.frontendOauthCallbackUrl`): when set, successful OAuth callbacks for **Google, LINE, GitHub, Discord, and Microsoft** respond with **302** to that URL and pass `accessToken`, `refreshToken`, and `userId` in the URL **fragment** (hash), for first-party SPAs without a BFF.
- `src/auth/helpers/oauth-spa-redirect.helper.ts` to build the redirect target consistently.
- **`API_KEY`** (documented in `.env.example`): shared secret for internal tooling; consumed by **`ApiKeyGuard`** (`src/common/guards/api-key.guard.ts`), which checks the **`x-api-key`** header.
- **`UserTestingController`** (`PATCH /api/users/testing/role/:id`): `@Public()` + API-key–protected route to set a user’s **`role`** without a prior admin JWT (bootstrap / testing). Swagger tag **Users - Internal Testing**; **`addApiKey`** security scheme **`api-key`** in `api-docs.config.ts`.
- **`UpdateRoleDto`** and **`PATCH /api/users/role/:id`** on `UserController`: admin JWT (`@Roles(UserRole.ADMIN)`) can update another user’s role.
- **Platform moderation**: `AdminModule` (`src/admin/`) with **`AdminModerationController`** under **`/api/admin/moderation`** (all **`@Roles(ADMIN)`**):
  - **`GET .../users`** — paginated directory (`page`, `limit`, optional `search`, optional `suspended=true|false`);
  - **`GET .../users/:id`** — user profile plus moderation fields;
  - **`POST .../users/:id/suspend`** — optional body `SuspendUserDto` (`reason`, max 2000 chars); revokes all refresh tokens; cannot target **`admin`** or self;
  - **`POST .../users/:id/unsuspend`** — clears suspension.
- User schema fields **`isSuspended`**, **`suspensionReason`**, **`suspendedAt`** and compound index **`{ isSuspended: 1, createdAt: -1 }`**.
- Type **`IUserAdminModerationView`** (extends public user with moderation fields) and matching **`IUser`** fields for internal typing.

### Changed

- **`JwtGuard`** now overrides `handleRequest` so JWT failures use deterministic **`message`** strings (still only the usual error envelope: `success`, `statusCode`, `message`, `path`, `timestamp`): **`jwt expired`** when `TokenExpiredError` is reported by passport-jwt (SPA refresh flow), **`invalid access token`** for other JWT verification failures; existing **`HttpException`** from `JwtStrategy.validate()` (e.g. user removed) is rethrown unchanged.
- OAuth callback handlers in `AuthController` now use `@Res()` and a shared **`respondOAuthSuccess`** path: either redirect (when the env is set) or the same **JSON success envelope** as before (`success`, `statusCode`, `data`, `timestamp`) when integrating manually with `TransformInterceptor`-shaped responses for callbacks that bypass the interceptor on redirect only.
- **`src/common/strategies/jwt.strategy.ts`**: **`JwtStrategy.validate()`** now returns **`role: user.role`** instead of **`role: payload.role`**, and uses the loaded document for **`userId`** and **`email`** as well, so **`req.user`** matches MongoDB after **`findById`** rather than stale JWT claims (role changes apply on the next authenticated request).
- **`AuthService`**: _(Superseded **[2026-04-12]** — suspended users may authenticate; use **`SuspendedUserBlockGuard`**.)_ Previously **`validateLocalUser`** returned no user when **`isSuspended`**; **`login`**, **`oauthLogin`**, and **`refreshTokens`** threw **`UnauthorizedException('Account suspended')`**.
- **`UserModule`** registers **`UserTestingController`** alongside **`UserController`**; **`AppModule`** imports **`AdminModule`**.

### Security

- _(Behavior updated **[2026-04-12]**.)_ At this release, suspended users were blocked at JWT validation and login/refresh; suspending still cleared refresh tokens.
- Treat **`API_KEY`** and the **`/api/users/testing/*`** routes as **privileged**: use a strong key in production, restrict exposure (network / feature flags), or remove the testing controller if you do not need bootstrap-by-key.

### Notes (template / demos)

- **Default behavior is unchanged** for anyone who does **not** set `FRONTEND_OAUTH_CALLBACK_URL` (including empty `.env` / clone-and-run demos): callbacks still return **JSON on the API host**, which is ideal for Swagger, mobile, or “inspect the token payload” flows.
- Setting the variable is **opt-in** for browser SPAs that need to land back on a frontend origin after OAuth.
- **MongoDB**: existing user documents without moderation fields behave as **not suspended** until updated; new fields apply on write per Mongoose schema defaults.

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
