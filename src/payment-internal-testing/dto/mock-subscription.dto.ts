import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsInt, Min, IsDateString } from 'class-validator';
import { PaymentPlanId } from '../../common/enums/payment-plan.enum';

export class MockSubscriptionCreatedDto {
  @ApiProperty({
    enum: PaymentPlanId,
    example: PaymentPlanId.PRO,
    description: 'Subscription plan to activate',
  })
  @IsString()
  @IsNotEmpty()
  plan: PaymentPlanId;

  @ApiPropertyOptional({
    example: '2026-05-18T00:00:00.000Z',
    description: 'Subscription period end (ISO 8601). Defaults to 30 days from now.',
  })
  @IsOptional()
  @IsDateString()
  periodEnd?: string;

  @ApiPropertyOptional({ example: 1900, description: 'Amount in cents' })
  @IsOptional()
  @IsInt()
  @Min(0)
  amount?: number;

  @ApiPropertyOptional({ example: 'usd' })
  @IsOptional()
  @IsString()
  currency?: string;
}

export class MockSubscriptionRenewedDto {
  @ApiPropertyOptional({
    example: '2026-06-18T00:00:00.000Z',
    description: 'New period end after renewal. Defaults to 30 days from now.',
  })
  @IsOptional()
  @IsDateString()
  periodEnd?: string;

  @ApiPropertyOptional({ example: 1900 })
  @IsOptional()
  @IsInt()
  @Min(0)
  amount?: number;

  @ApiPropertyOptional({ example: 'usd' })
  @IsOptional()
  @IsString()
  currency?: string;
}

export class MockSubscriptionCancelledDto {}
