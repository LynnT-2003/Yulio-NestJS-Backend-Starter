# LINE OAuth Setup

This guide covers setting up LINE Login for this boilerplate — from creating a LINE channel to testing the OAuth flow end to end.

> For environment variables and deployment — see **README.md**.

---

## Table of Contents

- [How LINE Login works](#how-line-login-works)
- [Sequence Diagram](#sequence-diagram)
- [Step 1 — Create a LINE Developers account](#step-1--create-a-line-developers-account)
- [Step 2 — Create a Provider](#step-2--create-a-provider)
- [Step 3 — Create a LINE Login channel](#step-3--create-a-line-login-channel)
- [Step 4 — Get your Channel ID and Secret](#step-4--get-your-channel-id-and-secret)
- [Step 5 — Set the callback URL](#step-5--set-the-callback-url)
- [Step 6 — Apply for email permission](#step-6--apply-for-email-permission-optional)
- [Step 7 — Publish the channel](#step-7--publish-the-channel)
- [Step 8 — Add environment variables](#step-8--add-environment-variables)
- [Step 9 — Test the flow](#step-9--test-the-flow)
- [Account linking behaviour](#account-linking-behaviour)
- [Common errors](#common-errors)
- [LINE vs Google — key differences](#line-vs-google--key-differences)

---

## How LINE Login works

```
User clicks "Login with LINE"
         │
         ▼
GET /api/auth/line
  → LineGuard redirects to:
    https://access.line.me/oauth2/v2.1/authorize
    ?client_id=YOUR_CHANNEL_ID
    &redirect_uri=YOUR_CALLBACK_URL
    &scope=profile openid email
         │
         ▼
User approves LINE consent screen
         │
         ▼
LINE redirects to:
GET /api/auth/line/callback?code=AUTHORIZATION_CODE
         │
         ▼
LineCallbackGuard → LineStrategy.validate()
  → passport-oauth2 exchanges code for access token
  → fetch profile from https://api.line.me/v2/profile
  → normalize to OAuthUserDto
  → findOrCreateOAuthUser() — links to existing account if email matches
  → oauthLogin() — issues JWT access + refresh token pair
  → returns { user, tokens } to client
```

---

## Sequence Diagram

```
Client        AuthController    LineStrategy       LINE API        UserService     AuthService
  │                 │                │                 │                │               │
  │ GET /auth/line  │                │                 │                │               │
  │────────────────▶│                │                 │                │               │
  │                 │  LineGuard     │                 │                │               │
  │◀────────────────│  302 redirect  │                 │                │               │
  │                 │  → LINE consent│                 │                │               │
  │                 │                │                 │                │               │
  │  [User approves LINE consent screen]               │                │               │
  │                 │                │                 │                │               │
  │ GET /auth/line/callback?code=... │                 │                │               │
  │────────────────▶│                │                 │                │               │
  │                 │ LineCallback   │                 │                │               │
  │                 │ Guard          │                 │                │               │
  │                 │───────────────▶│                 │                │               │
  │                 │                │ exchange code   │                │               │
  │                 │                │ for access token│                │               │
  │                 │                │────────────────▶│                │               │
  │                 │                │◀────────────────│                │               │
  │                 │                │  access_token   │                │               │
  │                 │                │                 │                │               │
  │                 │                │ GET /v2/profile │                │               │
  │                 │                │ Authorization:  │                │               │
  │                 │                │ Bearer token    │                │               │
  │                 │                │────────────────▶│                │               │
  │                 │                │◀────────────────│                │               │
  │                 │                │ { userId,       │                │               │
  │                 │                │   displayName,  │                │               │
  │                 │                │   pictureUrl }  │                │               │
  │                 │                │                 │                │               │
  │                 │                │ build OAuthUserDto               │               │
  │                 │                │──────────────────────────────────▶               │
  │                 │                │                 │ findOrCreate   │               │
  │                 │                │                 │ OAuthUser()    │               │
  │                 │                │                 │ ┌──────────────┤               │
  │                 │                │                 │ │1. match by   │               │
  │                 │                │                 │ │   provider   │               │
  │                 │                │                 │ │2. match by   │               │
  │                 │                │                 │ │   email      │               │
  │                 │                │                 │ │3. create new │               │
  │                 │                │                 │ └──────────────┤               │
  │                 │                │◀─────────────────────────────────│               │
  │                 │                │                 │  UserDocument  │               │
  │                 │                │                 │                │               │
  │                 │                │ oauthLogin(user)│                │               │
  │                 │                │───────────────────────────────────────────────▶ │
  │                 │                │                 │                │ generateTokens│
  │                 │                │                 │                │ saveRefresh   │
  │                 │                │◀──────────────────────────────────────────────  │
  │                 │                │                 │          IAuthResponse         │
  │                 │ req.user =     │                 │                │               │
  │                 │ IAuthResponse  │                 │                │               │
  │◀────────────────│                │                 │                │               │
  │ 200 {           │                │                 │                │               │
  │   user: {       │                │                 │                │               │
  │     displayName,│                │                 │                │               │
  │     providers:  │                │                 │                │               │
  │     [{ line }]  │                │                 │                │               │
  │   },            │                │                 │                │               │
  │   tokens: {     │                │                 │                │               │
  │     accessToken,│                │                 │                │               │
  │     refreshToken│                │                 │                │               │
  │   }             │                │                 │                │               │
  │ }               │                │                 │                │               │
```

---

## Step 1 — Create a LINE Developers account

Go to [developers.line.biz](https://developers.line.biz) and log in with your LINE account.

If you do not have a LINE account:

1. Download the LINE app on your phone
2. Register with your phone number
3. Come back and log in at [developers.line.biz](https://developers.line.biz)

---

## Step 2 — Create a Provider

A Provider is a container for your channels. Think of it as your company or project name.

```
LINE Developers Console
→ top right → Create a new provider
→ Provider name: your company or project name
→ Create
```

---

## Step 3 — Create a LINE Login channel

```
Inside your Provider
→ Create a new channel → LINE Login

Fill in:
  Channel type:         LINE Login (already selected)
  Provider:             your provider (already selected)
  Channel icon:         optional — upload a logo
  Channel name:         your app name (shown to users on consent screen)
  Channel description:  short description
  App type:             ✓ Web app  ← important, must check this
  Email address:        your email

→ Agree to terms → Create
```

---

## Step 4 — Get your Channel ID and Secret

```
Your channel → Basic settings tab

Channel ID     → this is LINE_CHANNEL_ID
Channel secret → this is LINE_CHANNEL_SECRET
               → click Show to reveal
```

---

## Step 5 — Set the callback URL

```
Your channel → LINE Login tab → Callback URL

Add:
  https://your-app.vercel.app/api/auth/line/callback

For local testing add on a new line:
  http://localhost:YOUR_PORT/api/auth/line/callback

→ Update
```

Both URLs coexist in the same field — add each on a new line. The port comes from your `.env` — check the URL printed in Terminal when you run `npm run start:dev`.

---

## Step 6 — Apply for email permission (optional)

LINE does not return the user's email by default. You must apply separately.

```
Your channel → Basic settings tab
→ OpenID Connect → Email address permission → Apply
→ Agree to terms
→ Upload a screenshot explaining email collection to your users
   (a simple screen saying "We use your email to create your account" is enough)
→ Submit
```

Approval takes 1–3 business days. While waiting the app works fine — `email` will be `null` for LINE users and account linking falls back to provider ID matching only.

> Email permission requires a privacy policy URL set in your channel settings.

---

## Step 7 — Publish the channel

By default the channel is in development mode — only accounts listed as testers can log in.

To allow any LINE user:

```
Your channel → Basic settings tab
→ scroll to bottom
→ Channel status: Development → Published
→ Publish
```

While still in development mode, add test accounts:

```
Basic settings → Testers → Add testers
```

---

## Step 8 — Add environment variables

Local `.env`:

```bash
LINE_CHANNEL_ID=1234567890
LINE_CHANNEL_SECRET=abcdef1234567890abcdef1234567890
LINE_CALLBACK_URL=http://localhost:YOUR_PORT/api/auth/line/callback
```

Vercel dashboard → Settings → Environment Variables:

```
LINE_CHANNEL_ID      = 1234567890
LINE_CHANNEL_SECRET  = abcdef1234567890abcdef1234567890
LINE_CALLBACK_URL    = https://your-app.vercel.app/api/auth/line/callback
```

Redeploy after adding:

```bash
vercel --prod
```

---

## Step 9 — Test the flow

Open directly in your browser — OAuth redirects require a real browser, Swagger cannot test this route:

**Local:**

```
http://localhost:YOUR_PORT/api/auth/line
```

**Production:**

```
https://your-app.vercel.app/api/auth/line
```

After approving the consent screen you get JSON back:

```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "user": {
      "displayName": "Your LINE Name",
      "avatar": "https://profile.line-scdn.net/...",
      "providers": [{ "provider": "line" }]
    },
    "tokens": {
      "accessToken": "eyJ...",
      "refreshToken": "eyJ..."
    }
  },
  "timestamp": "2026-01-01T00:00:00.000Z"
}
```

Copy `accessToken` → Swagger → Authorize → test all protected routes.

---

## Account linking behaviour

| Scenario                                   | Result                                                 |
| ------------------------------------------ | ------------------------------------------------------ |
| New user, no existing account              | New user document created with LINE provider           |
| LINE email matches existing local account  | LINE provider linked — one document, two providers     |
| LINE email matches existing Google account | LINE provider linked — one document, three providers   |
| LINE user has no email                     | New user created with `email: null` — cannot auto-link |

---

## Common errors

| Error                           | Cause                                                 | Fix                                                            |
| ------------------------------- | ----------------------------------------------------- | -------------------------------------------------------------- |
| `400 Bad Request` on callback   | Callback URL mismatch                                 | Ensure URL in LINE Console exactly matches `LINE_CALLBACK_URL` |
| `Invalid client_id`             | Wrong `LINE_CHANNEL_ID`                               | Double check Channel ID in Basic settings                      |
| Blank screen after consent      | Channel in development, account not a tester          | Add yourself as tester or publish the channel                  |
| `email` is null                 | Permission not approved or user has no verified email | Apply for email permission in Basic settings                   |
| Works locally but not on Vercel | Env vars not set or old deployment                    | Check Vercel env vars and redeploy                             |
| `axios` not found               | Missing dependency                                    | `npm install axios`                                            |

---

## LINE vs Google — key differences

|                    | Google                    | LINE                                           |
| ------------------ | ------------------------- | ---------------------------------------------- |
| Passport package   | `passport-google-oauth20` | `passport-oauth2` (custom)                     |
| Profile fetch      | Built into strategy       | Manual `axios.get` to `api.line.me/v2/profile` |
| Email availability | Always returned           | Requires separate permission application       |
| User ID field      | `profile.id`              | `data.userId`                                  |
| Display name field | `profile.displayName`     | `data.displayName`                             |
| Avatar field       | `profile.photos[0].value` | `data.pictureUrl`                              |
| Popularity         | Global                    | Dominant in Thailand, Japan, Taiwan            |
