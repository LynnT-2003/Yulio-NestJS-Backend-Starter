import { ApiProperty } from '@nestjs/swagger';
import { IAuthResponse } from '../../../common/interfaces/auth.interface';
import { IUserPublic } from '../../../common/interfaces/user.interface';
import { IAuthTokens } from '../../../common/interfaces/auth.interface';
import { UserPublicDto } from './user-public.dto';
import { AuthTokensDto } from './auth-tokens.dto';

/**
 * Swagger response schema for successful authentication.
 * Returned on register, login, and OAuth callbacks.
 */
export class AuthResponseDto implements IAuthResponse {
  @ApiProperty({
    type: UserPublicDto,
    description: 'Public user profile',
  })
  user: IUserPublic;

  @ApiProperty({
    type: AuthTokensDto,
    description: 'JWT access + refresh token pair',
  })
  tokens: IAuthTokens;
}
