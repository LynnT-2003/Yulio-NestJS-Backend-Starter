import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentPlanId } from '../../common/enums/payment-plan.enum';
import { TransactionType, TransactionStatus } from '../../common/interfaces/transaction.interface';

export class MockUserStateDto {
  @ApiProperty({ enum: PaymentPlanId, example: PaymentPlanId.PRO })
  plan: PaymentPlanId;

  @ApiPropertyOptional({ example: '2026-05-18T00:00:00.000Z', nullable: true })
  planExpiresAt: Date | null;

  @ApiPropertyOptional({ example: 'cus_mock_abc123', nullable: true })
  stripeCustomerId: string | null;
}

export class MockTransactionDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  userId: string;

  @ApiProperty({ example: 'evt_mock_3f2504e0-...' })
  stripeEventId: string;

  @ApiProperty({ example: 'cus_mock_abc123' })
  stripeCustomerId: string;

  @ApiProperty({ example: 'one_time_purchase' })
  type: TransactionType;

  @ApiProperty({ enum: PaymentPlanId, example: PaymentPlanId.LIFETIME })
  plan: PaymentPlanId;

  @ApiProperty({ example: 9900 })
  amount: number;

  @ApiProperty({ example: 'usd' })
  currency: string;

  @ApiProperty({ example: 'succeeded' })
  status: TransactionStatus;

  @ApiProperty({ example: '2026-04-19T00:00:00.000Z' })
  createdAt: Date;
}

export class MockPurchaseResponseDto {
  @ApiProperty({ example: 'Mocked one-time purchase of lifetime' })
  message: string;

  @ApiProperty({ example: 'evt_mock_3f2504e0-4f5a-...' })
  mockEventId: string;

  @ApiProperty({ example: 'cus_mock_507f1f77bcf86cd799439011' })
  mockCustomerId: string;

  @ApiProperty({ type: MockTransactionDto })
  transaction: MockTransactionDto;

  @ApiProperty({ type: MockUserStateDto })
  user: MockUserStateDto;
}

export class MockSubscriptionResponseDto {
  @ApiProperty({ example: 'Mocked subscription created (pro)' })
  message: string;

  @ApiProperty({ example: 'evt_mock_3f2504e0-4f5a-...' })
  mockEventId: string;

  @ApiPropertyOptional({ example: 'cus_mock_507f1f77bcf86cd799439011' })
  mockCustomerId?: string;

  @ApiProperty({ type: MockTransactionDto })
  transaction: MockTransactionDto;

  @ApiProperty({ type: MockUserStateDto })
  user: MockUserStateDto;
}

export class MockResetResponseDto {
  @ApiProperty({ example: 'Reset to FREE plan' })
  message: string;

  @ApiProperty({ enum: PaymentPlanId, example: PaymentPlanId.PRO })
  previousPlan: PaymentPlanId;

  @ApiProperty({ type: MockUserStateDto })
  user: MockUserStateDto;
}

export class MockPaymentStateResponseDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  userId: string;

  @ApiPropertyOptional({ example: 'user@example.com', nullable: true })
  email: string | null;

  @ApiProperty({ example: 'John Doe' })
  displayName: string;

  @ApiProperty({ enum: PaymentPlanId, example: PaymentPlanId.FREE })
  plan: PaymentPlanId;

  @ApiPropertyOptional({ example: '2026-05-18T00:00:00.000Z', nullable: true })
  planExpiresAt: Date | null;

  @ApiPropertyOptional({ example: 'cus_mock_abc123', nullable: true })
  stripeCustomerId: string | null;

  @ApiProperty({ example: false })
  isExpired: boolean;

  @ApiProperty({ type: [MockTransactionDto] })
  transactions: MockTransactionDto[];
}
