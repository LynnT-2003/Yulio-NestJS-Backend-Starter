import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { getModelToken } from '@nestjs/mongoose';
import { PlanGuard } from './plan.guard';
import { User } from '../../user/entity/user.entity';
import { PaymentPlanId } from '../enums/payment-plan.enum';

const mockUserModel = { findById: jest.fn() };
const mockReflector = { getAllAndOverride: jest.fn() };

const makeContext = (user: any) =>
  ({
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  }) as any;

describe('PlanGuard', () => {
  let guard: PlanGuard;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlanGuard,
        { provide: Reflector, useValue: mockReflector },
        { provide: getModelToken(User.name), useValue: mockUserModel },
      ],
    }).compile();

    guard = module.get(PlanGuard);
    jest.clearAllMocks();
  });

  it('returns true when no @RequiresPlan() decorator', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(undefined);
    await expect(guard.canActivate(makeContext({ userId: '1' }))).resolves.toBe(true);
  });

  it('throws ForbiddenException when subscription expired', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(PaymentPlanId.PRO);
    const expired = new Date(Date.now() - 1000);
    mockUserModel.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue({ plan: PaymentPlanId.PRO, planExpiresAt: expired }),
    });
    await expect(guard.canActivate(makeContext({ userId: '1' }))).rejects.toThrow(ForbiddenException);
  });

  it('throws ForbiddenException when plan rank is insufficient', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(PaymentPlanId.PRO);
    mockUserModel.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue({ plan: PaymentPlanId.FREE, planExpiresAt: null }),
    });
    await expect(guard.canActivate(makeContext({ userId: '1' }))).rejects.toThrow(ForbiddenException);
  });

  it('returns true when plan rank meets requirement', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(PaymentPlanId.PRO);
    mockUserModel.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue({ plan: PaymentPlanId.LIFETIME, planExpiresAt: null }),
    });
    await expect(guard.canActivate(makeContext({ userId: '1' }))).resolves.toBe(true);
  });

  it('throws ForbiddenException when user not found', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(PaymentPlanId.PRO);
    mockUserModel.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue(null),
    });
    await expect(guard.canActivate(makeContext({ userId: '1' }))).rejects.toThrow(ForbiddenException);
  });
});
