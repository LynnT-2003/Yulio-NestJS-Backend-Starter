# NestJS Auth Boilerplate

Production-ready authentication boilerplate built on NestJS, MongoDB, and Passport.js. Designed as a reusable foundation — clone, configure environment variables, deploy.

| Layer          | Technology                                   |
| -------------- | -------------------------------------------- |
| Framework      | NestJS 11                                    |
| Language       | TypeScript 5                                 |
| Database       | MongoDB via Mongoose                         |
| Authentication | Passport.js (local + Google OAuth 2.0 + LINE Login + JWT) |
| Token Strategy | JWT access token (15m) + refresh token (30d) |
| Validation     | class-validator + class-transformer          |
| API Docs       | Swagger (OpenAPI 3.0)                        |
| Deployment     | Vercel (serverless)                          |

---

## Table of Contents

- [Quick Start](#quick-start)
- [MongoDB Atlas Setup](#mongodb-atlas-setup)
- [Google OAuth Setup](#google-oauth-setup)
- [LINE Login Setup](#line-login-setup)
- [Environment Variables](#environment-variables)
- [Vercel Deployment](#vercel-deployment)
- [Architecture](#architecture)
- [Request Lifecycle](#request-lifecycle)
- [Sequence Diagrams](#sequence-diagrams)
- [Data Models](#data-models)
- [API Reference](#api-reference)
- [Security Model](#security-model)
- [Swagger Bearer Auth](#swagger-bearer-auth)
- [Project Structure](#project-structure)

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Copy environment file
cp .env.example .env

# 3. Fill in .env (see sections below for MongoDB, Google OAuth, and LINE Login)

# 4. Run
npm run start:dev
```

Once running:

- API: `http://localhost:8080/api`
- Swagger docs: `http://localhost:8080/api/docs`

---

## MongoDB Atlas Setup

> If you already have a MongoDB connection string, skip to [step 5](#5-fill-in-env).

### 1. Create an Atlas account

Go to [cloud.mongodb.com](https://cloud.mongodb.com) and sign up (free tier works).

### 2. Create a cluster

A **cluster** is the server that hosts your databases.

1. Click **Build a Database**
2. Pick **M0 Free** tier
3. Choose a cloud provider and region close to you
4. Name it (e.g. `my-cluster`) → **Create Deployment**

### 3. Create a database user

This is the username/password your app uses to authenticate — **not** your Atlas login.

1. Go to **Database Access** in the sidebar
2. Click **Add New Database User**
3. Choose **Password** authentication
4. Set a username and password (avoid special characters in the password to prevent URI encoding issues)
5. Privileges: **Read and write to any database**
6. Click **Add User**

### 4. Get your cluster URI

1. Go to **Database** in the sidebar → click **Connect** on your cluster
2. Choose **Drivers**
3. You'll see a connection string like:

```
mongodb+srv://<username>:<password>@my-cluster.abc123.mongodb.net/?retryWrites=true&w=majority&appName=my-cluster
```

4. Copy everything **after** `<password>@`. That is your cluster URI:

```
my-cluster.abc123.mongodb.net/?retryWrites=true&w=majority&appName=my-cluster
```

### 5. Fill in `.env`

```bash
MONGO_USERNAME=the_username_from_step_3
MONGO_PASSWORD=the_password_from_step_3
MONGO_CLUSTER_URI=my-cluster.abc123.mongodb.net/?retryWrites=true&w=majority&appName=my-cluster
MONGO_DB_NAME=myapp-dev
```

> `buildMongoUri()` in `src/configs/mongo-uri-builder.ts` assembles the full `mongodb+srv://user:pass@cluster/db?params` connection string from these four values. You never construct the URI manually.

### 6. Allow network access

1. Go to **Network Access** in the Atlas sidebar
2. Click **Add IP Address**
3. For development: **Allow Access from Anywhere** (`0.0.0.0/0`)
4. For production: add your server's specific IP address

### Concepts

```
Cluster (server)
└── Database (e.g. "myapp-dev")
    ├── Collection: users        ← created automatically from your Mongoose schema
    ├── Collection: products     ← created automatically when first document is inserted
    └── Collection: orders
```

- **Database** = a container inside your cluster. Use one per environment (e.g. `myapp-dev`, `myapp-staging`).
- **Collection** = like a SQL table. Created automatically when a Mongoose model inserts its first document.

### Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| `querySrv ENOTFOUND` | Wrong `MONGO_CLUSTER_URI` | Copy the URI again from Atlas → Connect → Drivers |
| `Authentication failed` | Wrong credentials | Verify `MONGO_USERNAME` / `MONGO_PASSWORD` match your **Database User** (not Atlas login) |
| `connection timed out` | IP not allowed | Add your IP in Atlas → Network Access |
| `mongodb+srv://:@/` | Empty env vars | Ensure `.env` values are filled in |

---

## Google OAuth Setup

### 1. Create a Google Cloud project

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Click the project dropdown → **New Project**
3. Name it (e.g. `my-app-auth`) → **Create**

### 2. Enable the People API

1. Sidebar → **APIs & Services** → **Library**
2. Search **Google People API** → **Enable**

### 3. Configure OAuth consent screen

1. **APIs & Services** → **OAuth consent screen**
2. Choose **External** (any Google account) or **Internal** (Google Workspace only)
3. Fill in: app name, support email, developer contact email
4. On **Scopes**, add `userinfo.email` and `userinfo.profile`
5. Save through the remaining steps

### 4. Create OAuth credentials

1. **APIs & Services** → **Credentials** → **Create Credentials** → **OAuth client ID**
2. Application type: **Web application**
3. Under **Authorized redirect URIs**, add:

```
http://localhost:8080/api/auth/google/callback
https://yourdomain.com/api/auth/google/callback
```

> The redirect URI must **exactly match** `GOOGLE_CALLBACK_URL` in your `.env`.

4. Click **Create** and copy the **Client ID** and **Client Secret**

### 5. Fill in `.env`

```bash
GOOGLE_CLIENT_ID=123456789-abc.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your-secret-here
GOOGLE_CALLBACK_URL=http://localhost:8080/api/auth/google/callback
```

### Common errors

| Error | Cause | Fix |
| --- | --- | --- |
| `redirect_uri_mismatch` | Callback URL in `.env` doesn't match Google Console | Ensure exact match including protocol and path |
| `invalid_client` | Wrong Client ID or Secret | Verify `.env` values |
| `Access blocked` | Consent screen not configured | Complete step 3 above |
| `403 access_denied` | App in testing mode | Add your Google account under OAuth consent screen → Test users |

---

## LINE Login Setup

LINE Login uses OAuth 2.0 (`passport-oauth2`) with the same user pipeline as Google: `LineStrategy.validate()` fetches the profile from LINE, builds an `OAuthUserDto`, then `UserService.findOrCreateOAuthUser()` and `AuthService.oauthLogin()` issue JWTs.

**Endpoints**

| Step | Method | Path |
| --- | --- | --- |
| Start OAuth | `GET` | `/api/auth/line` → redirects to LINE consent |
| Callback | `GET` | `/api/auth/line/callback?code=...` → returns `{ user, tokens }` |

**`LINE_CALLBACK_URL`** in `.env` must match **exactly** the callback URL registered in the [LINE Developers Console](https://developers.line.biz/) for your LINE Login channel (e.g. `http://localhost:8080/api/auth/line/callback` locally, `https://your-app.vercel.app/api/auth/line/callback` in production).

**Serverless / Vercel:** `LineStrategy` uses a custom `StatelessStore` so Passport does not rely on session state between the redirect and the callback (each invocation may be a cold start). This trades CSRF protection via OAuth `state` for compatibility with serverless; see `src/auth/strategies/line.strategy.ts`.

**Email and account linking**

- Scopes include `profile`, `openid`, and `email`. Email appears on the profile API only after LINE approves the **email** permission for your channel.
- **`LINE_ACCOUNT_LINKING`** (default: strict): if not set to `permissive`, missing email triggers `401` with a clear message so you do not silently create users without email when you require it for linking. In `permissive` mode, users can be created with `email: null` (same as Google-only users without email in some setups).

**Full walkthrough** (channel creation, provider, publishing, troubleshooting): see `documentation/LINE.md`.

---

## Environment Variables

Copy `.env.example` to `.env` and fill in the values.

```bash
# Application
APP_ENVIRONMENT=Development           # Development | Staging | Production

# Server
PORT=8080
BASE_URL=http://localhost:8080
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001

# Rate Limiting
RATE_LIMIT_TIMEFRAME_SECONDS=60
RATE_LIMIT_MAX_REQUESTS=10

# MongoDB (see "MongoDB Atlas Setup" above)
MONGO_USERNAME=
MONGO_PASSWORD=
MONGO_CLUSTER_URI=
MONGO_DB_NAME=

# JWT
JWT_ACCESS_SECRET=                    # min 32 characters
JWT_REFRESH_SECRET=                   # min 32 characters
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=30d

# Google OAuth (see "Google OAuth Setup" above)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=http://localhost:8080/api/auth/google/callback

# LINE Login (see "LINE Login Setup" and documentation/LINE.md)
LINE_CHANNEL_ID=
LINE_CHANNEL_SECRET=
LINE_CALLBACK_URL=http://localhost:8080/api/auth/line/callback
LINE_ACCOUNT_LINKING=strict
```

`ConfigModule` exposes `process.env` to Nest (e.g. `ConfigService` in strategies). Shared app config is assembled in `loadEnvConfigs()` in `src/configs/env.config.ts`; OAuth secrets for Google/LINE are read directly from the environment where needed.

---

## Vercel Deployment

### 1. Set environment variables

In your Vercel project → **Settings** → **Environment Variables**, add every variable from `.env.example` with production values. Key differences from local:

| Variable | Production value |
| --- | --- |
| `APP_ENVIRONMENT` | `Production` |
| `BASE_URL` | `https://your-app.vercel.app` |
| `ALLOWED_ORIGINS` | Your frontend domain(s) |
| `GOOGLE_CALLBACK_URL` | `https://your-app.vercel.app/api/auth/google/callback` |
| `LINE_CALLBACK_URL` | `https://your-app.vercel.app/api/auth/line/callback` |

### 2. Push and deploy

The repo includes `vercel.json` — push to your connected branch and Vercel deploys automatically.

### How it works

`main.ts` exports a default handler for Vercel serverless and only calls `app.listen()` for local dev (detected via the `VERCEL` env var that Vercel sets automatically). The NestJS app is cached across warm invocations.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                          CLIENT                                 │
│              (Web App / Mobile App / Postman)                   │
└───────────────────────────┬─────────────────────────────────────┘
                            │ HTTPS
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                        VERCEL EDGE                              │
│                    (vercel.json routing)                        │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                      NESTJS APPLICATION                         │
│                                                                 │
│  ┌─────────────┐   ┌──────────────┐   ┌─────────────────────┐ │
│  │  Validation  │   │   JwtGuard   │   │   RolesGuard        │ │
│  │  Pipe        │──▶│   (global)   │──▶│   (global)          │ │
│  └─────────────┘   └──────────────┘   └─────────────────────┘ │
│                            │                                    │
│              ┌─────────────┴──────────────┐                    │
│              ▼                            ▼                    │
│  ┌───────────────────┐      ┌───────────────────────┐          │
│  │   AuthModule       │      │     UserModule        │          │
│  │                    │      │                       │          │
│  │  AuthController    │      │  UserController       │          │
│  │  AuthService       │─────▶│  UserService          │          │
│  │  LocalStrategy     │      │  UserEntity           │          │
│  │  GoogleStrategy    │      └───────────┬───────────┘          │
│  │  LineStrategy      │                  │                      │
│  │  JwtStrategy       │                  │                      │
│  └────────────────────┘                  │                      │
│                                          ▼                      │
│                           ┌──────────────────────────┐          │
│                           │        MongoDB            │          │
│                           │   (users collection)      │          │
│                           └──────────────────────────┘          │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  common/                                                  │  │
│  │  enums · interfaces · decorators · guards · filters       │  │
│  │  interceptors · pipes · strategies                        │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Request Lifecycle

```
HTTP Request
     │
     ▼
┌─────────────────┐
│ ValidationPipe   │  Strips unknown fields, validates DTO
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   JwtGuard       │  Checks @Public() — if not public, verifies Bearer token
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  JwtStrategy     │  Decodes JWT → findById() → attaches ICurrentUser to req.user
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   RolesGuard     │  Checks @Roles() metadata against req.user.role
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Controller     │  @CurrentUser(), @Body(), @Param()
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│    Service       │  Business logic, DB calls, token generation
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ TransformInt.    │  Wraps response: { success, statusCode, data, timestamp }
└────────┬────────┘
         │
         ▼
     HTTP Response

     On error:
┌─────────────────┐
│ HttpException    │  { success: false, statusCode, message, path, timestamp }
│    Filter        │
└─────────────────┘
```

---

## Sequence Diagrams

### Local Registration

```
Client          AuthController      AuthService         UserService        MongoDB
  │                   │                  │                   │                │
  │ POST /api/auth/register              │                   │                │
  │ { email, password,│                  │                   │                │
  │   displayName }   │                  │                   │                │
  │──────────────────▶│                  │                   │                │
  │                   │ register(dto)    │                   │                │
  │                   │─────────────────▶│                   │                │
  │                   │                  │ findByEmail()     │                │
  │                   │                  │─────────────────▶ │                │
  │                   │                  │                   │ findOne(email) │
  │                   │                  │                   │───────────────▶│
  │                   │                  │◀─────────────────── null           │
  │                   │                  │                   │                │
  │                   │                  │ bcrypt.hash(pw)   │                │
  │                   │                  │                   │                │
  │                   │                  │ createLocalUser() │                │
  │                   │                  │─────────────────▶ │ save(user)     │
  │                   │                  │                   │───────────────▶│
  │                   │                  │◀──────────────────── UserDocument  │
  │                   │                  │                   │                │
  │                   │                  │ generateTokens()  │                │
  │                   │                  │ saveRefreshToken()│                │
  │                   │                  │─────────────────▶ │ $push token    │
  │                   │                  │                   │───────────────▶│
  │                   │◀─────────────────│                   │                │
  │◀──────────────────│ 201 { user, tokens }                 │                │
```

### Local Login

```
Client          LocalGuard       LocalStrategy      AuthService       UserService
  │                 │                 │                  │                 │
  │ POST /api/auth/login              │                  │                 │
  │ { email, pw }   │                 │                  │                 │
  │────────────────▶│                 │                  │                 │
  │                 │ validate(email,pw)                  │                 │
  │                 │────────────────▶│                   │                 │
  │                 │                 │ validateLocal()   │                 │
  │                 │                 │─────────────────▶ │ findByEmail()   │
  │                 │                 │                   │────────────────▶│
  │                 │                 │                   │◀────────────────│
  │                 │                 │                   │ bcrypt.compare()│
  │                 │                 │◀──────────────────│ UserDocument    │
  │                 │ req.user = doc  │                   │                 │
  │                 │◀────────────────│                   │                 │
  │           AuthController         │                   │                 │
  │                 │ login(req.user) │                   │                 │
  │                 │──────────────────────────────────▶  │                 │
  │                 │                 │                   │ generateTokens()│
  │◀────────────────│ 200 { user, tokens }                │                 │
```

### Google OAuth

```
Client           AuthController    GoogleStrategy      UserService      AuthService
  │                   │                 │                   │                │
  │ GET /api/auth/google                │                   │                │
  │──────────────────▶│                 │                   │                │
  │◀──────────────────│ 302 → Google    │                   │                │
  │                   │                 │                   │                │
  │  [User approves consent screen]     │                   │                │
  │                   │                 │                   │                │
  │ GET /api/auth/google/callback?code=...                  │                │
  │──────────────────▶│                 │                   │                │
  │                   │────────────────▶│                   │                │
  │                   │                 │ validate(profile) │                │
  │                   │                 │──────────────────▶│                │
  │                   │                 │                   │ findOrCreate   │
  │                   │                 │◀──────────────────│ UserDocument   │
  │                   │                 │ oauthLogin(user)  │                │
  │                   │                 │──────────────────────────────────▶│
  │                   │                 │◀──────────────────────────────────│
  │◀──────────────────│ 200 { user, tokens }                │                │
```

### LINE Login

```
Client           AuthController    LineStrategy        UserService      AuthService
  │                   │                 │                   │                │
  │ GET /api/auth/line                  │                   │                │
  │──────────────────▶│                 │                   │                │
  │◀──────────────────│ 302 → LINE      │                   │                │
  │                   │                 │                   │                │
  │  [User approves LINE consent]       │                   │                │
  │                   │                 │                   │                │
  │ GET /api/auth/line/callback?code=...                  │                │
  │──────────────────▶│                 │                   │                │
  │                   │────────────────▶│                   │                │
  │                   │                 │ GET /v2/profile   │                │
  │                   │                 │ (Bearer token)    │                │
  │                   │                 │ validate() →      │                │
  │                   │                 │──────────────────▶│ findOrCreate   │
  │                   │                 │◀──────────────────│ UserDocument   │
  │                   │                 │ oauthLogin(user)  │                │
  │                   │                 │──────────────────────────────────▶│
  │                   │                 │◀──────────────────────────────────│
  │◀──────────────────│ 200 { user, tokens }                │                │
```

### Authenticated Request

```
Client            JwtGuard         JwtStrategy          UserService
  │                  │                  │                    │
  │ GET /api/users/me│                  │                    │
  │ Bearer <token>   │                  │                    │
  │─────────────────▶│                  │                    │
  │                  │ check @Public()  │                    │
  │                  │ → not public     │                    │
  │                  │─────────────────▶│                    │
  │                  │                  │ verify + decode    │
  │                  │                  │ findById(sub)      │
  │                  │                  │───────────────────▶│
  │                  │                  │◀───────────────────│
  │                  │ req.user =       │                    │
  │                  │ ICurrentUser     │                    │
  │                  │◀─────────────────│                    │
  │            UserController          │                    │
  │                  │ @CurrentUser()   │                    │
  │◀─────────────────│ 200 IUserPublic │                    │
```

### Token Refresh

```
Client          AuthController      AuthService          UserService
  │                   │                  │                    │
  │ POST /api/auth/refresh               │                    │
  │ { userId,         │                  │                    │
  │   refreshToken }  │                  │                    │
  │──────────────────▶│                  │                    │
  │                   │ refreshTokens()  │                    │
  │                   │─────────────────▶│                    │
  │                   │                  │ findValidRefresh   │
  │                   │                  │ Token()            │
  │                   │                  │───────────────────▶│
  │                   │                  │                    │ bcrypt.compare
  │                   │                  │◀───────────────────│
  │                   │                  │ removeOldToken     │
  │                   │                  │ generateNewPair    │
  │                   │                  │ saveNewToken       │
  │                   │                  │───────────────────▶│
  │                   │◀─────────────────│                    │
  │◀──────────────────│ 200 { accessToken, refreshToken }    │
```

### Logout

```
Client          AuthController      AuthService          UserService
  │                   │                  │                    │
  │ POST /api/auth/logout                │                    │
  │ Bearer <token>    │                  │                    │
  │ { userId,         │                  │                    │
  │   refreshToken }  │                  │                    │
  │──────────────────▶│                  │                    │
  │                   │ [JwtGuard runs]  │                    │
  │                   │ logout()         │                    │
  │                   │─────────────────▶│                    │
  │                   │                  │ findValidRefresh   │
  │                   │                  │ Token()            │
  │                   │                  │───────────────────▶│
  │                   │                  │ removeRefreshToken │
  │                   │                  │───────────────────▶│
  │                   │◀─────────────────│                    │
  │◀──────────────────│ 200              │                    │
```

---

## Data Models

### User Document

```
users collection
┌─────────────────────────────────────────────────────────┐
│ Field             Type              Notes               │
├─────────────────────────────────────────────────────────┤
│ _id               ObjectId          Auto-generated      │
│ email             string | null     unique, sparse      │
│ password          string | null     bcrypt, select:false │
│ displayName       string            required            │
│ avatar            string | null                         │
│ role              UserRole          default: 'user'     │
│ isEmailVerified   boolean           default: false      │
│ providers         OAuthProvider[]   subdocument array   │
│ refreshTokens     RefreshToken[]    select:false        │
│ createdAt         Date              auto (timestamps)   │
│ updatedAt         Date              auto (timestamps)   │
└─────────────────────────────────────────────────────────┘

OAuthProvider subdocument
┌─────────────────────────────────────────────────────────┐
│ provider          OAuthProviderType  'google' | 'line' | 'local' │
│ providerId        string             unique per provider│
│ accessToken       string | null                         │
└─────────────────────────────────────────────────────────┘

RefreshToken subdocument
┌─────────────────────────────────────────────────────────┐
│ token             string             bcrypt hash        │
│ createdAt         Date                                  │
│ expiresAt         Date               30 days from issue │
└─────────────────────────────────────────────────────────┘
```

### Indexes

```
{ email: 1 }                                    unique, sparse
{ "providers.provider": 1, "providers.providerId": 1 }   compound
```

---

## API Reference

All responses are wrapped by `TransformInterceptor`:

```json
{
  "success": true,
  "statusCode": 200,
  "data": { "..." },
  "timestamp": "2026-01-01T00:00:00.000Z"
}
```

```json
{
  "success": false,
  "statusCode": 401,
  "message": "Invalid email or password",
  "path": "/api/auth/login",
  "timestamp": "2026-01-01T00:00:00.000Z"
}
```

### Auth Endpoints

| Method | Path | Guard | Body | Description |
| --- | --- | --- | --- | --- |
| POST | `/api/auth/register` | Public | `RegisterDto` | Create account |
| POST | `/api/auth/login` | Public + LocalGuard | `LoginDto` | Email/password login |
| POST | `/api/auth/refresh` | Public | `RefreshTokenDto` | Rotate token pair |
| POST | `/api/auth/logout` | JwtGuard | `RefreshTokenDto` | Invalidate refresh token |
| GET | `/api/auth/google` | Public + GoogleGuard | — | Redirect to Google |
| GET | `/api/auth/google/callback` | Public + GoogleCallbackGuard | — | OAuth callback |
| GET | `/api/auth/line` | Public + LineGuard | — | Redirect to LINE |
| GET | `/api/auth/line/callback` | Public + LineCallbackGuard | — | OAuth callback |

### User Endpoints

| Method | Path | Guard | Body | Description |
| --- | --- | --- | --- | --- |
| GET | `/api/users/me` | JwtGuard | — | Get own profile |
| PATCH | `/api/users/me` | JwtGuard | `UpdateUserDto` | Update profile |
| DELETE | `/api/users/me` | JwtGuard | — | Delete account |
| GET | `/api/users/admin` | JwtGuard + `@Roles(ADMIN)` | — | Admin-only route |

---

## Security Model

| Layer | Implementation |
| --- | --- |
| Transport | HTTPS enforced via Vercel edge |
| Input validation | class-validator with whitelist and `forbidNonWhitelisted` |
| Authentication | JWT access token — 15 min expiry, signed with `JWT_ACCESS_SECRET` |
| Refresh tokens | 30 day expiry, stored as bcrypt hash in MongoDB, rotated on every use |
| Passwords | bcrypt (10 salt rounds), `select: false` on schema |
| Authorization | Role-based via `@Roles()` + `RolesGuard`, checked after JWT validation |
| Data exposure | `password` and `refreshTokens` excluded from queries via `select: false`; `IUserPublic` strips sensitive fields; OAuth providers expose name only |

---

## Swagger Bearer Auth

The Swagger UI at `/api/docs` supports Bearer token authentication.

### How it works

`api-docs.config.ts` registers a Bearer auth scheme with the reference name `JWT-auth`:

```typescript
.addBearerAuth(
  { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', ... },
  'JWT-auth',
)
```

Protected controllers reference it with `@ApiBearerAuth('JWT-auth')`:

```typescript
@ApiBearerAuth('JWT-auth')
@Controller('users')
export class UserController { ... }
```

### Using it in Swagger UI

1. Open `http://localhost:8080/api/docs`
2. Click **Authorize** (top right)
3. Paste the `accessToken` from a login/register response
4. Click **Authorize** → **Close**
5. All protected routes now send `Authorization: Bearer <token>` automatically

> Routes marked `@Public()` still show the lock icon in Swagger but work without a token.

---

## Project Structure

```
src/
├── main.ts                              Entry point (local + Vercel serverless)
├── app.module.ts                        Root module — global guards, config, DB
├── app.controller.ts                    Health check
├── app.service.ts
│
├── configs/
│   ├── env.config.ts                    loadEnvConfigs() — single source of truth
│   ├── api-docs.config.ts               buildAPIDocs() — Swagger setup
│   ├── mongo-uri-builder.ts             buildMongoUri() — assembles connection string
│   ├── db-connection-names.ts           Named connection constants (multi-DB ready)
│   └── types/
│       └── env.ts                       TypeScript types for all config sections
│
├── common/
│   ├── enums/
│   │   ├── user-role.enum.ts            USER | ADMIN
│   │   └── oauth-provider.enum.ts       GOOGLE | LINE | LOCAL
│   ├── interfaces/
│   │   ├── user.interface.ts            IUser, IUserPublic, ICurrentUser
│   │   └── auth.interface.ts            IJwtPayload, IAuthTokens, IAuthResponse
│   ├── decorators/
│   │   ├── current-user.decorator.ts    @CurrentUser() — reads req.user
│   │   ├── public.decorator.ts          @Public() — skips JwtGuard
│   │   └── roles.decorator.ts           @Roles() — sets required role
│   ├── guards/
│   │   ├── jwt.guard.ts                 Global — protects all routes by default
│   │   └── roles.guard.ts              Global — enforces @Roles()
│   ├── strategies/
│   │   └── jwt.strategy.ts              Validates Bearer token, attaches user
│   ├── filters/
│   │   └── http-exception.filter.ts     Consistent error response shape
│   ├── interceptors/
│   │   └── transform.interceptor.ts     Wraps all responses in { success, data }
│   └── pipes/
│       └── validation.pipe.ts           Global DTO validation
│
├── auth/
│   ├── interfaces/
│   │   └── auth.service.interface.ts    IAuthService contract
│   ├── dto/
│   │   ├── register.dto.ts
│   │   ├── login.dto.ts
│   │   └── refresh-token.dto.ts
│   ├── strategies/
│   │   ├── local.strategy.ts            Email + password validation
│   │   ├── google.strategy.ts           OAuth 2.0 (Google)
│   │   └── line.strategy.ts             OAuth 2.0 (LINE; StatelessStore for serverless)
│   ├── guards/
│   │   ├── local.guard.ts
│   │   ├── google.guard.ts
│   │   ├── google-callback.guard.ts
│   │   ├── line.guard.ts
│   │   └── line-callback.guard.ts
│   ├── auth.service.ts
│   ├── auth.controller.ts
│   └── auth.module.ts
│
└── user/
    ├── interfaces/
    │   └── user.service.interface.ts     IUserService contract
    ├── entity/
    │   └── user.entity.ts               Mongoose schema + subdocuments
    ├── dto/
    │   ├── update-user.dto.ts
    │   └── oauth-user.dto.ts            Internal — Passport → service
    ├── user.service.ts
    ├── user.controller.ts
    └── user.module.ts
```

---

## How `@CurrentUser()` Works

A common point of confusion — it looks like magic but is entirely driven by the JWT in the request header.

```
1. Client sends: Authorization: Bearer <accessToken>
2. JwtGuard checks @Public() — if not public, hands off to JwtStrategy
3. JwtStrategy verifies signature, checks expiry, decodes payload { sub, email, role }
4. JwtStrategy.validate() calls findById(sub) → returns ICurrentUser { userId, email, role }
5. Passport attaches it to req.user
6. @CurrentUser() reads req.user — no decoding, that's already done
```

If no token is sent or the token is expired, JwtGuard returns `401 Unauthorized` before the controller ever runs.

---

## Adding a New Feature Module

1. Create `src/your-module/` with controller, service, module, entity, DTOs
2. Register the Mongoose schema in your module: `MongooseModule.forFeature([...])`
3. Import your module in `app.module.ts`
4. Protected by default (JwtGuard is global) — add `@Public()` to opt out
5. Add `@Roles()` for role-restricted routes
6. Add `@ApiTags()` and `@ApiBearerAuth('JWT-auth')` for Swagger

No changes needed to guards, strategies, or interceptors.
