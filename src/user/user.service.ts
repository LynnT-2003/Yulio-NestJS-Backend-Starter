import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { isValidObjectId, QueryFilter, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';

import { UserDocument } from './entity/user.entity';
import { OAuthUserDto } from './dto/oauth-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { IUserService } from './interfaces/user.service.interface';
import {
  IUserAdminModerationView,
  IUserPublic,
} from '../common/interfaces/user.interface';
import { OAuthProviderType } from '../common/enums/oauth-provider.enum';
import { UserRepo } from './user.repo';
import { ConfigService } from '@nestjs/config';
import { MailService } from '../mail/mail.service';
import { UserRole } from '../common/enums/user-role.enum';

const MODERATION_DEFAULT_LIMIT = 20;
const MODERATION_MAX_LIMIT = 50;

export type ModerationUserListResult = {
  items: IUserAdminModerationView[];
  total: number;
  page: number;
  limit: number;
};

@Injectable()
export class UserService implements IUserService {
  constructor(
    private readonly userRepo: UserRepo,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
  ) { }

  // ─── Find By Id ─────────────────────────────────────────────────────────────

  async findById(id: string | Types.ObjectId): Promise<UserDocument | null> {
    return this.userRepo.findById(id);
  }

  // ─── Find By Email ───────────────────────────────────────────────────────────

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userRepo.findByEmail(email, true); // true for includePassword
  }

  // ─── Create Local User ───────────────────────────────────────────────────────

  async createLocalUser(
    email: string,
    hashedPassword: string,
    displayName: string,
  ): Promise<UserDocument> {
    const existing = await this.userRepo.findByEmail(email);

    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    return this.userRepo.create({
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      displayName,
      providers: [
        {
          provider: OAuthProviderType.LOCAL,
          providerId: email.toLowerCase().trim(),
          accessToken: null,
          connectedAt: new Date(),
        },
      ],
    });
  }

  // ─── Find Or Create OAuth User ───────────────────────────────────────────────

  async findOrCreateOAuthUser(dto: OAuthUserDto): Promise<UserDocument> {
    // 1. Look up by provider + providerId (compound index hit)
    const byProvider = await this.userRepo.findByProvider(dto.provider, dto.providerId);

    if (byProvider) {
      // Update accessToken in case it rotated
      await this.userRepo.updateProviderAccessToken(byProvider._id, dto.provider, dto.providerId, dto.accessToken);
      return byProvider;
    }

    // 2. Same email exists — link the new provider to the existing account
    if (dto.email) {
      const byEmail = await this.userRepo.findByEmail(dto.email);

      if (byEmail) {
        byEmail.providers.push({
          provider: dto.provider,
          providerId: dto.providerId,
          accessToken: dto.accessToken,
          connectedAt: new Date(),
        });


        if (!byEmail.isEmailVerified && dto.provider !== OAuthProviderType.LOCAL) {
          this.mailService.sendCustomEmail(byEmail.email!, 'Account Verified', `Hello ${byEmail.displayName}, Your account has been verified successfully.`);
          byEmail.isEmailVerified = true;
        }

        return byEmail.save();
      }
    }

    // 3. Brand new user
    const user = await this.userRepo.create({
      email: dto.email ? dto.email.toLowerCase().trim() : null,
      displayName: dto.displayName,
      avatar: dto.avatar,
      isEmailVerified: dto.provider === OAuthProviderType.LOCAL ? false : true,
      providers: [
        {
          provider: dto.provider,
          providerId: dto.providerId,
          accessToken: dto.accessToken,
          connectedAt: new Date(),
        },
      ],
    });

    return user;
  }

  // ─── Update User ─────────────────────────────────────────────────────────────

  async updateUser(
    id: string | Types.ObjectId,
    dto: UpdateUserDto,
  ): Promise<IUserPublic> {
    const user = await this.userRepo.updateById(id, { $set: dto });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.toPublic(user);
  }

  // ─── Refresh Token Management ────────────────────────────────────────────────

  async saveRefreshToken(
    id: string | Types.ObjectId,
    hashedToken: string,
    expiresAt: Date,
  ): Promise<void> {
    // Industry Standard: Limit the maximum number of concurrent active sessions
    const MAX_SESSIONS = parseInt(this.configService.get<string>('MAX_SESSIONS', '5'), 10);

    // 1. Prune completely expired tokens first
    await this.userRepo.removeExpiredRefreshTokens(id);

    // 2. Push the new token, sort the array by newest first, and slice to keep only the latest MAX_SESSIONS
    await this.userRepo.pushRefreshToken(id, hashedToken, expiresAt, MAX_SESSIONS);
  }

  async removeRefreshToken(
    id: string | Types.ObjectId,
    hashedToken: string,
  ): Promise<void> {
    await this.userRepo.removeRefreshToken(id, hashedToken);
  }

  async removeAllRefreshTokens(id: string | Types.ObjectId): Promise<void> {
    await this.userRepo.removeAllRefreshTokens(id);
  }

  // ─── Validate Refresh Token ──────────────────────────────────────────────────
  // Not on the interface — called internally by auth.service.ts.
  // Fetches the user with refreshTokens (+select) and compares hashes.

  async findValidRefreshToken(
    id: string | Types.ObjectId,
    incomingToken: string,
  ): Promise<UserDocument | null> {
    const user = await this.userRepo.findWithRefreshTokens(id);

    if (!user) return null;

    const now = new Date();

    for (const stored of user.refreshTokens) {
      if (stored.expiresAt < now) continue; // skip expired
      const match = await bcrypt.compare(incomingToken, stored.token);
      if (match) return user;
    }

    return null;
  }

  // ─── To Public ───────────────────────────────────────────────────────────────

  toPublic(user: UserDocument): IUserPublic {
    return {
      _id: user._id,
      email: user.email,
      displayName: user.displayName,
      avatar: user.avatar,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
      providers: user.providers.map(p => p.provider),
      providerDetails: user.providers.map(p => ({
        provider: p.provider,
        connectedAt: p.connectedAt,
      })),
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async saveEmailVerificationToken(
    id: string | Types.ObjectId,
    hashedToken: string,
    expiresAt: Date,
  ): Promise<void> {
    await this.userRepo.saveEmailVerificationToken(id, hashedToken, expiresAt);
  }

  async findByVerificationToken(hashedToken: string): Promise<UserDocument | null> {
    return this.userRepo.findByVerificationToken(hashedToken);
  }

  async markEmailVerified(id: string | Types.ObjectId): Promise<void> {
    await this.userRepo.markEmailVerified(id);
  }

  async isUserHasAnySocialLoginProvider(id: string | Types.ObjectId): Promise<boolean> {
    const user = await this.userRepo.findById(id);
    if (!user) return false;
    return user.providers.some(p => p.provider !== OAuthProviderType.LOCAL);
  }

  async updateUserRoleById(id: string | Types.ObjectId, role: UserRole): Promise<Partial<IUserPublic>> {
    const user = await this.userRepo.updateUserRoleById(id, role);
    if (!user) throw new NotFoundException('User not found');
    return {
      _id: user._id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
    };
  }

  // ─── Admin moderation ────────────────────────────────────────────────────────

  toAdminModerationView(user: UserDocument): IUserAdminModerationView {
    return {
      ...this.toPublic(user),
      isSuspended: !!user.isSuspended,
      suspensionReason: user.suspensionReason ?? null,
      suspendedAt: user.suspendedAt ?? null,
    };
  }

  parseObjectIdParam(id: string): Types.ObjectId {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('Invalid user id');
    }
    return new Types.ObjectId(id);
  }

  async listUsersForModeration(params: {
    page: number;
    limit: number;
    search?: string;
    suspended?: boolean;
  }): Promise<ModerationUserListResult> {
    const page = Math.max(1, params.page);
    const limit = Math.min(
      MODERATION_MAX_LIMIT,
      Math.max(1, params.limit || MODERATION_DEFAULT_LIMIT),
    );
    const filter: QueryFilter<UserDocument> = {};

    const q = params.search?.trim();
    if (q) {
      const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp(escaped, 'i');
      filter.$or = [{ email: re }, { displayName: re }];
    }

    if (typeof params.suspended === 'boolean') {
      filter.isSuspended = params.suspended;
    }

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.userRepo.findManyForModeration(filter, skip, limit),
      this.userRepo.countForModeration(filter),
    ]);

    return {
      items: items.map((u) => this.toAdminModerationView(u)),
      total,
      page,
      limit,
    };
  }

  async getUserForModerationById(id: string): Promise<IUserAdminModerationView> {
    const oid = this.parseObjectIdParam(id);
    const user = await this.userRepo.findById(oid);
    if (!user) throw new NotFoundException('User not found');
    return this.toAdminModerationView(user);
  }

  async suspendUser(
    actorUserId: string,
    targetId: string,
    reason?: string,
  ): Promise<IUserAdminModerationView> {
    const targetOid = this.parseObjectIdParam(targetId);
    const actorOid = this.parseObjectIdParam(actorUserId);

    if (targetOid.equals(actorOid)) {
      throw new BadRequestException('Cannot suspend your own account');
    }

    const existing = await this.userRepo.findById(targetOid);
    if (!existing) throw new NotFoundException('User not found');
    if (existing.role === UserRole.ADMIN) {
      throw new BadRequestException('Cannot suspend an administrator');
    }

    const trimmed = reason?.trim();
    const user = await this.userRepo.setSuspension(
      targetOid,
      true,
      trimmed && trimmed.length > 0 ? trimmed : null,
    );
    if (!user) throw new NotFoundException('User not found');

    await this.removeAllRefreshTokens(targetOid);
    return this.toAdminModerationView(user);
  }

  async unsuspendUser(targetId: string): Promise<IUserAdminModerationView> {
    const targetOid = this.parseObjectIdParam(targetId);
    const user = await this.userRepo.setSuspension(targetOid, false, null);
    if (!user) throw new NotFoundException('User not found');
    return this.toAdminModerationView(user);
  }
}