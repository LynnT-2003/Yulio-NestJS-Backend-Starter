# GitHub OAuth Setup

This guide covers setting up GitHub OAuth for this boilerplate.

> For environment variables and deployment — see **README.md**.

---

## Table of Contents

- [How GitHub Login works](#how-github-login-works)
- [Sequence Diagram](#sequence-diagram)
- [Step 1 — Create a GitHub OAuth App](#step-1--create-a-github-oauth-app)
- [Step 2 — Get Client ID and Secret](#step-2--get-client-id-and-secret)
- [Step 3 — Add environment variables](#step-3--add-environment-variables)
- [Step 4 — Test the flow](#step-4--test-the-flow)
- [Account linking behaviour](#account-linking-behaviour)
- [Common errors](#common-errors)

---

## How GitHub Login works

```
User clicks "Login with GitHub"
         │
         ▼
GET /api/auth/github
  → GithubGuard redirects to:
    https://github.com/login/oauth/authorize
    ?client_id=YOUR_CLIENT_ID
    &redirect_uri=YOUR_CALLBACK_URL
    &scope=user:email
         │
         ▼
User approves GitHub consent screen
         │
         ▼
GitHub redirects to:
GET /api/auth/github/callback?code=AUTHORIZATION_CODE
         │
         ▼
GithubCallbackGuard → GithubStrategy.validate()
  → passport-github2 exchanges code for access token
  → fetches profile automatically (no manual axios call needed)
  → picks primary verified email from emails array
  → normalize to OAuthUserDto
  → findOrCreateOAuthUser() — links to existing account if email matches
  → oauthLogin() — issues JWT access + refresh token pair
  → returns { user, tokens } to client
```

---

## Sequence Diagram

```
Client        AuthController    GithubStrategy     GitHub API      UserService     AuthService
  │                 │                │                 │                │               │
  │ GET /auth/github│                │                 │                │               │
  │────────────────▶│                │                 │                │               │
  │                 │  GithubGuard   │                 │                │               │
  │◀────────────────│  302 redirect  │                 │                │               │
  │                 │  → GitHub      │                 │                │               │
  │                 │                │                 │                │               │
  │  [User approves GitHub consent screen]             │                │               │
  │                 │                │                 │                │               │
  │ GET /auth/github/callback?code=..│                 │                │               │
  │────────────────▶│                │                 │                │               │
  │                 │ GithubCallback │                 │                │               │
  │                 │ Guard          │                 │                │               │
  │                 │───────────────▶│                 │                │               │
  │                 │                │ exchange code   │                │               │
  │                 │                │ fetch profile   │                │               │
  │                 │                │ (automatic)     │                │               │
  │                 │                │────────────────▶│                │               │
  │                 │                │◀────────────────│                │               │
  │                 │                │ { id, emails,   │                │               │
  │                 │                │   displayName,  │                │               │
  │                 │                │   photos }      │                │               │
  │                 │                │                 │                │               │
  │                 │                │ pick primary    │                │               │
  │                 │                │ verified email  │                │               │
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
  │                 │                │ oauthLogin(user)│                │               │
  │                 │                │───────────────────────────────────────────────▶ │
  │                 │                │                 │                │ generateTokens│
  │                 │                │◀──────────────────────────────────────────────  │
  │                 │                │                 │          IAuthResponse         │
  │                 │ req.user =     │                 │                │               │
  │                 │ IAuthResponse  │                 │                │               │
  │◀────────────────│                │                 │                │               │
  │ 200 { user,     │                │                 │                │               │
  │       tokens }  │                │                 │                │               │
```

---

## Step 1 — Create a GitHub OAuth App

```
github.com
→ top right avatar → Settings
→ left sidebar → Developer settings
→ OAuth Apps → New OAuth App

Fill in:
  Application name:      your app name
  Homepage URL:          https://your-app.vercel.app
  Authorization callback URL:
    https://your-app.vercel.app/api/auth/github/callback

→ Register application
```

> Do NOT enable Device Flow — that is for CLI tools, not web apps.

---

## Step 2 — Get Client ID and Secret

```
Your OAuth App page

Client ID      → copy immediately — this is GITHUB_CLIENT_ID
Client secrets → Generate a new client secret
               → copy immediately — this is GITHUB_CLIENT_SECRET
               → it will not be shown again
```

---

## Step 3 — Add environment variables

Local `.env`:

```bash
GITHUB_CLIENT_ID=your-client-id
GITHUB_CLIENT_SECRET=your-client-secret
GITHUB_CALLBACK_URL=https://your-app.vercel.app/api/auth/github/callback
```

Vercel dashboard → Settings → Environment Variables:

```
GITHUB_CLIENT_ID      = your-client-id
GITHUB_CLIENT_SECRET  = your-client-secret
GITHUB_CALLBACK_URL   = https://your-app.vercel.app/api/auth/github/callback
```

Redeploy:

```bash
vercel --prod
```

---

## Step 4 — Test the flow

Open directly in browser:

**Production:**

```
https://your-app.vercel.app/api/auth/github
```

After approving:

```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "user": {
      "displayName": "Your GitHub Name",
      "avatar": "https://avatars.githubusercontent.com/...",
      "providers": [{ "provider": "github" }]
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

| Scenario                                     | Result                                                 |
| -------------------------------------------- | ------------------------------------------------------ |
| New user, no existing account                | New user document created with GitHub provider         |
| GitHub email matches existing local account  | GitHub provider linked — one document, two providers   |
| GitHub email matches existing Google account | GitHub provider linked — one document, three providers |
| GitHub account has no public email           | New user created with `email: null`                    |

> GitHub users can hide their email. If `email` is null, account linking falls back to provider ID only. Encourage users to set a public email on their GitHub profile.

---

## Common errors

| Error                           | Cause                              | Fix                                                                  |
| ------------------------------- | ---------------------------------- | -------------------------------------------------------------------- |
| `redirect_uri_mismatch`         | Callback URL mismatch              | Ensure URL in GitHub OAuth App exactly matches `GITHUB_CALLBACK_URL` |
| `Bad credentials`               | Wrong Client ID or Secret          | Double check values in GitHub OAuth App settings                     |
| `email` is null                 | User has no public GitHub email    | Ask user to set public email in GitHub profile settings              |
| Works locally but not on Vercel | Env vars not set or old deployment | Check Vercel env vars and redeploy                                   |
