import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { OAuthProviderType } from '../../common/enums/oauth-provider.enum';
import { UserRole } from '../../common/enums/user-role.enum';
import { PaymentPlanId } from '../../common/enums/payment-plan.enum';

// ─── Subdocument: OAuthProvider ───────────────────────────────────────────────

@Schema({ _id: false })
export class OAuthProvider {
    @Prop({
        type: String,
        enum: OAuthProviderType,
        required: true,
    })
    provider: OAuthProviderType;

    @Prop({ required: true })
    providerId: string;

    @Prop({ type: String, default: null })
    accessToken: string | null;

    @Prop({ required: true, default: () => new Date() })
    connectedAt: Date;
}

export const OAuthProviderSchema = SchemaFactory.createForClass(OAuthProvider);

// ─── Subdocument: RefreshToken ─────────────────────────────────────────────────

@Schema({ _id: false })
export class RefreshToken {
    @Prop({ required: true })
    token: string; // stored as bcrypt hash — never raw

    @Prop({ required: true, default: () => new Date() })
    createdAt: Date;

    @Prop({ required: true })
    expiresAt: Date;
}

export const RefreshTokenSchema = SchemaFactory.createForClass(RefreshToken);

// ─── Main Entity: User ─────────────────────────────────────────────────────────

@Schema({
    timestamps: true,         // auto createdAt + updatedAt
    collection: 'users',
})
export class User {
    // Mongoose attaches _id automatically — exposing as a typed getter
    _id: Types.ObjectId;

    @Prop({
        type: String,
        lowercase: true,
        trim: true,
        sparse: true,           // unique but allows multiple nulls (OAuth-only users)
        unique: true,
        default: null,
    })
    email: string | null;

    @Prop({
        type: String,
        default: null,
        select: false,          // never returned in queries unless explicitly requested
    })
    password: string | null;  // null for OAuth-only users

    @Prop({
        type: String,
        trim: true,
        required: true,
    })
    displayName: string;

    @Prop({ type: String, default: null })
    avatar: string | null;

    @Prop({
        type: String,
        enum: UserRole,
        default: UserRole.USER,
    })
    role: UserRole;

    @Prop({
        type: [OAuthProviderSchema],
        default: [],
    })
    providers: OAuthProvider[];

    @Prop({
        type: [RefreshTokenSchema],
        default: [],
        select: false,          // never returned in queries unless explicitly requested
    })
    refreshTokens: RefreshToken[];

    @Prop({ type: Boolean, default: false })
    isEmailVerified: boolean;

    @Prop({ type: String, default: null, select: false })
    emailVerificationToken: string | null;

    @Prop({ type: Date, default: null })
    emailVerificationExpiresAt: Date | null;

    @Prop({ type: Boolean, default: false })
    isSuspended: boolean;

    @Prop({ type: String, default: null })
    suspensionReason: string | null;

    @Prop({ type: Date, default: null })
    suspendedAt: Date | null;

    // Injected by timestamps: true
    createdAt: Date;
    updatedAt: Date;

    @Prop({ type: String, default: null })
    stripeCustomerId: string | null;

    @Prop({ type: String, enum: PaymentPlanId, default: PaymentPlanId.FREE })
    plan: PaymentPlanId;

    @Prop({ type: Date, default: null })
    planExpiresAt: Date | null;
}

export const UserSchema = SchemaFactory.createForClass(User);

// ─── Document Type ─────────────────────────────────────────────────────────────

// UserDocument is what Mongoose actually returns from queries.
// Use this as the return type in your service methods.
export type UserDocument = User & Document;

// ─── Indexes ───────────────────────────────────────────────────────────────────

// Compound index: quickly find a user by a specific OAuth provider + providerId.
// Used in findOrCreateOAuthUser() in user.service.ts.
UserSchema.index({ 'providers.provider': 1, 'providers.providerId': 1 });
UserSchema.index({ isSuspended: 1, createdAt: -1 });