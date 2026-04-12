import {
  ConflictException,
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';

import { UserService } from '../user/user.service';
import { UserDocument } from '../user/entity/user.entity';
import { RegisterDto } from './dto/request/register.dto';
import { IAuthService } from './interfaces/auth.service.interface';
import {
  IAuthResponse,
  IAuthTokens,
  IJwtPayload,
} from '../common/interfaces/auth.interface';
import { StringValue } from 'ms';
import * as crypto from 'crypto';
import { MailService } from '../mail/mail.service';
import { Logger } from '@nestjs/common';

const SALT_ROUNDS = 10;
const REFRESH_TOKEN_EXPIRY_DAYS = 30;

@Injectable()
export class AuthService implements IAuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
  ) { }

  // ─── Register ────────────────────────────────────────────────────────────────

  async register(dto: RegisterDto): Promise<IAuthResponse> {
    const existing = await this.userService.findByEmail(dto.email);

    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(dto.password, SALT_ROUNDS);

    const user = await this.userService.createLocalUser(
      dto.email,
      hashedPassword,
      dto.displayName,
    );

    this.sendVerificationEmail(user).catch((err) =>
      this.logger.error('Failed to send verification email', err),
    );

    const tokens = await this.generateTokens(user);

    return {
      user: this.userService.toPublic(user),
      tokens,
    };
  }

  // ─── Validate Local User ─────────────────────────────────────────────────────

  // Called by local.strategy.ts — never throws, returns null on failure.
  async validateLocalUser(
    email: string,
    password: string,
  ): Promise<UserDocument | null> {
    const user = await this.userService.findByEmail(email);

    if (!user || !user.password) return null;

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) return null;

    return user;
  }

  // ─── Login (local) ───────────────────────────────────────────────────────────

  // Called by auth.controller after LocalGuard attaches user to req.
  async login(user: UserDocument): Promise<IAuthResponse> {
    const tokens = await this.generateTokens(user);

    return {
      user: this.userService.toPublic(user),
      tokens,
    };
  }

  // ─── OAuth Login ─────────────────────────────────────────────────────────────

  // Called by google.strategy after findOrCreateOAuthUser resolves.
  async oauthLogin(user: UserDocument): Promise<IAuthResponse> {
    const tokens = await this.generateTokens(user);

    return {
      user: this.userService.toPublic(user),
      tokens,
    };
  }

  // ─── Refresh Tokens ──────────────────────────────────────────────────────────

  async refreshTokens(
    userId: string,
    incomingRefreshToken: string,
  ): Promise<IAuthTokens> {
    const user = await this.userService.findValidRefreshToken(
      userId,
      incomingRefreshToken,
    );

    if (!user) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Rotate — remove old token, issue new pair
    for (const stored of user.refreshTokens) {
      const match = await bcrypt.compare(incomingRefreshToken, stored.token);
      if (match) {
        await this.userService.removeRefreshToken(user._id, stored.token);
        break;
      }
    }

    return this.generateTokens(user);
  }

  // ─── Logout ──────────────────────────────────────────────────────────────────

  async logout(userId: string, refreshToken: string): Promise<void> {
    const user = await this.userService.findValidRefreshToken(
      userId,
      refreshToken,
    );

    if (!user) return; // already logged out or invalid — fail silently

    for (const stored of user.refreshTokens) {
      const match = await bcrypt.compare(refreshToken, stored.token);
      if (match) {
        await this.userService.removeRefreshToken(user._id, stored.token);
        break;
      }
    }
  }

  // ─── Generate Tokens ─────────────────────────────────────────────────────────

  async generateTokens(user: UserDocument): Promise<IAuthTokens> {
    const payload = {
      sub: user._id.toString(),
      email: user.email,
      role: user.role,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: (this.configService.get('JWT_ACCESS_EXPIRES_IN') ?? '15m') as StringValue,

      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: (this.configService.get('JWT_REFRESH_EXPIRES_IN') ?? '30d') as StringValue,

      }),
    ]);

    // Hash and persist the refresh token
    const hashedRefreshToken = await bcrypt.hash(refreshToken, SALT_ROUNDS);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

    await this.userService.saveRefreshToken(
      user._id,
      hashedRefreshToken,
      expiresAt,
    );

    return { accessToken, refreshToken };
  }

  // ─── Send Verification Email ──────────────────────────────────────────────────

  async sendVerificationEmail(user: UserDocument): Promise<void> {

    if (user.isEmailVerified) {
      throw new BadRequestException('Email already verified');
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    await this.userService.saveEmailVerificationToken(
      user._id,
      hashedToken,
      expiresAt,
    );

    await this.mailService.sendVerificationEmail(
      user.email!,
      user.displayName,
      rawToken,
    );
  }

  // ─── Verify Email ─────────────────────────────────────────────────────────────

  async verifyEmail(rawToken: string): Promise<{ redirectUrl: string | null }> {
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

    const user = await this.userService.findByVerificationToken(hashedToken);

    if (!user) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    await this.userService.markEmailVerified(user._id);

    this.mailService.sendCustomEmail(user.email!, 'Account Verified', `Hello ${user.displayName}, Your account has been verified successfully.`);

    const redirectUrl = this.configService.get<string>('VERIFY_REDIRECT_URL') ?? null;

    return { redirectUrl };
  }
}