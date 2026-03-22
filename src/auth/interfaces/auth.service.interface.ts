import { UserDocument } from '../../user/entity/user.entity';
import { RegisterDto } from '../dto/request/register.dto';
import { IAuthResponse, IAuthTokens } from '../../common/interfaces/auth.interface';

export interface IAuthService {
    /**
     * Register a new user with email + password.
     * Hashes password, creates user, issues token pair.
     * Throws ConflictException if email already exists.
     */
    register(dto: RegisterDto): Promise<IAuthResponse>;

    /**
     * Validate email + password during local login.
     * Called by local.strategy.ts — returns the user doc or null.
     * Never throws — returning null signals invalid credentials.
     */
    validateLocalUser(
        email: string,
        password: string,
    ): Promise<UserDocument | null>;

    /**
     * Issue tokens for a validated user.
     * Called by auth.controller.ts after LocalGuard passes.
     */
    login(user: UserDocument): Promise<IAuthResponse>;

    /**
     * Handle OAuth callback (Google etc.).
     * User is already validated and attached by the OAuth strategy.
     * Issues token pair and returns auth response.
     */
    oauthLogin(user: UserDocument): Promise<IAuthResponse>;

    /**
     * Rotate the refresh token.
     * Validates the incoming token, removes it, issues a new pair.
     * Throws UnauthorizedException if token is invalid or expired.
     */
    refreshTokens(
        userId: string,
        incomingRefreshToken: string,
    ): Promise<IAuthTokens>;

    /**
     * Invalidate the provided refresh token.
     * Removes it from the user's refreshTokens array.
     */
    logout(userId: string, refreshToken: string): Promise<void>;

    /**
     * Generate a signed access + refresh token pair for a user.
     * Private to the service but declared here for transparency.
     */
    generateTokens(user: UserDocument): Promise<IAuthTokens>;
}