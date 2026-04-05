import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength, MaxLength } from 'class-validator';

export class CreateMemberInvitationDto {
  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'Engineering Team', minLength: 3, maxLength: 64 })
  @IsNotEmpty()
  @IsString()
  @MinLength(3)
  @MaxLength(64)
  teamName: string;
}
