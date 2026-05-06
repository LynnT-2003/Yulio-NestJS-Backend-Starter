import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { UserService } from '../user/user.service';
import { MailService } from '../mail/mail.service';
import { Types } from 'mongoose';
import { UserRole } from '../common/enums/user-role.enum';
import { PaymentPlanId } from '../common/enums/payment-plan.enum';

const mockUserService = {
  findByEmail: jest.fn(),
  createLocalUser: jest.fn(),
  toPublic: jest.fn(),
  findValidRefreshToken: jest.fn(),
  removeRefreshToken: jest.fn(),
  saveRefreshToken: jest.fn(),
  findByVerificationToken: jest.fn(),
  markEmailVerified: jest.fn(),
  saveEmailVerificationToken: jest.fn(),
  findById: jest.fn(),
};

const mockJwtService = { signAsync: jest.fn().mockResolvedValue('mock-token') };
const mockConfigService = {
  getOrThrow: jest.fn().mockReturnValue('secret'),
  get: jest.fn((key: string) => {
    if (key === 'JWT_ACCESS_EXPIRES_IN') return '15m';
    if (key === 'JWT_REFRESH_EXPIRES_IN') return '30d';
    if (key === 'VERIFY_REDIRECT_URL') return null;
    return undefined;
  }),
};
const mockMailService = {
  sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
  sendCustomEmail: jest.fn().mockResolvedValue(undefined),
};

const makeUser = (overrides: Partial<any> = {}): any => ({
  _id: new Types.ObjectId(),
  email: 'test@example.com',
  displayName: 'Test',
  password: null,
  isEmailVerified: false,
  role: UserRole.USER,
  plan: PaymentPlanId.FREE,
  providers: [],
  refreshTokens: [],
  ...overrides,
});

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UserService, useValue: mockUserService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: MailService, useValue: mockMailService },
      ],
    }).compile();

    service = module.get(AuthService);
    jest.clearAllMocks();
    mockJwtService.signAsync.mockResolvedValue('mock-token');
    mockUserService.saveRefreshToken.mockResolvedValue(undefined);
    mockUserService.toPublic.mockReturnValue({ email: 'test@example.com' });
  });

  describe('register', () => {
    it('creates user and returns tokens', async () => {
      const user = makeUser();
      mockUserService.findByEmail.mockResolvedValue(null);
      mockUserService.createLocalUser.mockResolvedValue(user);
      mockMailService.sendVerificationEmail.mockResolvedValue(undefined);

      const result = await service.register({ email: 'a@b.com', password: 'pass', displayName: 'A' });
      expect(result).toHaveProperty('tokens');
      expect(result).toHaveProperty('user');
    });

    it('throws ConflictException when email already exists', async () => {
      mockUserService.findByEmail.mockResolvedValue(makeUser());
      await expect(service.register({ email: 'a@b.com', password: 'pass', displayName: 'A' })).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('validateLocalUser', () => {
    it('returns user on correct password', async () => {
      const hash = await bcrypt.hash('correct', 10);
      const user = makeUser({ password: hash });
      mockUserService.findByEmail.mockResolvedValue(user);
      const result = await service.validateLocalUser('a@b.com', 'correct');
      expect(result).toBe(user);
    });

    it('returns null when user not found', async () => {
      mockUserService.findByEmail.mockResolvedValue(null);
      expect(await service.validateLocalUser('a@b.com', 'pass')).toBeNull();
    });

    it('returns null on password mismatch', async () => {
      const hash = await bcrypt.hash('correct', 10);
      mockUserService.findByEmail.mockResolvedValue(makeUser({ password: hash }));
      expect(await service.validateLocalUser('a@b.com', 'wrong')).toBeNull();
    });
  });

  describe('login', () => {
    it('returns tokens and user', async () => {
      const user = makeUser();
      const result = await service.login(user);
      expect(result).toHaveProperty('tokens');
      expect(result).toHaveProperty('user');
    });
  });

  describe('oauthLogin', () => {
    it('returns tokens and user', async () => {
      const user = makeUser();
      const result = await service.oauthLogin(user);
      expect(result).toHaveProperty('tokens');
    });
  });

  describe('refreshTokens', () => {
    it('rotates tokens on valid refresh token', async () => {
      const storedHash = await bcrypt.hash('raw-token', 10);
      const user = makeUser({ refreshTokens: [{ token: storedHash, expiresAt: new Date(Date.now() + 99999) }] });
      mockUserService.findValidRefreshToken.mockResolvedValue(user);
      mockUserService.removeRefreshToken.mockResolvedValue(undefined);

      const result = await service.refreshTokens(String(user._id), 'raw-token');
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('throws UnauthorizedException when token is invalid', async () => {
      mockUserService.findValidRefreshToken.mockResolvedValue(null);
      await expect(service.refreshTokens('uid', 'bad-token')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('calls removeRefreshToken when token is valid', async () => {
      const storedHash = await bcrypt.hash('raw-token', 10);
      const user = makeUser({ refreshTokens: [{ token: storedHash, expiresAt: new Date(Date.now() + 99999) }] });
      mockUserService.findValidRefreshToken.mockResolvedValue(user);
      mockUserService.removeRefreshToken.mockResolvedValue(undefined);

      await service.logout(String(user._id), 'raw-token');
      expect(mockUserService.removeRefreshToken).toHaveBeenCalled();
    });

    it('silently returns when token is invalid', async () => {
      mockUserService.findValidRefreshToken.mockResolvedValue(null);
      await expect(service.logout('uid', 'bad')).resolves.toBeUndefined();
    });
  });

  describe('sendVerificationEmail', () => {
    it('throws BadRequestException when already verified', async () => {
      await expect(service.sendVerificationEmail(makeUser({ isEmailVerified: true }))).rejects.toThrow(
        BadRequestException,
      );
    });

    it('saves token and sends email', async () => {
      mockUserService.saveEmailVerificationToken.mockResolvedValue(undefined);
      mockMailService.sendVerificationEmail.mockResolvedValue(undefined);
      const user = makeUser({ email: 'a@b.com', isEmailVerified: false });
      await service.sendVerificationEmail(user);
      expect(mockUserService.saveEmailVerificationToken).toHaveBeenCalled();
      expect(mockMailService.sendVerificationEmail).toHaveBeenCalled();
    });
  });

  describe('verifyEmail', () => {
    it('throws BadRequestException on bad token', async () => {
      mockUserService.findByVerificationToken.mockResolvedValue(null);
      await expect(service.verifyEmail('badtoken')).rejects.toThrow(BadRequestException);
    });

    it('marks verified and returns null redirectUrl when not configured', async () => {
      const user = makeUser({ email: 'a@b.com' });
      mockUserService.findByVerificationToken.mockResolvedValue(user);
      mockUserService.markEmailVerified.mockResolvedValue(undefined);
      mockMailService.sendCustomEmail.mockResolvedValue(undefined);
      mockConfigService.get.mockImplementation((k: string) => (k === 'VERIFY_REDIRECT_URL' ? null : undefined));

      const result = await service.verifyEmail('validtoken');
      expect(mockUserService.markEmailVerified).toHaveBeenCalled();
      expect(result.redirectUrl).toBeNull();
    });
  });
});
