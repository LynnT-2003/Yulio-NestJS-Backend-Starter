import { Test, TestingModule } from '@nestjs/testing';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { PaymentPlanId } from '../common/enums/payment-plan.enum';
import { UserRole } from '../common/enums/user-role.enum';

const mockPaymentService = {
  createCheckoutSession: jest.fn(),
  createBillingPortalSession: jest.fn(),
  getUserPlan: jest.fn(),
  handleWebhook: jest.fn(),
};

const mockUser = { userId: 'uid1', email: 'a@b.com', role: UserRole.USER, isSuspended: false };

describe('PaymentController', () => {
  let controller: PaymentController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentController],
      providers: [{ provide: PaymentService, useValue: mockPaymentService }],
    }).compile();

    controller = module.get(PaymentController);
    jest.clearAllMocks();
  });

  it('createCheckoutSession delegates to service', async () => {
    mockPaymentService.createCheckoutSession.mockResolvedValue({ url: 'https://stripe.com', sessionId: 'cs_1' });
    const result = await controller.createCheckoutSession(mockUser, {
      priceId: 'price_pro',
      successUrl: 'http://ok',
      cancelUrl: 'http://cancel',
    });
    expect(mockPaymentService.createCheckoutSession).toHaveBeenCalledWith('uid1', 'price_pro', 'http://ok', 'http://cancel');
    expect(result).toHaveProperty('url');
  });

  it('createBillingPortalSession delegates to service', async () => {
    mockPaymentService.createBillingPortalSession.mockResolvedValue({ url: 'https://billing.stripe.com' });
    const result = await controller.createBillingPortalSession(mockUser, { returnUrl: 'http://return' });
    expect(mockPaymentService.createBillingPortalSession).toHaveBeenCalledWith('uid1', 'http://return');
    expect(result).toHaveProperty('url');
  });

  it('getUserPlan delegates to service', async () => {
    mockPaymentService.getUserPlan.mockResolvedValue({ plan: PaymentPlanId.FREE, planExpiresAt: null, stripeCustomerId: null });
    const result = await controller.getUserPlan(mockUser);
    expect(mockPaymentService.getUserPlan).toHaveBeenCalledWith('uid1');
    expect(result).toHaveProperty('plan');
  });

  it('handleWebhook delegates to service', async () => {
    mockPaymentService.handleWebhook.mockResolvedValue(undefined);
    const req = { rawBody: Buffer.from('payload') } as any;
    await controller.handleWebhook(req, 'sig');
    expect(mockPaymentService.handleWebhook).toHaveBeenCalledWith(req.rawBody, 'sig');
  });
});
