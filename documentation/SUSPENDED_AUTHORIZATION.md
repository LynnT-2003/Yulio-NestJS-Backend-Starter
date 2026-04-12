# Suspended users: authentication vs authorization

Suspended accounts **authenticate** successfully (local login, OAuth, refresh). **Authorization** is enforced on almost all JWT-protected routes.

## Default behavior

1. **`JwtStrategy`** loads the user and attaches `isSuspended` to `req.user` (`ICurrentUser`). It does **not** reject suspended users.
2. **`SuspendedUserBlockGuard`** (global, after `JwtGuard`) throws **`403 Forbidden`** with `message: `"Account suspended"` when `req.user.isSuspended` is true.
3. **`@AllowSuspendedUser()`** opts a handler **out** of that block so suspended users can still call it.

## Opt-in routes (template)

| Route | Why |
|--------|-----|
| `GET /api/users/me` | Read profile, optional suspension reason, `suspendedAt`. |
| `POST /api/auth/logout` | Invalidate refresh token and end session. |

To allow more actions (e.g. read-only billing, support ticket), add `@AllowSuspendedUser()` to those handlers only. Product routes should stay **unmarked** so they return **403** by default.

## Public routes

`@Public()` skips JWT; `SuspendedUserBlockGuard` skips when the route is public, so no `req.user` is required.

## `IUserPublic` / login responses

`toPublic()` includes `isSuspended`, `suspensionReason`, and `suspendedAt` so clients can show a banner immediately after sign-in.

## Admin suspend side effect

Suspending a user still clears **all refresh tokens**. They must sign in again; after that they receive tokens and hit **403** on blocked routes until unsuspended.
