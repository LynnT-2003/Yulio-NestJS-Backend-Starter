# SMTP / Email Verification Setup

This app sends an email verification message after registration. The email is sent via **Nodemailer** using your SMTP provider (or any SMTP-compatible service).

---

## Required environment variables

These variables come from `.env.example` under **Mail Configuration (SMTP)**:

- `MAIL_HOST`
- `MAIL_PORT`
- `MAIL_USER`
- `MAIL_PASSWORD`
- `MAIL_FROM`
- `BASE_URL`

Optional:

- `COMPANY_NAME`
  - Used for branding in email subjects and the base email wrapper (defaults to `AuthForge`).
- `LOGO_URL`
  - Used in the base email wrapper header. Recommended to point to a publicly reachable image URL.
  - If you are hosting static assets from this API, you can use: `${BASE_URL}/assets/<your-image>`
- `VERIFY_REDIRECT_URL`
  - If set, `GET /api/auth/verify-email?token=...` will redirect the browser to this URL after verification.
  - If not set, it returns the default JSON success response.

---

## How the verification email works

1. Register via `POST /api/auth/register`
2. Backend stores a bcrypt-hashed verification token on the user
3. Backend sends an email containing:
   - A link to `GET /api/auth/verify-email?token=...`
   - The `verify-email` link is built using `BASE_URL`

The relevant link base in code is:

- `/api/auth/verify-email?token=${rawToken}`

If the user is already verified, the API will not resend another verification email.

---

## MailService overview (templates + methods)

Email HTML is built in two layers:

- A **base wrapper** (`baseEmailTemplate`) that provides a consistent header/content/footer layout
- A **content template** for each email type (verification, welcome, etc.)

The mail service exposes:

- `sendVerificationEmail(to, displayName, rawToken)`
  - Builds `verifyUrl` using `BASE_URL` and wraps `verificationEmailContent(displayName, verifyUrl)` with the base wrapper.
- `sendWelcomeEmail(to, displayName)`
  - Wraps `welcomeEmailContent(displayName)` with the base wrapper.
- `sendCustomEmail(to, subject, content)`
  - Pass **raw HTML content** (it will still be wrapped by the base template automatically).

---

## SMTP provider notes

- If you use **Gmail**, you typically need an **App Password** (and the correct OAuth/account settings).
- Some providers require `MAIL_PORT=465` (secure) while others use `587` (often `secure: false` in this template).

---

## Non-technical: where to get the SMTP values

Most email providers let you send mail “through SMTP” after you create SMTP credentials (or an App Password).
Pick your provider and follow the steps below.

### If you use Gmail (most common)

1. Sign in to the Google Account you want to send from.
2. Open **Security**.
3. Make sure **2-Step Verification** is enabled.
4. Go to **App passwords**.
5. Create a new app password (example name: “Dev server”).
6. Copy that generated value into your `.env` as `MAIL_PASSWORD`.
7. Set these env vars:
   - `MAIL_HOST`: `smtp.gmail.com`
   - `MAIL_PORT`: `587`
   - `MAIL_USER`: your Gmail address
   - `MAIL_FROM`: your sending email address (or the “From” identity your provider allows)

### If you use another SMTP provider (SendGrid, Brevo, Postmark, etc.)

1. Sign in to the provider dashboard.
2. Look for **SMTP settings**, **Email sending**, or **API/SMTP credentials**.
3. Copy:
   - SMTP Host
   - SMTP Port
   - Username (often the sending email)
   - Password / token (whatever the provider calls it)
4. Paste into:
   - `MAIL_HOST`
   - `MAIL_PORT`
   - `MAIL_USER`
   - `MAIL_PASSWORD`
5. Set `MAIL_FROM` to the email address configured in your provider for sending.

### `BASE_URL` (where your backend lives)

- Local dev: `BASE_URL=http://localhost:8080`
- Production (Vercel): `BASE_URL=https://<your-vercel-domain>`

This is used to build the verification link that gets emailed.

### `VERIFY_REDIRECT_URL` (optional)

If you want the browser to redirect after verification, set:

- `VERIFY_REDIRECT_URL=https://your-frontend-domain/verify-email`

If you omit it, the endpoint returns the default JSON success response instead of redirecting.

---
## Quick local test checklist

1. Copy env:
   - `cp .env.example .env`
2. Set the SMTP variables listed above
3. Start the server:
   - `npm run start:dev`
4. Register a new account and confirm the verification email arrives

---

## Common mistakes

- `BASE_URL` does not match the URL where you deployed your API
- SMTP credentials are incorrect or your provider blocks sign-in from this server
- `MAIL_FROM` must be accepted by your SMTP provider

