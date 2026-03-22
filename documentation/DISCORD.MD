# Discord OAuth Setup

This guide covers setting up Discord OAuth for this boilerplate.

> For environment variables and deployment — see **README.md**.

---

## Table of Contents

- [How Discord Login works](#how-discord-login-works)
- [Sequence Diagram](#sequence-diagram)
- [Step 1 — Create a Discord Application](#step-1--create-a-discord-application)
- [Step 2 — Configure OAuth2](#step-2--configure-oauth2)
- [Step 3 — Get Client ID and Secret](#step-3--get-client-id-and-secret)
- [Step 4 — Add environment variables](#step-4--add-environment-variables)
- [Step 5 — Test the flow](#step-5--test-the-flow)
- [Account linking behaviour](#account-linking-behaviour)
- [Common errors](#common-errors)

---

## How Discord Login works

```
User clicks "Login with Discord"
         │
         ▼
GET /api/auth/discord
  → DiscordGuard redirects to:
    https://discord.com/api/oauth2/authorize
    ?client_id=YOUR_CLIENT_ID
    &redirect_uri=YOUR_CALLBACK_URL
    &scope=identify email
         │
         ▼
User approves Discord consent screen
         │
         ▼
Discord redirects to:
GET /api/auth/discord/callback?code=AUTHORIZATION_CODE
         │
         ▼
DiscordCallbackGuard → DiscordStrategy.validate()
  → passport-discord exchanges code for access token
  → fetches profile automatically
  → constructs avatar URL from avatar hash
  → normalize to OAuthUserDto
  → findOrCreateOAuthUser() — links to existing account if email matches
  → oauthLogin() — issues JWT access + refresh token pair
  → returns { user, tokens } to client
```

---

## Sequence Diagram

```
Client        AuthController   DiscordStrategy   Discord API     UserService     AuthService
  │                 │                │                │                │               │
  │ GET /auth/discord               │                │                │               │
  │────────────────▶│                │                │                │               │
  │                 │ DiscordGuard   │                │                │               │
  │◀────────────────│ 302 redirect   │                │                │               │
  │                 │ → Discord      │                │                │               │
  │                 │                │                │                │               │
  │  [User approves Discord consent screen]           │                │               │
  │                 │                │                │                │               │
  │ GET /auth/discord/callback?code= │                │                │               │
  │────────────────▶│                │                │                │               │
  │                 │ DiscordCallback │                │                │               │
  │                 │ Guard          │                │                │               │
  │                 │───────────────▶│                │                │               │
  │                 │                │ exchange code  │                │               │
  │                 │                │ fetch profile  │                │               │
  │                 │                │ (automatic)    │                │               │
  │                 │                │───────────────▶│                │               │
  │                 │                │◀───────────────│                │               │
  │                 │                │ { id, email,   │                │               │
  │                 │                │   username,    │                │               │
  │                 │                │   global_name, │                │               │
  │                 │                │   avatar hash }│                │               │
  │                 │                │                │                │               │
  │                 │                │ construct      │                │               │
  │                 │                │ avatar URL     │                │               │
  │                 │                │ build OAuthUserDto              │               │
  │                 │                │─────────────────────────────────▶               │
  │                 │                │                │ findOrCreate   │               │
  │                 │                │                │ OAuthUser()    │               │
  │                 │                │                │ ┌──────────────┤               │
  │                 │                │                │ │1. match by   │               │
  │                 │                │                │ │   provider   │               │
  │                 │                │                │ │2. match by   │               │
  │                 │                │                │ │   email      │               │
  │                 │                │                │ │3. create new │               │
  │                 │                │                │ └──────────────┤               │
  │                 │                │◀────────────────────────────────│               │
  │                 │                │                │  UserDocument  │               │
  │                 │                │ oauthLogin(user)                │               │
  │                 │                │──────────────────────────────────────────────▶ │
  │                 │                │                │                │ generateTokens│
  │                 │                │◀─────────────────────────────────────────────  │
  │                 │                │                │          IAuthResponse         │
  │                 │ req.user =     │                │                │               │
  │                 │ IAuthResponse  │                │                │               │
  │◀────────────────│                │                │                │               │
  │ 200 { user,     │                │                │                │               │
  │       tokens }  │                │                │                │               │
```

---

## Step 1 — Create a Discord Application

```
discord.com/developers/applications
→ New Application
→ Name: your app name
→ Create
```

---

## Step 2 — Configure OAuth2

```
Your application → OAuth2 tab (left sidebar)

Redirects → Add Redirect:
  https://your-app.vercel.app/api/auth/discord/callback

→ Save Changes
```

---

## Step 3 — Get Client ID and Secret

```
Your application → OAuth2 tab

Client ID     → copy — this is DISCORD_CLIENT_ID
Client Secret → click Reset Secret → copy — this is DISCORD_CLIENT_SECRET
              → confirm reset → copy immediately
```

---

## Step 4 — Add environment variables

Local `.env`:

```bash
DISCORD_CLIENT_ID=your-client-id
DISCORD_CLIENT_SECRET=your-client-secret
DISCORD_CALLBACK_URL=https://your-app.vercel.app/api/auth/discord/callback
```

Vercel dashboard → Settings → Environment Variables:

```
DISCORD_CLIENT_ID      = your-client-id
DISCORD_CLIENT_SECRET  = your-client-secret
DISCORD_CALLBACK_URL   = https://your-app.vercel.app/api/auth/discord/callback
```

Redeploy:

```bash
vercel --prod
```

---

## Step 5 — Test the flow

Open directly in browser:

**Production:**

```
https://your-app.vercel.app/api/auth/discord
```

After approving:

```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "user": {
      "displayName": "Your Discord Name",
      "avatar": "https://cdn.discordapp.com/avatars/...",
      "providers": [{ "provider": "discord" }]
    },
    "tokens": {
      "accessToken": "eyJ...",
      "refreshToken": "eyJ..."
    }
  },
  "timestamp": "..."
}
```

Copy `accessToken` → Swagger → Authorize → test protected routes.

---

## Account linking behaviour

| Scenario                                      | Result                                                  |
| --------------------------------------------- | ------------------------------------------------------- |
| New user, no existing account                 | New user document created with Discord provider         |
| Discord email matches existing local account  | Discord provider linked — one document, two providers   |
| Discord email matches existing Google account | Discord provider linked — one document, three providers |
| Discord account has no verified email         | New user created with `email: null`                     |

> Discord requires users to verify their email. Most accounts will have a verified email. Unverified accounts return `email: null`.

---

## Common errors

| Error                           | Cause                                    | Fix                                      |
| ------------------------------- | ---------------------------------------- | ---------------------------------------- |
| `redirect_uri_mismatch`         | Callback URL not added in Discord portal | Add URL under OAuth2 → Redirects         |
| `Invalid client_id`             | Wrong `DISCORD_CLIENT_ID`                | Check Client ID in OAuth2 tab            |
| `Invalid client_secret`         | Secret was reset after you copied it     | Reset and copy again from OAuth2 tab     |
| `email` is null                 | Discord account email not verified       | User needs to verify their Discord email |
| Works locally but not on Vercel | Env vars not set or old deployment       | Check Vercel env vars and redeploy       |

---

## Discord-specific notes

**Avatar URL construction** — Discord stores avatars as a hash string, not a URL. The strategy constructs the full URL:

```
https://cdn.discordapp.com/avatars/{userId}/{avatarHash}.png
```

If the user has no avatar, `avatar` will be `null`.

**Display name** — Discord has two name fields. The strategy prefers `global_name` (the newer display name) and falls back to `username` (the unique handle like `username#1234`).

**Scopes used:**

- `identify` — basic profile (id, username, avatar)
- `email` — email address
