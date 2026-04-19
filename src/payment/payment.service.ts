import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import Stripe from 'stripe';
import type { Event as StripeEvent } from 'stripe/cjs/resources/Events.js';
import type { Invoice as StripeInvoice } from 'stripe/cjs/resources/Invoices.js';
import type { Subscription as StripeSubscription } from 'stripe/cjs/resources/Subscriptions.js';
import type { Session as StripeCheckoutSession } from 'stripe/cjs/resources/Checkout/Sessions.js';
import { IPaymentService } from './interfaces/payment.service.interface';
import {
  IStripeCheckoutSession,
  IBillingPortalSession,
  IUserPaymentState,
} from '../common/interfaces/payment.interface';
import { PaymentPlanId } from '../common/enums/payment-plan.enum';
import { User, UserDocument } from '../user/entity/user.entity';
import { TransactionService } from './transaction.service';

@Injectable()
export class PaymentService implements IPaymentService {
  private readonly stripe: ReturnType<typeof Stripe>;
  private readonly logger = new Logger(PaymentService.name);
  private readonly priceIdToPlan: Record<string, PaymentPlanId>;

  constructor(
    private readonly config: ConfigService,
    private readonly transactionService: TransactionService,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {
    const stripeSecretKey = this.config.get<string>('STRIPE_SECRET_KEY')?.trim();
    if (!stripeSecretKey) throw new Error('STRIPE_SECRET_KEY is not configured');

    this.stripe = Stripe(stripeSecretKey);



    const proPriceId = this.config.get<string>('STRIPE_PRICE_PRO_MONTHLY')?.trim() ?? '';
    const lifetimePriceId = this.config.get<string>('STRIPE_PRICE_LIFETIME')?.trim() ?? '';
    this.priceIdToPlan = {
      [proPriceId]: PaymentPlanId.PRO,
      [lifetimePriceId]: PaymentPlanId.LIFETIME,
    };
  }

  // ── Checkout ───────────────────────────────────────────────────────────────

  async createCheckoutSession(
    userId: string,
    priceId: string,
    successUrl: string,
    cancelUrl: string,
  ): Promise<IStripeCheckoutSession> {
    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    const customerId = await this.resolveCustomerId(user);

    const price = await this.stripe.prices.retrieve(priceId);
    const mode = (price.type === 'recurring' ? 'subscription' : 'payment') as 'subscription' | 'payment';

    const session = await this.stripe.checkout.sessions.create({
      customer: customerId,
      mode,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { userId },
      subscription_data: mode === 'subscription' ? { metadata: { userId } } : undefined,
    });

    if (!session.url) throw new BadRequestException('Checkout session has no URL');
    return { url: session.url, sessionId: session.id };
  }

  // ── Billing portal ─────────────────────────────────────────────────────────

  async createBillingPortalSession(
    userId: string,
    returnUrl: string,
  ): Promise<IBillingPortalSession> {
    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    if (!user.stripeCustomerId) {
      throw new BadRequestException(
        'No billing account found. Complete a purchase first.',
      );
    }

    const session = await this.stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: returnUrl,
    });

