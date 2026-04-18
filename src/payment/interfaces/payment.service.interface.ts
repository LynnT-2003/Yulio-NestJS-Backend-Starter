import {
  IStripeCheckoutSession,
  IBillingPortalSession,
  IUserPaymentState,
} from '../../common/interfaces/payment.interface';

export interface IPaymentService {
  createCheckoutSession(
    userId: string,
    priceId: string,
    successUrl: string,
    cancelUrl: string,
  ): Promise<IStripeCheckoutSession>;

  createBillingPortalSession(
    userId: string,
    returnUrl: string,
  ): Promise<IBillingPortalSession>;

  getUserPlan(userId: string): Promise<IUserPaymentState>;

  handleWebhook(payload: Buffer, signature: string): Promise<void>;
}