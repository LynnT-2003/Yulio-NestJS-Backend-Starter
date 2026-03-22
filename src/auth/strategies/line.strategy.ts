import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-oauth2';
import axios from 'axios';

import { AuthService } from '../auth.service';
import { UserService } from '../../user/user.service';
import { OAuthProviderType } from '../../common/enums/oauth-provider.enum';
import { OAuthUserDto } from '../../user/dto/oauth-user.dto';
import { UnauthorizedException } from '@nestjs/common';
import { IAuthResponse } from '../../common/interfaces/auth.interface';

// Bypasses passport-oauth2 state verification — required for Vercel serverless
// where there is no persistent session between the redirect and callback requests
class StatelessStore {
  store(
    req: any,
    callback: (err: any, state: string) => void
  ): void;
  store(
    req: any,
    meta: any,
    callback: (err: any, state: string) => void
  ): void;
  store(req: any, metaOrCallback: any, callback?: any): void {
    const cb = callback ?? metaOrCallback;
    cb(null, 'stateless');
  }

  verify(
    req: any,
    state: string,
    callback: (err: any, ok: boolean, info?: any) => void
  ): void;
  verify(
    req: any,
    state: string,
    meta: any,
    callback: (err: any, ok: boolean, info?: any) => void
  ): void;
  verify(req: any, state: string, metaOrCallback: any, callback?: any): void {
    const cb = callback ?? metaOrCallback;
    cb(null, true, 'stateless');
  }
}

@Injectable()
export class LineStrategy extends PassportStrategy(Strategy, 'line') {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService,
    private readonly configService: ConfigService,
  ) {
    super({
      authorizationURL: 'https://access.line.me/oauth2/v2.1/authorize',
      tokenURL: 'https://api.line.me/oauth2/v2.1/token',
      clientID: configService.getOrThrow<string>('LINE_CHANNEL_ID'),
      clientSecret: configService.getOrThrow<string>('LINE_CHANNEL_SECRET'),
      callbackURL: configService.getOrThrow<string>('LINE_CALLBACK_URL'),
      scope: ['profile', 'openid', 'email'],
      store: new StatelessStore(),  // ← bypasses state
    });
  }

  async validate(
    accessToken: string,
    _refreshToken: string,
    _params: any,
    _profile: any,
  ): Promise<IAuthResponse> {
    const { data } = await axios.get('https://api.line.me/v2/profile', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const isStrict = this.configService.get('LINE_ACCOUNT_LINKING') !== 'permissive';

    if (isStrict && !data.email) {
      throw new UnauthorizedException(
        'LINE email permission is not yet approved. Please try again later.',
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
    return this.authService.oauthLogin(userDoc);
  }
}