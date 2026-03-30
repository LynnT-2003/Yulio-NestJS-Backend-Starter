import { ApiProperty } from '@nestjs/swagger';

export class EmailResponseDto {
  @ApiProperty({
    description: 'Human readable success message',
    example: 'Email verified successfully',
  })
  message: string;
}
