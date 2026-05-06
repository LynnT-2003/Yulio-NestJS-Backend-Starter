import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { TransactionService } from './transaction.service';
import { Transaction } from './entity/transaction.entity';
import { PaymentPlanId } from '../common/enums/payment-plan.enum';

const mockSave = jest.fn().mockResolvedValue(undefined);
const mockToObject = jest.fn().mockReturnValue({ userId: 'uid1', stripeEventId: 'evt1' });

const MockTransactionModel: any = jest.fn().mockImplementation(() => ({
  save: mockSave,
  toObject: mockToObject,
}));

MockTransactionModel.find = jest.fn();
MockTransactionModel.exists = jest.fn();

describe('TransactionService', () => {
  let service: TransactionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionService,
        { provide: getModelToken(Transaction.name), useValue: MockTransactionModel },
      ],
    }).compile();

    service = module.get(TransactionService);
    jest.clearAllMocks();

    mockSave.mockResolvedValue(undefined);
    mockToObject.mockReturnValue({ userId: 'uid1', stripeEventId: 'evt1' });
  });

  describe('create', () => {
    it('saves and returns transaction with userId as string', async () => {
      const dto = {
        userId: 'uid1',
        stripeEventId: 'evt1',
        stripeCustomerId: 'cus1',
        type: 'one_time_purchase' as const,
        plan: PaymentPlanId.LIFETIME,
        amount: 9900,
        currency: 'usd',
        status: 'succeeded' as const,
      };

      const result = await service.create(dto);
      expect(mockSave).toHaveBeenCalled();
      expect(typeof result.userId).toBe('string');
    });
  });

  describe('findByUser', () => {
    it('queries by userId and returns results', async () => {
      const mockExec = jest.fn().mockResolvedValue([{ userId: 'uid1' }]);
      const mockLean = jest.fn().mockReturnValue({ exec: mockExec });
      const mockSort = jest.fn().mockReturnValue({ lean: mockLean });
      MockTransactionModel.find.mockReturnValue({ sort: mockSort });

      const result = await service.findByUser('uid1');
      expect(MockTransactionModel.find).toHaveBeenCalledWith({ userId: 'uid1' });
      expect(result).toEqual([{ userId: 'uid1' }]);
    });
  });

  describe('existsByStripeEventId', () => {
    it('returns true when doc exists', async () => {
      MockTransactionModel.exists.mockReturnValue({ exec: jest.fn().mockResolvedValue({ _id: '1' }) });
      expect(await service.existsByStripeEventId('evt1')).toBe(true);
    });

    it('returns false when doc does not exist', async () => {
      MockTransactionModel.exists.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
      expect(await service.existsByStripeEventId('evt_none')).toBe(false);
    });
  });
});
