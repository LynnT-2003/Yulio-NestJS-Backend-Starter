# Stripe Payments Setup

This guide walks you through configuring Stripe from zero — dashboard, price IDs, webhook, environment variables, and production checklist.

---

## What this template gives you

| Feature | Detail |
|---------|--------|
| Checkout sessions | Subscription and one-time payment, auto-detects mode from price type |
| Billing portal | Let users upgrade, downgrade, and cancel themselves |
| Webhook handling | Signature-verified, idempotent, three events handled out of the box |
| Transaction log | Every payment event written to MongoDB (`transactions` collection) |
| Plan enforcement | `@RequiresPlan()` decorator — one line to lock any route to a plan tier |
| Lifetime protection | Lifetime users are never downgraded by cancellation webhooks |

---

## Step 1 — Create a Stripe account

Go to [dashboard.stripe.com](https://dashboard.stripe.com) and sign up. You start in **Test mode** — no real money moves until you activate your account.

---

## Step 2 — Get your secret key

1. In the Stripe dashboard, click **Developers** → **API keys**
2. Copy the **Secret key** — it starts with `sk_test_...` in test mode

```env
STRIPE_SECRET_KEY=sk_test_...
```

> Never commit this. Never expose it to the frontend.

---

## Step 3 — Create your products and prices

Each plan needs a **Price ID**. This is what you pass to `POST /api/payment/checkout`.

### Create the PRO plan (subscription)

1. Dashboard → **Product catalog** → **Add product**
2. Name it (e.g. `Pro Plan`)
3. Under **Pricing**, choose **Recurring** → set your price (e.g. $19/month)
4. Click **Save product**
5. On the product page, copy the **Price ID** — it starts with `price_...`

```env
STRIPE_PRICE_ID_PRO=price_...
```

### Create the LIFETIME plan (one-time)

1. Dashboard → **Product catalog** → **Add product**
2. Name it (e.g. `Lifetime Access`)
3. Under **Pricing**, choose **One time** → set your price (e.g. $299)
4. Click **Save product**
5. Copy the **Price ID**

```env
STRIPE_PRICE_ID_LIFETIME=price_...
```

---

## Step 4 — Configure the webhook

The webhook is how Stripe tells your server about payments. It must receive the **raw request body** — the template handles this automatically via `rawBody: true` in `main.ts`.

### Local development (Stripe CLI)

Install the [Stripe CLI](https://stripe.com/docs/stripe-cli):

```bash
# macOS
brew install stripe/stripe-cli/stripe

# Or download from https://github.com/stripe/stripe-cli/releases
```

Login and forward events to your local server:

```bash
stripe login
stripe listen --forward-to localhost:8080/api/payment/webhook
```

The CLI prints your webhook signing secret:

```
> Ready! Your webhook signing secret is whsec_... (^C to quit)
```

Copy it:

```env
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Production (Stripe dashboard)

1. Dashboard → **Developers** → **Webhooks** → **Add endpoint**
2. Endpoint URL: `https://your-app.vercel.app/api/payment/webhook`
3. Select events to listen for:
   - `checkout.session.completed`
   - `invoice.paid`
   - `customer.subscription.deleted`
4. Click **Add endpoint**
5. On the endpoint page → **Signing secret** → **Reveal** → copy it

```env
STRIPE_WEBHOOK_SECRET=whsec_...
```

---

## Step 5 — Fill in `.env`

```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID_PRO=price_...
STRIPE_PRICE_ID_LIFETIME=price_...
```

---

## Step 6 — Test the flow locally

With `stripe listen` running, start your dev server:

```bash
npm run start:dev
```

### Trigger a test checkout

```bash
curl -X POST http://localhost:8080/api/payment/checkout \
  -H "Authorization: Bearer <your_access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "priceId": "price_...",
    "successUrl": "http://localhost:3000/success",
    "cancelUrl": "http://localhost:3000/cancel"
  }'
```

Returns `{ url, sessionId }`. Open the `url` in a browser — use Stripe test card `4242 4242 4242 4242`, any future expiry, any CVC.

After completing the checkout, Stripe CLI forwards the `checkout.session.completed` and `invoice.paid` events. Check your server logs — you should see:

```
Processing webhook: checkout.session.completed
Processing webhook: invoice.paid
User <id> → pro, expires <date>
```

### Trigger a subscription cancellation

```bash
stripe trigger customer.subscription.deleted
```

User plan drops back to `free`.

### Check the transaction log

```bash
curl http://localhost:8080/api/payment/plan \
  -H "Authorization: Bearer <your_access_token>"
```

Returns:

```json
{
  "stripeCustomerId": "cus_...",
  "plan": "pro",
  "planExpiresAt": "2026-05-18T00:00:00.000Z"
}
```

---

## Payment modes — one-time vs subscription

This template supports two distinct payment modes. The mode is **auto-detected** from the Stripe price type — you never set it manually.

### One-time payment (e.g. Lifetime plan)

The Stripe price is set to **One time** in the dashboard.

**What the user experiences:**
1. Hits your checkout endpoint → gets a URL → pays once
2. Plan is upgraded immediately and permanently
3. `planExpiresAt` is `null` — access never expires
4. Billing portal is available but has nothing to manage (no subscription)
5. Cancelling nothing does nothing — `customer.subscription.deleted` never fires for one-time purchases

**What fires on Stripe:**
```
checkout.session.completed   ← only event
```

**What the code does:**
```
onCheckoutCompleted (mode === 'payment')
  → list line items → get priceId → map to LIFETIME plan
  → write transaction (one_time_purchase)
  → user.plan = LIFETIME, user.planExpiresAt = null
```

---

### Subscription (e.g. Pro plan)

The Stripe price is set to **Recurring** in the dashboard.

**What the user experiences:**
1. Hits checkout → pays → plan activated
2. Billed automatically every month/year — no action needed
3. `planExpiresAt` updates automatically on each renewal
4. Can manage, upgrade, downgrade, or cancel via the billing portal
5. On cancellation — plan drops back to FREE at the end of the billing period

**What fires on Stripe:**
```
checkout.session.completed   ← once, on initial purchase
invoice.paid                 ← immediately after checkout, then on every renewal
customer.subscription.deleted ← when the subscription is cancelled
```

**What the code does:**

`onCheckoutCompleted` (mode === `subscription`):
```
→ saves stripeCustomerId on user
→ exits — does NOT touch plan
   (plan is intentionally handled by onInvoicePaid only)
```

`onInvoicePaid` (fires on first payment AND every renewal):
```
→ find user by stripeCustomerId
  (fallback: invoice.parent.subscription_details.metadata.userId
   in case invoice.paid arrives before checkout.session.completed)
→ get priceId from invoice line item
→ write transaction (subscription_created or subscription_renewed)
→ user.plan = PRO
→ user.planExpiresAt = billing period end date
```

`onSubscriptionDeleted`:
```
→ find user by stripeCustomerId
→ skip entirely if user.plan === LIFETIME (can't be downgraded)
→ write transaction (subscription_cancelled)
→ user.plan = FREE, user.planExpiresAt = null
```

**Why plan state lives in `onInvoicePaid` and not `onCheckoutCompleted`:**

`checkout.session.completed` only fires once — on the initial purchase. Monthly renewals do **not** fire it again. `invoice.paid` fires on both the first payment and every renewal. Handling plan state only in `onInvoicePaid` means one handler covers the entire subscription lifecycle with no special cases.

**Race condition protection:**

Stripe does not guarantee event delivery order. If `invoice.paid` arrives before `checkout.session.completed` has had a chance to save `stripeCustomerId`, the primary `findOne({ stripeCustomerId })` returns null. The fallback uses `invoice.parent.subscription_details.metadata.userId`, which is set on the subscription itself via `subscription_data: { metadata: { userId } }` at checkout creation time — so the user is always found regardless of event order.

---

## Plan enforcement

Lock any route to a minimum plan tier:

```typescript
import { RequiresPlan } from '../common/decorators/plan.decorator';
import { PaymentPlanId } from '../common/enums/payment-plan.enum';

@RequiresPlan(PaymentPlanId.PRO)
@Get('pro-feature')
getProFeature(@CurrentUser() user: ICurrentUser) {
  // Only PRO and LIFETIME users reach here
}

@RequiresPlan(PaymentPlanId.LIFETIME)
@Get('lifetime-feature')
getLifetimeFeature(@CurrentUser() user: ICurrentUser) {
  // Only LIFETIME users reach here
}
```

`PlanGuard` is registered globally — no module changes needed. It checks:
1. Is there a `@RequiresPlan()` on this route? If not, passes through.
2. Is the subscription expired? If yes, throws `403 Your subscription has expired`.
3. Is the user's plan rank sufficient? If not, throws `403 This feature requires the pro plan`.

Lifetime users bypass the expiry check entirely.

> **Performance note:** `PlanGuard` hits MongoDB on every request to a `@RequiresPlan()` route to get the latest `plan` and `planExpiresAt`. This guarantees accuracy — a cancelled subscription is reflected immediately without waiting for a token refresh. The trade-off is one extra DB read per guarded request. For high-traffic routes, you can move `plan` and `planExpiresAt` into the JWT payload and refresh them on token rotation — the guard then reads from the token instead. As-is, the DB approach is correct and simple for most SaaS scales.

---

## Webhook events handled

| Event | When it fires | What the handler does |
|-------|--------------|----------------------|
| `checkout.session.completed` | Once — on any completed checkout | Saves `stripeCustomerId`. For one-time payments: also upgrades plan and writes transaction. For subscriptions: exits after saving customer ID — plan handled by `invoice.paid`. |
| `invoice.paid` | Immediately after subscription checkout, then on every renewal | Upgrades plan, sets `planExpiresAt` to billing period end, writes transaction (`subscription_created` or `subscription_renewed`). Handles race condition via metadata fallback. |
| `customer.subscription.deleted` | When subscription is cancelled (at period end) | Downgrades plan to `FREE`, clears `planExpiresAt`, writes transaction. **Lifetime users are never touched.** |

**Idempotency:** every event is checked against `stripeEventId` in the `transactions` collection before processing. If the event was already handled (Stripe retry or duplicate delivery), it is silently skipped. The unique index on `stripeEventId` is the DB-level safety net.

---

## Production checklist

- [ ] Switch Stripe to **Live mode** — replace `sk_test_...` with `sk_live_...`
- [ ] Create a **live webhook endpoint** pointing to your production URL
- [ ] Copy the **live webhook signing secret** (`whsec_...`) into your production env vars
- [ ] Create **live price IDs** (separate from test price IDs) and update `STRIPE_PRICE_ID_PRO` / `STRIPE_PRICE_ID_LIFETIME`
- [ ] Set all four Stripe env vars in Vercel → **Settings** → **Environment Variables**
- [ ] Verify `STRIPE_WEBHOOK_SECRET` in production matches the live endpoint secret (not the CLI secret)
- [ ] Activate your Stripe account (fill in business details) before going live

---

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `400 Invalid webhook signature` | Wrong `STRIPE_WEBHOOK_SECRET` | For local: use the secret from `stripe listen`. For prod: use the secret from the dashboard endpoint page |
| `400 Invalid webhook signature` | JSON body parser ran before the webhook | Ensure `rawBody: true` is in `NestFactory.create` — already set in this template |
| Plan not updated after checkout | Webhook not forwarded | Run `stripe listen --forward-to localhost:8080/api/payment/webhook` |
| `503` on checkout | `STRIPE_SECRET_KEY` missing or empty | Check `.env` and restart the server |
| Duplicate transaction error | Stripe retried an event already processed | Expected behavior — `existsByStripeEventId` returns `true`, event is skipped |
| User still on `free` after paying | `checkout.session.completed` mode was `subscription` | Correct — plan is set by `invoice.paid`, which fires immediately after. Check both events in CLI output |
