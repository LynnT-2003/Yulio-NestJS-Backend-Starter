import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class SuspendUserDto {
  @ApiPropertyOptional({
    maxLength: 2000,
    description: 'Optional note stored with the suspension (e.g. policy reference).',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reason?: string;
}
