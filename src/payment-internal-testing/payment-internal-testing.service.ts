import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { randomUUID } from 'crypto';

import { User, UserDocument } from '../user/entity/user.entity';
import { TransactionService } from '../payment/transaction.service';
import { PaymentPlanId } from '../common/enums/payment-plan.enum';
import { MockOneTimePurchaseDto } from './dto/mock-one-time-purchase.dto';
import {
  MockSubscriptionCreatedDto,
  MockSubscriptionRenewedDto,
} from './dto/mock-subscription.dto';

const MOCK_CUSTOMER_PREFIX = 'cus_mock_';
const MOCK_EVENT_PREFIX = 'evt_mock_';

@Injectable()
export class PaymentInternalTestingService {
  private readonly logger = new Logger(PaymentInternalTestingService.name);

  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly transactionService: TransactionService,
  ) {}

  // ── Helpers ────────────────────────────────────────────────────────────────

  private async resolveUser(userId: string): Promise<UserDocument> {
    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException(`User not found: ${userId}`);
    return user;
  }

  private ensureMockCustomerId(user: UserDocument): string {
    if (!user.stripeCustomerId) {
      user.stripeCustomerId = `${MOCK_CUSTOMER_PREFIX}${user._id}`;
    }
    return user.stripeCustomerId;
  }

  private mockEventId(): string {
    return `${MOCK_EVENT_PREFIX}${randomUUID()}`;
  }

  private thirtyDaysFromNow(): Date {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d;
  }

  // ── One-time purchase ──────────────────────────────────────────────────────

  async mockOneTimePurchase(userId: string, dto: MockOneTimePurchaseDto) {
    if (dto.plan === PaymentPlanId.FREE) {
      throw new BadRequestException('Cannot mock a one-time purchase for the FREE plan. Use reset instead.');
    }

    const user = await this.resolveUser(userId);
    const customerId = this.ensureMockCustomerId(user);
    const eventId = this.mockEventId();

    const transaction = await this.transactionService.create({
      userId,
      stripeEventId: eventId,
      stripeCustomerId: customerId,
      type: 'one_time_purchase',
      plan: dto.plan,
      amount: dto.amount ?? 9900,
      currency: dto.currency ?? 'usd',
      status: 'succeeded',
    });

    user.plan = dto.plan;
    user.planExpiresAt = null;
    await user.save();

    this.logger.log(`[MOCK] User ${userId} → one-time purchase: ${dto.plan}`);

    return {
      message: `Mocked one-time purchase of ${dto.plan}`,
      mockEventId: eventId,
      mockCustomerId: customerId,
      transaction,
      user: { plan: user.plan, planExpiresAt: user.planExpiresAt, stripeCustomerId: user.stripeCustomerId },
    };
  }

  // ── Subscription created ───────────────────────────────────────────────────

  async mockSubscriptionCreated(userId: string, dto: MockSubscriptionCreatedDto) {
    if (dto.plan === PaymentPlanId.FREE) {
      throw new BadRequestException('Cannot mock a subscription for the FREE plan.');
    }

    const user = await this.resolveUser(userId);

    if (user.plan !== PaymentPlanId.FREE) {
      throw new BadRequestException(
        `You already have plan "${user.plan}". Use mock-subscription-renewed or reset first.`,
      );
    }

    const customerId = this.ensureMockCustomerId(user);
    const eventId = this.mockEventId();
    const periodEnd = dto.periodEnd ? new Date(dto.periodEnd) : this.thirtyDaysFromNow();

    const transaction = await this.transactionService.create({
      userId,
      stripeEventId: eventId,
      stripeCustomerId: customerId,
      type: 'subscription_created',
      plan: dto.plan,
      amount: dto.amount ?? 1900,
      currency: dto.currency ?? 'usd',
      status: 'succeeded',
    });

    user.plan = dto.plan;
    user.planExpiresAt = periodEnd;
    await user.save();

    this.logger.log(`[MOCK] User ${userId} → subscription created: ${dto.plan}, expires ${periodEnd.toISOString()}`);

    return {
      message: `Mocked subscription created (${dto.plan})`,
      mockEventId: eventId,
      mockCustomerId: customerId,
      transaction,
      user: { plan: user.plan, planExpiresAt: user.planExpiresAt, stripeCustomerId: user.stripeCustomerId },
    };
  }

  // ── Subscription renewed ───────────────────────────────────────────────────

  async mockSubscriptionRenewed(userId: string, dto: MockSubscriptionRenewedDto) {
    const user = await this.resolveUser(userId);

    if (user.plan === PaymentPlanId.FREE || user.plan === PaymentPlanId.LIFETIME) {
      throw new BadRequestException(
        `Plan "${user.plan}" cannot be renewed. Only active subscriptions can renew.`,
      );
    }

    const customerId = this.ensureMockCustomerId(user);
    const eventId = this.mockEventId();
    const periodEnd = dto.periodEnd ? new Date(dto.periodEnd) : this.thirtyDaysFromNow();

    const transaction = await this.transactionService.create({
      userId,
      stripeEventId: eventId,
      stripeCustomerId: customerId,
      type: 'subscription_renewed',
      plan: user.plan,
      amount: dto.amount ?? 1900,
      currency: dto.currency ?? 'usd',
      status: 'succeeded',
    });

    user.planExpiresAt = periodEnd;
    await user.save();

    this.logger.log(`[MOCK] User ${userId} → subscription renewed: ${user.plan}, new expiry ${periodEnd.toISOString()}`);

    return {
      message: `Mocked subscription renewal`,
      mockEventId: eventId,
      transaction,
      user: { plan: user.plan, planExpiresAt: user.planExpiresAt, stripeCustomerId: user.stripeCustomerId },
    };
  }

  // ── Subscription cancelled ─────────────────────────────────────────────────

  async mockSubscriptionCancelled(userId: string) {
    const user = await this.resolveUser(userId);

    if (user.plan === PaymentPlanId.FREE) {
      throw new BadRequestException('You are already on the FREE plan.');
    }
    if (user.plan === PaymentPlanId.LIFETIME) {
      throw new BadRequestException('LIFETIME plan cannot be cancelled (no subscription).');
    }

    const customerId = this.ensureMockCustomerId(user);
    const eventId = this.mockEventId();
    const previousPlan = user.plan;

    const transaction = await this.transactionService.create({
      userId,
      stripeEventId: eventId,
      stripeCustomerId: customerId,
      type: 'subscription_cancelled',
      plan: previousPlan,
      amount: 0,
      currency: 'usd',
      status: 'succeeded',
    });

    user.plan = PaymentPlanId.FREE;
    user.planExpiresAt = null;
    await user.save();

    this.logger.log(`[MOCK] User ${userId} → subscription cancelled (was ${previousPlan})`);

    return {
      message: `Mocked subscription cancellation (downgraded from ${previousPlan} to free)`,
      mockEventId: eventId,
      transaction,
      user: { plan: user.plan, planExpiresAt: user.planExpiresAt, stripeCustomerId: user.stripeCustomerId },
    };
  }

  // ── Reset plan ─────────────────────────────────────────────────────────────

  async resetPlan(userId: string) {
    const user = await this.resolveUser(userId);
    const previousPlan = user.plan;

    user.plan = PaymentPlanId.FREE;
    user.planExpiresAt = null;
    await user.save();

    this.logger.log(`[MOCK] User ${userId} plan reset to FREE (was ${previousPlan})`);

    return {
      message: `Reset to FREE plan`,
      previousPlan,
      user: { plan: user.plan, planExpiresAt: user.planExpiresAt, stripeCustomerId: user.stripeCustomerId },
    };
  }

  // ── Query ──────────────────────────────────────────────────────────────────

  async getUserPaymentState(userId: string) {
    const user = await this.userModel
      .findById(userId)
      .select('stripeCustomerId plan planExpiresAt email displayName')
      .lean();

    if (!user) throw new NotFoundException(`User not found: ${userId}`);

    const transactions = await this.transactionService.findByUser(userId);

    const now = new Date();
    const isExpired =
      user.plan !== PaymentPlanId.FREE &&
      user.plan !== PaymentPlanId.LIFETIME &&
      user.planExpiresAt != null &&
      user.planExpiresAt < now;

    return {
      userId,
      email: user.email,
      displayName: user.displayName,
      plan: user.plan,
      planExpiresAt: user.planExpiresAt,
      stripeCustomerId: user.stripeCustomerId,
      isExpired,
      transactions,
    };
  }
}
