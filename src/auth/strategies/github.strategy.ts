import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-github2';

import { AuthService } from '../auth.service';
import { UserService } from '../../user/user.service';
import { OAuthProviderType } from '../../common/enums/oauth-provider.enum';
import { OAuthUserDto } from '../../user/dto/oauth-user.dto';
import { IAuthResponse } from '../../common/interfaces/auth.interface';

@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, 'github') {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService,
    configService: ConfigService,
  ) {
    super({
      clientID: configService.getOrThrow<string>('GITHUB_CLIENT_ID'),
      clientSecret: configService.getOrThrow<string>('GITHUB_CLIENT_SECRET'),
      callbackURL: configService.getOrThrow<string>('GITHUB_CALLBACK_URL'),
      scope: ['user:email'],  // request email access
    });
  }

  async validate(
    accessToken: string,
    _refreshToken: string,
    profile: Profile,
  ): Promise<IAuthResponse> {
    // GitHub returns emails as an array — pick the primary verified one
    const primaryEmail = profile.emails?.find((e: any) => e.primary && e.verified)?.value
      ?? profile.emails?.[0]?.value
      ?? null;

    const dto: OAuthUserDto = {
      provider: OAuthProviderType.GITHUB,
      providerId: profile.id,
      email: primaryEmail,
      displayName: profile.displayName ?? profile.username ?? 'GitHub User',
      avatar: profile.photos?.[0]?.value ?? null,
      accessToken,
    };

    const userDoc = await this.userService.findOrCreateOAuthUser(dto);
    return this.authService.oauthLogin(userDoc);
  }
}