import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { PaymentInternalTestingService } from './payment-internal-testing.service';
import { User } from '../user/entity/user.entity';
import { TransactionService } from '../payment/transaction.service';
import { PaymentPlanId } from '../common/enums/payment-plan.enum';

const mockUserModel = { findById: jest.fn() };
const mockTransactionService = { create: jest.fn(), findByUser: jest.fn() };

const makeUser = (plan: PaymentPlanId = PaymentPlanId.FREE): any => ({
  _id: new Types.ObjectId(),
  email: 'u@example.com',
  displayName: 'U',
  plan,
  planExpiresAt: null,
  stripeCustomerId: null,
  save: jest.fn().mockResolvedValue(undefined),
});

describe('PaymentInternalTestingService', () => {
  let service: PaymentInternalTestingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentInternalTestingService,
        { provide: getModelToken(User.name), useValue: mockUserModel },
        { provide: TransactionService, useValue: mockTransactionService },
      ],
    }).compile();

    service = module.get(PaymentInternalTestingService);
    jest.clearAllMocks();
    mockTransactionService.create.mockResolvedValue({ stripeEventId: 'evt_mock_1' });
  });

  describe('mockOneTimePurchase', () => {
    it('throws BadRequestException for FREE plan', async () => {
      await expect(
        service.mockOneTimePurchase('uid', { plan: PaymentPlanId.FREE }),
      ).rejects.toThrow(BadRequestException);
    });

    it('upgrades user plan', async () => {
      const user = makeUser(PaymentPlanId.FREE);
      mockUserModel.findById.mockResolvedValue(user);
      const result = await service.mockOneTimePurchase('uid', { plan: PaymentPlanId.LIFETIME });
      expect(user.plan).toBe(PaymentPlanId.LIFETIME);
      expect(result.message).toContain('lifetime');
    });
  });

  describe('mockSubscriptionCreated', () => {
    it('throws BadRequestException for FREE plan target', async () => {
      await expect(
        service.mockSubscriptionCreated('uid', { plan: PaymentPlanId.FREE }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when user already has non-FREE plan', async () => {
      const user = makeUser(PaymentPlanId.PRO);
      mockUserModel.findById.mockResolvedValue(user);
      await expect(
        service.mockSubscriptionCreated('uid', { plan: PaymentPlanId.PRO }),
      ).rejects.toThrow(BadRequestException);
    });

    it('activates subscription when user is on FREE', async () => {
      const user = makeUser(PaymentPlanId.FREE);
      mockUserModel.findById.mockResolvedValue(user);
      const result = await service.mockSubscriptionCreated('uid', { plan: PaymentPlanId.PRO });
      expect(user.plan).toBe(PaymentPlanId.PRO);
      expect(result).toHaveProperty('transaction');
    });
  });

  describe('mockSubscriptionRenewed', () => {
    it('throws for FREE plan', async () => {
      mockUserModel.findById.mockResolvedValue(makeUser(PaymentPlanId.FREE));
      await expect(service.mockSubscriptionRenewed('uid', {})).rejects.toThrow(BadRequestException);
    });

    it('throws for LIFETIME plan', async () => {
      mockUserModel.findById.mockResolvedValue(makeUser(PaymentPlanId.LIFETIME));
      await expect(service.mockSubscriptionRenewed('uid', {})).rejects.toThrow(BadRequestException);
    });

    it('extends expiry for active subscription', async () => {
      const user = makeUser(PaymentPlanId.PRO);
      mockUserModel.findById.mockResolvedValue(user);
      const result = await service.mockSubscriptionRenewed('uid', {});
      expect(user.planExpiresAt).toBeInstanceOf(Date);
      expect(result).toHaveProperty('transaction');
    });
  });

  describe('mockSubscriptionCancelled', () => {
    it('throws for FREE plan', async () => {
      mockUserModel.findById.mockResolvedValue(makeUser(PaymentPlanId.FREE));
      await expect(service.mockSubscriptionCancelled('uid')).rejects.toThrow(BadRequestException);
    });

    it('throws for LIFETIME plan', async () => {
      mockUserModel.findById.mockResolvedValue(makeUser(PaymentPlanId.LIFETIME));
      await expect(service.mockSubscriptionCancelled('uid')).rejects.toThrow(BadRequestException);
    });

    it('downgrades to FREE', async () => {
      const user = makeUser(PaymentPlanId.PRO);
      mockUserModel.findById.mockResolvedValue(user);
      const result = await service.mockSubscriptionCancelled('uid');
      expect(user.plan).toBe(PaymentPlanId.FREE);
      expect(result.message).toContain('cancellation');
    });
  });

  describe('resetPlan', () => {
    it('resets to FREE regardless of current plan', async () => {
      const user = makeUser(PaymentPlanId.LIFETIME);
      mockUserModel.findById.mockResolvedValue(user);
      const result = await service.resetPlan('uid');
      expect(user.plan).toBe(PaymentPlanId.FREE);
      expect(result.previousPlan).toBe(PaymentPlanId.LIFETIME);
    });
  });

  describe('getUserPaymentState', () => {
    it('throws NotFoundException when user not found', async () => {
      mockUserModel.findById.mockReturnValue({ select: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) });
      await expect(service.getUserPaymentState('uid')).rejects.toThrow(NotFoundException);
    });

    it('returns user and transactions', async () => {
      const user = { _id: new Types.ObjectId(), email: 'u@e.com', displayName: 'U', plan: PaymentPlanId.FREE, planExpiresAt: null, stripeCustomerId: null };
      mockUserModel.findById.mockReturnValue({
        select: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(user) }),
      });
      mockTransactionService.findByUser.mockResolvedValue([]);
      const result = await service.getUserPaymentState(String(user._id));
      expect(result.transactions).toEqual([]);
      expect(result.plan).toBe(PaymentPlanId.FREE);
    });
  });
});
