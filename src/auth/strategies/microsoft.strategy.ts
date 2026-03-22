import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-microsoft';

import { AuthService } from '../auth.service';
import { UserService } from '../../user/user.service';
import { OAuthProviderType } from '../../common/enums/oauth-provider.enum';
import { OAuthUserDto } from '../../user/dto/oauth-user.dto';
import { IAuthResponse } from '../../common/interfaces/auth.interface';

@Injectable()
export class MicrosoftStrategy extends PassportStrategy(Strategy, 'microsoft') {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService,
    configService: ConfigService,
  ) {
    super({
      clientID: configService.getOrThrow<string>('MICROSOFT_CLIENT_ID'),
      clientSecret: configService.getOrThrow<string>('MICROSOFT_CLIENT_SECRET'),
      callbackURL: configService.getOrThrow<string>('MICROSOFT_CALLBACK_URL'),
      scope: ['user.read'],
      tenant: 'common',
    });
  }

  async validate(
    accessToken: string,
    _refreshToken: string,
    profile: Profile,
  ): Promise<IAuthResponse> {
    const dto: OAuthUserDto = {
      provider: OAuthProviderType.MICROSOFT,
      providerId: profile.id,
      email: profile.emails?.[0]?.value
        ?? profile._json?.mail
        ?? profile._json?.userPrincipalName
        ?? null,
      displayName: profile.displayName ?? profile._json?.displayName ?? 'Microsoft User',
      avatar: null,
      accessToken,
    };

    const userDoc = await this.userService.findOrCreateOAuthUser(dto);
    return this.authService.oauthLogin(userDoc);
  }
}