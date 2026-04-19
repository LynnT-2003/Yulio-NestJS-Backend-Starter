import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsInt, Min } from 'class-validator';
import { PaymentPlanId } from '../../common/enums/payment-plan.enum';

export class MockOneTimePurchaseDto {
  @ApiProperty({
    enum: PaymentPlanId,
    example: PaymentPlanId.LIFETIME,
    description: 'Plan to grant (must be non-FREE)',
  })
  @IsString()
  @IsNotEmpty()
  plan: PaymentPlanId;

  @ApiPropertyOptional({ example: 9900, description: 'Amount in cents' })
  @IsOptional()
  @IsInt()
  @Min(0)
  amount?: number;

  @ApiPropertyOptional({ example: 'usd' })
  @IsOptional()
  @IsString()
  currency?: string;
}
