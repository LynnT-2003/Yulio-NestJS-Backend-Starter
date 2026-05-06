import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';

const mockStripeInstance = {
  prices: { retrieve: jest.fn() },
  customers: { create: jest.fn() },
  checkout: {
    sessions: {
      create: jest.fn(),
      listLineItems: jest.fn(),
    },
  },
  billingPortal: { sessions: { create: jest.fn() } },
  webhooks: { constructEvent: jest.fn() },
};

jest.mock('stripe', () => {
  const fn = jest.fn().mockReturnValue(mockStripeInstance);
  (fn as any).default = fn;
  return fn;
});

import { PaymentService } from './payment.service';
import { User } from '../user/entity/user.entity';
import { TransactionService } from './transaction.service';
import { PaymentPlanId } from '../common/enums/payment-plan.enum';

const mockUserModel = { findById: jest.fn(), findOne: jest.fn() };
const mockTransactionService = { existsByStripeEventId: jest.fn(), create: jest.fn() };
const mockConfigService = {
  get: jest.fn((key: string) => {
    const map: Record<string, string> = {
      STRIPE_SECRET_KEY: 'sk_test_key',
      STRIPE_PRICE_PRO_MONTHLY: 'price_pro',
      STRIPE_PRICE_LIFETIME: 'price_lifetime',
      STRIPE_WEBHOOK_SECRET: 'whsec_test',
    };
    return map[key]?.trim();
  }),
  getOrThrow: jest.fn().mockReturnValue('sk_test_key'),
};

const makeUser = (overrides: Partial<any> = {}): any => ({
  _id: new Types.ObjectId(),
  email: 'test@example.com',
  displayName: 'Test',
  stripeCustomerId: null,
  plan: PaymentPlanId.FREE,
  planExpiresAt: null,
  save: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

describe('PaymentService', () => {
  let service: PaymentService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: TransactionService, useValue: mockTransactionService },
        { provide: getModelToken(User.name), useValue: mockUserModel },
      ],
    }).compile();

    service = module.get(PaymentService);
    jest.clearAllMocks();
  });

  describe('createCheckoutSession', () => {
    it('throws NotFoundException when user not found', async () => {
      mockUserModel.findById.mockResolvedValue(null);
      await expect(service.createCheckoutSession('uid', 'price_pro', 'http://ok', 'http://cancel')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('creates customer and returns url and sessionId', async () => {
      const user = makeUser();
      mockUserModel.findById.mockResolvedValue(user);
      mockStripeInstance.customers.create.mockResolvedValue({ id: 'cus_new' });
      mockStripeInstance.prices.retrieve.mockResolvedValue({ type: 'one_time' });
      mockStripeInstance.checkout.sessions.create.mockResolvedValue({
        url: 'https://checkout.stripe.com/pay/cs_test',
        id: 'cs_test',
      });

      const result = await service.createCheckoutSession(String(user._id), 'price_lifetime', 'http://ok', 'http://cancel');
      expect(result.url).toContain('stripe.com');
      expect(result.sessionId).toBe('cs_test');
    });
  });

  describe('createBillingPortalSession', () => {
    it('throws NotFoundException when user not found', async () => {
      mockUserModel.findById.mockResolvedValue(null);
      await expect(service.createBillingPortalSession('uid', 'http://return')).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when no stripeCustomerId', async () => {
      mockUserModel.findById.mockResolvedValue(makeUser({ stripeCustomerId: null }));
      await expect(service.createBillingPortalSession('uid', 'http://return')).rejects.toThrow(BadRequestException);
    });

    it('returns portal session url', async () => {
      mockUserModel.findById.mockResolvedValue(makeUser({ stripeCustomerId: 'cus_123' }));
      mockStripeInstance.billingPortal.sessions.create.mockResolvedValue({ url: 'https://billing.stripe.com/p/session' });
      const result = await service.createBillingPortalSession('uid', 'http://return');
      expect(result.url).toContain('stripe.com');
    });
  });

  describe('getUserPlan', () => {
    it('throws NotFoundException when user not found', async () => {
      mockUserModel.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(null) });
      await expect(service.getUserPlan('uid')).rejects.toThrow(NotFoundException);
    });

    it('returns plan state', async () => {
      const user = makeUser({ plan: PaymentPlanId.PRO, planExpiresAt: null });
      mockUserModel.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(user) });
      const result = await service.getUserPlan('uid');
      expect(result.plan).toBe(PaymentPlanId.PRO);
    });
  });

  describe('handleWebhook', () => {
    it('throws BadRequestException on invalid signature', async () => {
      mockStripeInstance.webhooks.constructEvent.mockImplementation(() => {
        throw new Error('No signatures found');
      });
      await expect(service.handleWebhook(Buffer.from('payload'), 'bad-sig')).rejects.toThrow(BadRequestException);
    });

    it('skips duplicate events', async () => {
      mockStripeInstance.webhooks.constructEvent.mockReturnValue({ id: 'evt1', type: 'unknown', data: { object: {} } });
      mockTransactionService.existsByStripeEventId.mockResolvedValue(true);
      await expect(service.handleWebhook(Buffer.from('payload'), 'sig')).resolves.toBeUndefined();
      expect(mockTransactionService.create).not.toHaveBeenCalled();
    });
  });
});
