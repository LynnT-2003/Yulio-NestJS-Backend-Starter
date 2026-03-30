import { Types } from 'mongoose';
import { OAuthUserDto } from '../dto/oauth-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { UserDocument } from '../entity/user.entity';
import { IUserPublic } from '../../common/interfaces/user.interface';

export interface IUserService {
    /**
     * Find a user by their MongoDB _id.
     * Returns null if not found.
     */
    findById(id: string | Types.ObjectId): Promise<UserDocument | null>;

    /**
     * Find a user by email.
     * Used by local.strategy.ts to look up the user before password comparison.
     * Explicitly selects +password since it is excluded by default.
     */
    findByEmail(email: string): Promise<UserDocument | null>;

    /**
     * Find or create a user from an OAuth profile.
     * Called by google.strategy.ts after successful OAuth callback.
     *
     * Logic:
     *   1. Look up by providers.provider + providers.providerId
     *   2. If found → return existing user
     *   3. If not found but email exists → link provider to existing account
     *   4. If neither → create new user
     */
    findOrCreateOAuthUser(dto: OAuthUserDto): Promise<UserDocument>;

    /**
     * Create a new user from email + hashed password.
     * Called by auth.service.ts during local registration.
     */
    createLocalUser(
        email: string,
        hashedPassword: string,
        displayName: string,
    ): Promise<UserDocument>;

    /**
     * Update allowed profile fields.
     * Returns the updated public user shape.
     */
    updateUser(
        id: string | Types.ObjectId,
        dto: UpdateUserDto,
    ): Promise<IUserPublic>;

    /**
     * Append a hashed refresh token to the user's refreshTokens array.
     * Old expired tokens are pruned at the same time.
     */
    saveRefreshToken(
        id: string | Types.ObjectId,
        hashedToken: string,
        expiresAt: Date,
    ): Promise<void>;

    /**
     * Remove a specific refresh token from the array.
     * Called on logout or token rotation.
     */
    removeRefreshToken(
        id: string | Types.ObjectId,
        hashedToken: string,
    ): Promise<void>;

    /**
     * Remove all refresh tokens for a user.
     * Called on logout-all-devices.
     */
    removeAllRefreshTokens(id: string | Types.ObjectId): Promise<void>;

    /**
     * Map a UserDocument to the safe public shape.
     * Used before any user object is sent in a response.
     */
    toPublic(user: UserDocument): IUserPublic;

    saveEmailVerificationToken(
        id: string | Types.ObjectId,
        hashedToken: string,
        expiresAt: Date,
    ): Promise<void>;

    findByVerificationToken(hashedToken: string): Promise<UserDocument | null>;

    markEmailVerified(id: string | Types.ObjectId): Promise<void>;
}