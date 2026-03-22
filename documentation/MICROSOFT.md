# Microsoft OAuth Setup

This guide covers setting up Microsoft OAuth for this boilerplate.

> For environment variables and deployment — see **README.md**.

---

## Table of Contents

- [How Microsoft Login works](#how-microsoft-login-works)
- [Sequence Diagram](#sequence-diagram)
- [Step 1 — Create an Azure App Registration](#step-1--create-an-azure-app-registration)
- [Step 2 — Get Client ID and Secret](#step-2--get-client-id-and-secret)
- [Step 3 — Add environment variables](#step-3--add-environment-variables)
- [Step 4 — Test the flow](#step-4--test-the-flow)
- [Account linking behaviour](#account-linking-behaviour)
- [Common errors](#common-errors)
- [Microsoft-specific notes](#microsoft-specific-notes)

---

## How Microsoft Login works

```
User clicks "Login with Microsoft"
         │
         ▼
GET /api/auth/microsoft
  → MicrosoftGuard redirects to:
    https://login.microsoftonline.com/common/oauth2/v2.0/authorize
    ?client_id=YOUR_CLIENT_ID
    &redirect_uri=YOUR_CALLBACK_URL
    &scope=user.read
         │
         ▼
User approves Microsoft consent screen
         │
         ▼
Microsoft redirects to:
GET /api/auth/microsoft/callback?code=AUTHORIZATION_CODE
         │
         ▼
MicrosoftCallbackGuard → MicrosoftStrategy.validate()
  → passport-microsoft exchanges code for access token
  → fetches profile automatically
  → checks email in three possible locations
  → normalize to OAuthUserDto
  → findOrCreateOAuthUser() — links to existing account if email matches
  → oauthLogin() — issues JWT access + refresh token pair
  → returns { user, tokens } to client
```

**Note:** The actual HTTP response is wrapped by `TransformInterceptor`:

```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "user": { /* IUserPublic */ },
    "tokens": { "accessToken": "...", "refreshToken": "..." }
  },
  "timestamp": "2026-03-22T00:00:00.000Z"
}
```

---

## Sequence Diagram

```
Client        AuthController  MicrosoftStrategy  Microsoft API   UserService     AuthService
  │                 │                │                │                │               │
  │ GET /auth/      │                │                │                │               │
  │ microsoft       │                │                │                │               │
  │────────────────▶│                │                │                │               │
  │                 │ MicrosoftGuard │                │                │               │
  │◀────────────────│ 302 redirect   │                │                │               │
  │                 │ → Microsoft    │                │                │               │
  │                 │                │                │                │               │
  │  [User approves Microsoft consent screen]         │                │               │
  │                 │                │                │                │               │
  │ GET /auth/microsoft/callback?code│                │                │               │
  │────────────────▶│                │                │                │               │
  │                 │ Microsoft      │                │                │               │
  │                 │ CallbackGuard  │                │                │               │
  │                 │───────────────▶│                │                │               │
  │                 │                │ exchange code  │                │               │
  │                 │                │ fetch profile  │                │               │
  │                 │                │ (automatic)    │                │               │
  │                 │                │───────────────▶│                │               │
  │                 │                │◀───────────────│                │               │
  │                 │                │ { id,          │                │               │
  │                 │                │   displayName, │                │               │
  │                 │                │   emails,      │                │               │
  │                 │                │   _json.mail,  │                │               │
  │                 │                │   _json.upn }  │                │               │
  │                 │                │                │                │               │
  │                 │                │ check email in │                │               │
  │                 │                │ 3 locations    │                │               │
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

## Step 1 — Create an Azure App Registration

```
portal.azure.com
→ sign in with your Microsoft account
→ search "App registrations" → click it
→ New registration

Fill in:
  Name: your app name
  Supported account types:
    ✓ Any Entra ID Tenant + Personal Microsoft accounts
      (allows both Outlook/Hotmail AND work/school Office 365 accounts)
  Redirect URI:
    Platform: Web
    URL: https://your-app.vercel.app/api/auth/microsoft/callback

→ Register
```

---

## Step 2 — Get Client ID and Secret

**Client ID:**

```
Your app → Overview tab
  Application (client) ID  → this is MICROSOFT_CLIENT_ID
```

**Client Secret:**

```
Your app → Certificates & secrets tab
  → Client secrets → New client secret
  → Description: nestjs-auth
  → Expires: 24 months
  → Add
  → Copy the VALUE column immediately
    → this is MICROSOFT_CLIENT_SECRET
    → it will not be shown again after you leave the page
```

> Copy the **Value**, not the **Secret ID**. They look similar but are different fields.

---

## Step 3 — Add environment variables

Local `.env`:

```bash
MICROSOFT_CLIENT_ID=your-client-id
MICROSOFT_CLIENT_SECRET=your-client-secret
MICROSOFT_CALLBACK_URL=https://your-app.vercel.app/api/auth/microsoft/callback
```

Vercel dashboard → Settings → Environment Variables:

```
MICROSOFT_CLIENT_ID      = your-client-id
MICROSOFT_CLIENT_SECRET  = your-client-secret
MICROSOFT_CALLBACK_URL   = https://your-app.vercel.app/api/auth/microsoft/callback
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
https://your-app.vercel.app/api/auth/microsoft
```

After approving:

```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "user": {
      "displayName": "Your Microsoft Name",
      "avatar": null,
      "providers": [{ "provider": "microsoft" }]
    },
    "tokens": {
      "accessToken": "eyJ...",
      "refreshToken": "eyJ..."
    }
  },
  "timestamp": "..."
}
```

> `avatar` is always `null` for Microsoft — see [Microsoft-specific notes](#microsoft-specific-notes).

Copy `accessToken` → Swagger → Authorize → test protected routes.

---

## Account linking behaviour

| Scenario                                        | Result                                                    |
| ----------------------------------------------- | --------------------------------------------------------- |
| New user, no existing account                   | New user document created with Microsoft provider         |
| Microsoft email matches existing local account  | Microsoft provider linked — one document, two providers   |
| Microsoft email matches existing Google account | Microsoft provider linked — one document, three providers |
| Work account with no resolvable email           | New user created with `email: null`                       |

---

## Common errors

| Error                           | Cause                                | Fix                                                             |
| ------------------------------- | ------------------------------------ | --------------------------------------------------------------- |
| `redirect_uri_mismatch`         | Callback URL not registered in Azure | Add URL under App registration → Authentication → Redirect URIs |
| `AADSTS700054`                  | Response type not enabled            | App registration → Authentication → enable ID tokens            |
| `invalid_client`                | Wrong Client ID or Secret            | Double check values in Azure portal                             |
| Client secret expired           | Secret has a 24 month expiry         | Certificates & secrets → create new secret → update env var     |
| Works locally but not on Vercel | Env vars not set or old deployment   | Check Vercel env vars and redeploy                              |

---

## Microsoft-specific notes

**No avatar** — Microsoft Graph API requires a separate authenticated call to retrieve the user's profile photo. This is not included in the basic OAuth flow. `avatar` will always be `null` for Microsoft users. Can be added later with a Graph API call if needed.

**Email resolution** — Microsoft returns email in three different places depending on account type. The strategy checks all three in order:

```
1. profile.emails[0].value       ← standard passport field
2. profile._json.mail            ← work/school accounts (Exchange email)
3. profile._json.userPrincipalName ← fallback (usually in email format)
```

**Account types** — `tenant: 'common'` in the strategy allows:

- Personal accounts: Outlook.com, Hotmail.com, Live.com
- Work/school accounts: Office 365, Azure AD

**TypeScript types** — `passport-microsoft` has no official `@types` package. A minimal declaration file is included at `src/modules/auth/types/passport-microsoft.d.ts` to keep the strategy code clean and consistent with other providers.

**Client secret expiry** — Azure client secrets expire. The default is 24 months. Set a reminder to rotate the secret before it expires — an expired secret will break Microsoft login silently.
