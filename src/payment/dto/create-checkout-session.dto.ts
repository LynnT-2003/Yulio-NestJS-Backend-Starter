import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsUrl } from 'class-validator';

export class CreateCheckoutSessionDto {
  @ApiProperty({ example: 'price_1ABC...' })
  @IsString()
  @IsNotEmpty()
  priceId: string;

  @ApiProperty({ example: 'https://yourapp.com/success' })
  @IsUrl()
  successUrl: string;

  @ApiProperty({ example: 'https://yourapp.com/cancel' })
  @IsUrl()
  cancelUrl: string;
}
