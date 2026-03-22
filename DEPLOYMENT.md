# NestJS Auth Boilerplate

Production-ready authentication boilerplate built on NestJS, MongoDB, and Passport.js. Designed as a reusable foundation for client projects — clone, configure environment variables, deploy in minutes.

Built with one goal: **never write auth again.**

> **Free to deploy. Ships in minutes. Runs on Vercel.**

---

## Why this exists

Most projects spend the first two weeks building the same auth system. Local login, Google OAuth, token refresh, role guards, response shaping — the same code, over and over, every project.

This boilerplate kills that permanently. Clone it, drop in your environment variables, push to Vercel. Done. Free tier. No servers. No DevOps.

---

## What's included

### Vercel-native serverless — deploy free in minutes

Built specifically for Vercel from day one. Not an afterthought. Not a wrapper.

- Cached app instance — cold starts under 600ms
- Stateless OAuth flows — no session storage needed
- Exported handler — Vercel picks it up automatically
- Push to main → live in 30 seconds

```
git clone → fill .env → vercel --prod → shipped
```

**Free tier. Zero infrastructure. Zero cost to start.**

### Multi-provider OAuth — plug and play

Six authentication providers out of the box. Enable only what your client needs — each provider is a self-contained strategy file. Adding a new one takes 30 minutes.

| Provider                 | Package                    | Status                                        |
| ------------------------ | -------------------------- | --------------------------------------------- |
| Local (email + password) | `passport-local`           | ✓ Always on                                   |
| Google                   | `passport-google-oauth20`  | ✓ Ready                                       |
| LINE                     | `passport-oauth2` (custom) | ✓ Ready — dominant in Thailand, Japan, Taiwan |
| GitHub                   | `passport-github2`         | ✓ Ready                                       |
| Discord                  | `passport-discord`         | ✓ Ready                                       |
| Microsoft                | `passport-microsoft`       | ✓ Ready                                       |

To disable a provider — comment out its strategy and routes. That's it.

### Account linking — one identity, zero duplicates

The hardest part of multi-provider auth. Solved.

If a user signs up with email/password and later logs in with Google using the same email — they get one account, not two. Providers are automatically linked to the same identity.

```json
{
  "providers": ["local", "google", "github"],
  "providerDetails": [
    { "provider": "local", "connectedAt": "2026-01-10T08:00:00.000Z" },
    { "provider": "google", "connectedAt": "2026-02-14T12:30:00.000Z" },
    { "provider": "github", "connectedAt": "2026-03-22T09:15:00.000Z" }
  ]
}
```

### Swagger UI — fully documented, always in sync

Every endpoint is documented. Every request and response schema is typed end to end — not hand-written JSON, not copy-pasted examples. Response DTOs implement TypeScript interfaces directly so docs never drift from reality.

- Grouped by provider — Auth Local, Auth Google, Auth LINE, etc.
- Bearer auth built in — paste your token once, test everything
- Live at `/api/docs` — works locally and on Vercel

### JWT token rotation — production security

- **Access token** — short-lived (15m), stateless, verified on every request
- **Refresh token** — long-lived (30d), stored as bcrypt hash in MongoDB, rotated on every use
- **Automatic cleanup** — expired tokens pruned from the database on every save
- **Logout everywhere** — invalidate all refresh tokens in one call

### Clean architecture — built to scale

Every layer has a defined contract. Services implement interfaces. DTOs validate input. Controllers do nothing except call services.

```
Enum → Interface → Entity → DTO → Service Interface → Service → Controller → Module
```

Adding a new feature means following the same pattern. Nothing to invent.

### Global response shape — consistent by default

Every response from every endpoint is automatically wrapped:

```json
{
  "success": true,
  "statusCode": 200,
  "data": {},
  "timestamp": "2026-03-22T09:15:00.000Z"
}
```

Errors too:

```json
{
  "success": false,
  "statusCode": 401,
  "message": "Invalid email or password",
  "path": "/api/auth/login",
  "timestamp": "2026-03-22T09:15:00.000Z"
}
```

No manual wrapping. No inconsistent error shapes. Every client gets the same contract.

### Role-based access control — ready to use

```typescript
@Roles(UserRole.ADMIN)
@Get('admin/dashboard')
getAdminDashboard(@CurrentUser() user: ICurrentUser) { }
```

Two decorators. That's it.

---

## Stack

| Layer          | Technology                                                    |
| -------------- | ------------------------------------------------------------- |
| Framework      | NestJS 11                                                     |
| Language       | TypeScript 5                                                  |
| Database       | MongoDB via Mongoose                                          |
| Authentication | Passport.js — local, Google, LINE, GitHub, Discord, Microsoft |
| Token strategy | JWT access (15m) + refresh token rotation (30d)               |
| Validation     | class-validator + class-transformer                           |
| API docs       | Swagger (OpenAPI 3.0) — typed, grouped, always in sync        |
| Deployment     | Vercel (serverless) — free tier, zero config                  |

## Troubleshooting

### Build Fails

- Check that all dependencies are in `dependencies` (not `devDependencies`)
- Ensure TypeScript compiles locally: `npm run build`

### 500 Internal Server Error

- Check Vercel function logs in the dashboard
- Verify all environment variables are set correctly
- Check that Firebase credentials are valid

### CORS Errors

- Ensure `FRONTEND_URL` is set to your frontend domain
- Check that frontend is sending requests to the correct backend URL
- Verify that requests include proper headers

### Swagger Not Loading

- Check that the route `/api/docs` is accessible
- Verify that Swagger dependencies are installed
- Check Vercel function logs for errors

## Updating Your Deployment

### Automatic Deployments (GitHub Integration)

Once linked to GitHub, Vercel will automatically deploy:

- **Production**: Every push to `main` branch
- **Preview**: Every pull request

### Manual Deployments

```bash
vercel --prod
```

## Vercel Configuration

The `vercel.json` file configures:

- Build source: `src/main.ts`
- Runtime: `@vercel/node`
- Routing: All requests to main.ts
- Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS

## Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [NestJS Documentation](https://docs.nestjs.com)
- [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)

## Support

For issues specific to:

- **Vercel deployment**: Check [Vercel Support](https://vercel.com/support)
- **NestJS**: See [NestJS Discord](https://discord.gg/nestjs)
- **Firebase**: Visit [Firebase Support](https://firebase.google.com/support)
