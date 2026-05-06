import { Test, TestingModule } from '@nestjs/testing';
import { PaymentInternalTestingController } from './payment-internal-testing.controller';
import { PaymentInternalTestingService } from './payment-internal-testing.service';
import { PaymentPlanId } from '../common/enums/payment-plan.enum';
import { UserRole } from '../common/enums/user-role.enum';

const mockService = {
  mockOneTimePurchase: jest.fn(),
  mockSubscriptionCreated: jest.fn(),
  mockSubscriptionRenewed: jest.fn(),
  mockSubscriptionCancelled: jest.fn(),
  resetPlan: jest.fn(),
  getUserPaymentState: jest.fn(),
};

const mockUser = { userId: 'uid1', email: 'a@b.com', role: UserRole.USER, isSuspended: false };

describe('PaymentInternalTestingController', () => {
  let controller: PaymentInternalTestingController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentInternalTestingController],
      providers: [{ provide: PaymentInternalTestingService, useValue: mockService }],
    }).compile();

    controller = module.get(PaymentInternalTestingController);
    jest.clearAllMocks();
  });

  it('mockOneTimePurchase delegates with userId', async () => {
    mockService.mockOneTimePurchase.mockResolvedValue({ message: 'ok' });
    await controller.mockOneTimePurchase(mockUser, { plan: PaymentPlanId.LIFETIME });
    expect(mockService.mockOneTimePurchase).toHaveBeenCalledWith('uid1', { plan: PaymentPlanId.LIFETIME });
  });

  it('mockSubscriptionCreated delegates with userId', async () => {
    mockService.mockSubscriptionCreated.mockResolvedValue({ message: 'ok' });
    await controller.mockSubscriptionCreated(mockUser, { plan: PaymentPlanId.PRO });
    expect(mockService.mockSubscriptionCreated).toHaveBeenCalledWith('uid1', { plan: PaymentPlanId.PRO });
  });

  it('mockSubscriptionRenewed delegates with userId', async () => {
    mockService.mockSubscriptionRenewed.mockResolvedValue({ message: 'ok' });
    await controller.mockSubscriptionRenewed(mockUser, {});
    expect(mockService.mockSubscriptionRenewed).toHaveBeenCalledWith('uid1', {});
  });

  it('mockSubscriptionCancelled delegates with userId', async () => {
    mockService.mockSubscriptionCancelled.mockResolvedValue({ message: 'ok' });
    await controller.mockSubscriptionCancelled(mockUser);
    expect(mockService.mockSubscriptionCancelled).toHaveBeenCalledWith('uid1');
  });

  it('resetPlan delegates with userId', async () => {
    mockService.resetPlan.mockResolvedValue({ message: 'ok' });
    await controller.resetPlan(mockUser);
    expect(mockService.resetPlan).toHaveBeenCalledWith('uid1');
  });

  it('getMyPaymentState delegates with userId', async () => {
    mockService.getUserPaymentState.mockResolvedValue({ plan: PaymentPlanId.FREE });
    await controller.getMyPaymentState(mockUser);
    expect(mockService.getUserPaymentState).toHaveBeenCalledWith('uid1');
  });
});
