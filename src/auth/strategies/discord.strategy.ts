import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-discord';

import { AuthService } from '../auth.service';
import { UserService } from '../../user/user.service';
import { OAuthProviderType } from '../../common/enums/oauth-provider.enum';
import { OAuthUserDto } from '../../user/dto/oauth-user.dto';
import { IAuthResponse } from '../../common/interfaces/auth.interface';

@Injectable()
export class DiscordStrategy extends PassportStrategy(Strategy, 'discord') {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService,
    configService: ConfigService,
  ) {
    super({
      clientID: configService.getOrThrow<string>('DISCORD_CLIENT_ID'),
      clientSecret: configService.getOrThrow<string>('DISCORD_CLIENT_SECRET'),
      callbackURL: configService.getOrThrow<string>('DISCORD_CALLBACK_URL'),
      scope: ['identify', 'email'], // identify = basic profile, email = email address
    });
  }

  async validate(
    accessToken: string,
    _refreshToken: string,
    profile: Profile,
  ): Promise<IAuthResponse> {
    const dto: OAuthUserDto = {
      provider: OAuthProviderType.DISCORD,
      providerId: profile.id,
      email: profile.email ?? null,
      displayName: profile.global_name ?? profile.username ?? 'Discord User',
      avatar: profile.avatar
        ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png`
        : null,
      accessToken,
    };

    const userDoc = await this.userService.findOrCreateOAuthUser(dto);
    return this.authService.oauthLogin(userDoc);
  }
}