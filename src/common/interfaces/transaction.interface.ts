import { PaymentPlanId } from '../enums/payment-plan.enum';

export type TransactionType =
  | 'one_time_purchase'
  | 'subscription_created'
  | 'subscription_renewed'
  | 'subscription_cancelled';

export type TransactionStatus = 'succeeded' | 'failed' | 'refunded';

export interface ITransaction {
  userId: string;
  stripeEventId: string;
  stripeCustomerId: string;
  type: TransactionType;
  plan: PaymentPlanId;
  amount: number;
  currency: string;
  status: TransactionStatus;
  createdAt: Date;
  updatedAt: Date;
}