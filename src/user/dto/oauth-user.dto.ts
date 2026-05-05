import { OAuthProviderType } from '../../common/enums/oauth-provider.enum';

// ─── Internal DTO — not received from HTTP body ────────────────────────────────
// Passport strategies normalise provider profiles into this shape
// before passing to user.service.ts findOrCreateOAuthUser().

export class OAuthUserDto {
    provider: OAuthProviderType;
    providerId: string;
    email: string | null;
    emailVerified: boolean;
    displayName: string;
    avatar: string | null;
    accessToken: string | null;
}