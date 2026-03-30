import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, UpdateQuery } from 'mongoose';
import { User, UserDocument } from './entity/user.entity';

@Injectable()
export class UserRepo {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  // ─── Basic Finders ──────────────────────────────────────────────────────────

  async findById(id: string | Types.ObjectId): Promise<UserDocument | null> {
    return this.userModel.findById(id).exec();
  }

  async findByEmail(email: string, includePassword = false): Promise<UserDocument | null> {
    const query = this.userModel.findOne({ email: email.toLowerCase().trim() });
    if (includePassword) {
      query.select('+password');
    }
    return query.exec();
  }

  async findByProvider(provider: string, providerId: string): Promise<UserDocument | null> {
    return this.userModel.findOne({
      providers: {
        $elemMatch: {
          provider,
          providerId,
        },
      },
    }).exec();
  }

  // ─── Creation & Updates ───────────────────────────────────────────────────

  async create(userData: Partial<User>): Promise<UserDocument> {
    const user = new this.userModel(userData);
    return user.save();
  }

  async updateById(id: string | Types.ObjectId, updateData: UpdateQuery<User>): Promise<UserDocument | null> {
    return this.userModel.findByIdAndUpdate(id, updateData, { new: true }).exec();
  }

  async updateProviderAccessToken(
    userId: Types.ObjectId,
    provider: string,
    providerId: string,
    accessToken: string | null,
  ): Promise<void> {
    await this.userModel.updateOne(
      {
        _id: userId,
        'providers.provider': provider,
        'providers.providerId': providerId,
      },
      { $set: { 'providers.$.accessToken': accessToken } },
    );
  }

  // ─── Refresh Token Management ─────────────────────────────────────────────

  async findWithRefreshTokens(id: string | Types.ObjectId): Promise<UserDocument | null> {
    return this.userModel
      .findById(id)
      .select('+refreshTokens')
      .exec();
  }

  async removeExpiredRefreshTokens(id: string | Types.ObjectId): Promise<void> {
    await this.userModel.updateOne(
      { _id: id },
      { $pull: { refreshTokens: { expiresAt: { $lt: new Date() } } } },
    );
  }

  async pushRefreshToken(
    id: string | Types.ObjectId,
    hashedToken: string,
    expiresAt: Date,
    maxSessions: number,
  ): Promise<void> {
    await this.userModel.updateOne(
      { _id: id },
      {
        $push: {
          refreshTokens: {
            $each: [{ token: hashedToken, createdAt: new Date(), expiresAt }],
            $sort: { createdAt: -1 },
            $slice: maxSessions,
          },
        },
      },
    );
  }

  async removeRefreshToken(id: string | Types.ObjectId, hashedToken: string): Promise<void> {
    await this.userModel.updateOne(
      { _id: id },
      { $pull: { refreshTokens: { token: hashedToken } } },
    );
  }

  async removeAllRefreshTokens(id: string | Types.ObjectId): Promise<void> {
    await this.userModel.updateOne(
      { _id: id },
      { $set: { refreshTokens: [] } },
    );
  }

  // ─── Email Verification Management ────────────────────────────────────────

  async saveEmailVerificationToken(
    id: string | Types.ObjectId,
    hashedToken: string,
    expiresAt: Date,
  ): Promise<void> {
    await this.userModel.updateOne(
      { _id: id },
      {
        $set: {
          emailVerificationToken: hashedToken,
          emailVerificationExpiresAt: expiresAt,
        },
      },
    ).exec();
  }

  async findByVerificationToken(
    hashedToken: string,
  ): Promise<UserDocument | null> {
    return this.userModel
      .findOne({
        emailVerificationToken: hashedToken,
        emailVerificationExpiresAt: { $gt: new Date() },
      })
      .select('+emailVerificationToken')
      .exec();
  }

  async markEmailVerified(id: string | Types.ObjectId): Promise<void> {
    await this.userModel.updateOne(
      { _id: id },
      {
        $set: {
          isEmailVerified: true,
          emailVerificationToken: null,
          emailVerificationExpiresAt: null,
        },
      },
    ).exec();
  }
}
