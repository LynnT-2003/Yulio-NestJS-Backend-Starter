import { PaymentPlanId } from '../enums/payment-plan.enum';

export interface IStripeCheckoutSession {
  url: string;
  sessionId: string;
}

export interface IBillingPortalSession {
  url: string;
}

export interface IUserPaymentState {
  stripeCustomerId: string | null;
  plan: PaymentPlanId;
  planExpiresAt: Date | null;
}