    return { url: session.url };
  }

  // ── Plan status ────────────────────────────────────────────────────────────

  async getUserPlan(userId: string): Promise<IUserPaymentState> {
    const user = await this.userModel
      .findById(userId)
      .select('stripeCustomerId plan planExpiresAt');
    if (!user) throw new NotFoundException('User not found');

    return {
      stripeCustomerId: user.stripeCustomerId,
      plan: user.plan,
      planExpiresAt: user.planExpiresAt,
    };
  }

  // ── Webhook ────────────────────────────────────────────────────────────────

  async handleWebhook(payload: Buffer, signature: string): Promise<void> {
    let event: StripeEvent;

    try {
      event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        this.config.get<string>('STRIPE_WEBHOOK_SECRET')!,
      ) as StripeEvent;
    } catch (err) {
      this.logger.warn(`Webhook signature verification failed: ${err.message}`);
      throw new BadRequestException('Invalid webhook signature');
    }

    const alreadyProcessed = await this.transactionService.existsByStripeEventId(event.id);
    if (alreadyProcessed) {
      this.logger.log(`Skipping duplicate event: ${event.id}`);
      return;
    }

    this.logger.log(`Processing webhook: ${event.type}`);

    switch (event.type) {
      case 'checkout.session.completed':
        await this.onCheckoutCompleted(event.data.object as StripeCheckoutSession, event.id);
        break;
      case 'invoice.paid':
        await this.onInvoicePaid(event.data.object as StripeInvoice, event.id);
        break;
      case 'customer.subscription.deleted':
        await this.onSubscriptionDeleted(event.data.object as StripeSubscription, event.id);
        break;
      default:
        this.logger.debug(`Unhandled event type: ${event.type}`);
    }
  }

  // ── Private handlers ───────────────────────────────────────────────────────

  private async onCheckoutCompleted(
    session: StripeCheckoutSession,
    eventId: string,
  ): Promise<void> {
    const userId = session.metadata?.userId;
    if (!userId) return;

    const user = await this.userModel.findById(userId);
    if (!user) return;

    if (!user.stripeCustomerId && session.customer) {
      user.stripeCustomerId = session.customer as string;
      await user.save();
    }

    if (session.mode === 'payment') {
      const lineItems = await this.stripe.checkout.sessions.listLineItems(session.id);
      const priceId = lineItems.data[0]?.price?.id ?? '';
      const plan = this.priceIdToPlan[priceId] ?? PaymentPlanId.FREE;
      const amount = session.amount_total ?? 0;
      const currency = session.currency ?? 'usd';

      await this.transactionService.create({
        userId,
        stripeEventId: eventId,
        stripeCustomerId: user.stripeCustomerId!,
        type: 'one_time_purchase',
        plan,
        amount,
        currency,
        status: 'succeeded',
      });

      user.plan = plan;
      user.planExpiresAt = null;
      await user.save();

      this.logger.log(`User ${userId} upgraded to ${plan} (one-time)`);
    }
  }

  private async onInvoicePaid(
    invoice: StripeInvoice,
    eventId: string,
  ): Promise<void> {
    const customerId = invoice.customer as string;
    if (!customerId) return;

    let user = await this.userModel.findOne({ stripeCustomerId: customerId });

    if (!user) {
      const userId = invoice.parent?.subscription_details?.metadata?.['userId'];
      if (userId) user = await this.userModel.findById(userId);
    }

    if (!user) return;

    const priceRef = invoice.lines?.data?.[0]?.pricing?.price_details?.price;
    const priceId = typeof priceRef === 'object' && priceRef !== null ? priceRef.id : (priceRef ?? '');
    const plan = this.priceIdToPlan[priceId] ?? user.plan;
    const periodEnd = invoice.lines?.data?.[0]?.period?.end;
    const amount = invoice.amount_paid ?? 0;
    const currency = invoice.currency ?? 'usd';
    const isNew = user.plan === PaymentPlanId.FREE;

    await this.transactionService.create({
      userId: String(user._id),
      stripeEventId: eventId,
      stripeCustomerId: customerId,
      type: isNew ? 'subscription_created' : 'subscription_renewed',
      plan,
      amount,
      currency,
      status: 'succeeded',
    });

    user.plan = plan;
    user.planExpiresAt = periodEnd ? new Date(periodEnd * 1000) : null;
    await user.save();

    this.logger.log(`User ${user._id} → ${plan}, expires ${user.planExpiresAt?.toISOString()}`);
  }

  private async onSubscriptionDeleted(
    subscription: StripeSubscription,
    eventId: string,
  ): Promise<void> {
    const customerId = subscription.customer as string;

    const user = await this.userModel.findOne({ stripeCustomerId: customerId });
    if (!user) return;

    if (user.plan === PaymentPlanId.LIFETIME) return;

    const previousPlan = user.plan;
    user.plan = PaymentPlanId.FREE;
    user.planExpiresAt = null;
    await user.save();

    await this.transactionService.create({
      userId: String(user._id),
      stripeEventId: eventId,
      stripeCustomerId: customerId,
      type: 'subscription_cancelled',
      plan: previousPlan,
      amount: 0,
      currency: 'usd',
      status: 'succeeded',
    });

    this.logger.log(`User ${user._id} downgraded to free`);
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private async resolveCustomerId(user: UserDocument): Promise<string> {
    if (user.stripeCustomerId) return user.stripeCustomerId;

    const customer = await this.stripe.customers.create({
      email: user.email ?? undefined,
      name: user.displayName ?? undefined,
      metadata: { userId: String(user._id) },
    });

    user.stripeCustomerId = customer.id;
    await user.save();

    return customer.id;
  }
}