import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-oauth2';
import axios from 'axios';

import { AuthService } from '../auth.service';
import { UserService } from '../../user/user.service';
import { OAuthProviderType } from '../../common/enums/oauth-provider.enum';
import { OAuthUserDto } from '../../user/dto/oauth-user.dto';

@Injectable()
export class LineStrategy extends PassportStrategy(Strategy, 'line') {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService,
    private readonly configService: ConfigService, // ← add private readonly
  ) {
    super({
      authorizationURL: 'https://access.line.me/oauth2/v2.1/authorize',
      tokenURL: 'https://api.line.me/oauth2/v2.1/token',
      clientID: configService.getOrThrow<string>('LINE_CHANNEL_ID'),
      clientSecret: configService.getOrThrow<string>('LINE_CHANNEL_SECRET'),
      callbackURL: configService.getOrThrow<string>('LINE_CALLBACK_URL'),
      scope: ['profile', 'openid', 'email'],
    });
  }

  async validate(
    accessToken: string,
    _refreshToken: string,
    _params: any,
    _profile: any,
    done: (err: any, user?: any) => void,
  ): Promise<void> {
    try {
      const { data } = await axios.get('https://api.line.me/v2/profile', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      // Read config inside validate — configService is now accessible via this
      const isStrict = this.configService.get('LINE_ACCOUNT_LINKING') !== 'permissive';

      if (isStrict && !data.email) {
        return done(
          new UnauthorizedException(
            'LINE email permission is not yet approved. Please try again later.',
          ),
          false,
        );
      }

      const dto: OAuthUserDto = {
        provider: OAuthProviderType.LINE,
        providerId: data.userId,
        email: data.email ?? null,
        displayName: data.displayName ?? 'LINE User',
        avatar: data.pictureUrl ?? null,
        accessToken,
      };

      const userDoc = await this.userService.findOrCreateOAuthUser(dto);
      const authResponse = await this.authService.oauthLogin(userDoc);

      done(null, authResponse);
    } catch (error) {
      done(error, false);
    }
  }
}