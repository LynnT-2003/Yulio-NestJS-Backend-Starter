import { ApiProperty } from '@nestjs/swagger';
import { IsUrl } from 'class-validator';

export class CreateBillingPortalSessionDto {
  @ApiProperty({ example: 'https://yourapp.com/settings/billing' })
  @IsUrl()
  returnUrl: string;
}
