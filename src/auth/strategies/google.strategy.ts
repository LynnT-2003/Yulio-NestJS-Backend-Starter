import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { AuthService } from '../auth.service';
import { UserService } from '../../user/user.service';
import { OAuthProviderType } from '../../common/enums/oauth-provider.enum';
import { OAuthUserDto } from '../../user/dto/oauth-user.dto';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
    constructor(
        private readonly authService: AuthService,
        private readonly userService: UserService,
        private readonly configService: ConfigService,
    ) {
        super({
            clientID: configService.getOrThrow<string>('GOOGLE_CLIENT_ID'),
            clientSecret: configService.getOrThrow<string>('GOOGLE_CLIENT_SECRET'),
            callbackURL: configService.getOrThrow<string>('GOOGLE_CALLBACK_URL'),
            scope: ['email', 'profile'],
        });
    }

    // Called by passport after Google redirects back with a valid profile.
    // Normalise the Google profile into OAuthUserDto → findOrCreateOAuthUser → oauthLogin.
    // The return value is attached to req.user by passport.
    async validate(
        accessToken: string,
        _refreshToken: string,
        profile: any,
        done: VerifyCallback,
    ): Promise<any> {
        try {
            const dto: OAuthUserDto = {
                provider: OAuthProviderType.GOOGLE,
                providerId: profile.id,
                email: profile.emails?.[0]?.value ?? null,
                emailVerified: profile.emails?.[0]?.verified === true,
                displayName: profile.displayName ?? profile.emails?.[0]?.value ?? 'User',
                avatar: profile.photos?.[0]?.value ?? null,
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