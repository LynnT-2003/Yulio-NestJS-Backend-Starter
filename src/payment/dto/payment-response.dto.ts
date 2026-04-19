import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentPlanId } from '../../common/enums/payment-plan.enum';

export class CheckoutSessionResponseDto {
  @ApiProperty({ example: 'https://checkout.stripe.com/pay/cs_test_...' })
  url: string;

  @ApiProperty({ example: 'cs_test_a1b2c3...' })
  sessionId: string;
}

export class BillingPortalSessionResponseDto {
  @ApiProperty({ example: 'https://billing.stripe.com/session/...' })
  url: string;
}

export class UserPlanResponseDto {
  @ApiPropertyOptional({ example: 'cus_abc123', nullable: true })
  stripeCustomerId: string | null;

  @ApiProperty({ enum: PaymentPlanId, example: PaymentPlanId.PRO })
  plan: PaymentPlanId;

  @ApiPropertyOptional({ example: '2026-05-18T00:00:00.000Z', nullable: true })
  planExpiresAt: Date | null;
}
