import { TransactionType, TransactionStatus, ITransaction } from '../../common/interfaces/transaction.interface';
import { PaymentPlanId } from '../../common/enums/payment-plan.enum';

export interface ICreateTransactionDto {
  userId: string;
  stripeEventId: string;
  stripeCustomerId: string;
  type: TransactionType;
  plan: PaymentPlanId;
  amount: number;
  currency: string;
  status: TransactionStatus;
}

export interface ITransactionService {
  create(dto: ICreateTransactionDto): Promise<ITransaction>;
  findByUser(userId: string): Promise<ITransaction[]>;
  existsByStripeEventId(stripeEventId: string): Promise<boolean>;
}