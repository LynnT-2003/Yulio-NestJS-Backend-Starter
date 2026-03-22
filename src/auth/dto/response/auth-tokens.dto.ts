import { ApiProperty } from '@nestjs/swagger';
import { IAuthTokens } from '../../../common/interfaces/auth.interface';

/**
 * Swagger response schema for JWT token pair.
 * Returned on successful register, login, refresh, and OAuth callbacks.
 */
export class AuthTokensDto implements IAuthTokens {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'JWT access token (15 min expiry)',
  })
  accessToken: string;

  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'JWT refresh token (30 day expiry)',
  })
  refreshToken: string;
}
