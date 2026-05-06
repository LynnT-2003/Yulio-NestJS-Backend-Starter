import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UserService } from '../user/user.service';
import { UserRole } from '../common/enums/user-role.enum';
import { Types } from 'mongoose';

const mockAuthService = {
  register: jest.fn(),
  login: jest.fn(),
  refreshTokens: jest.fn(),
  logout: jest.fn(),
  verifyEmail: jest.fn(),
  sendVerificationEmail: jest.fn(),
};

const mockUserService = {
  findById: jest.fn(),
};

const mockConfigService = {
  get: jest.fn().mockReturnValue(undefined),
};

const mockCurrentUser = { userId: 'uid1', email: 'a@b.com', role: UserRole.USER, isSuspended: false };

const mockAuthResponse = {
  user: { _id: new Types.ObjectId(), email: 'a@b.com' },
  tokens: { accessToken: 'access', refreshToken: 'refresh' },
};

const makeRes = () => {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const redirect = jest.fn();
  return { status, json, redirect } as any;
};

describe('AuthController', () => {
  let controller: AuthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: UserService, useValue: mockUserService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    controller = module.get(AuthController);
    jest.clearAllMocks();
  });

  it('register delegates to authService.register', async () => {
    mockAuthService.register.mockResolvedValue(mockAuthResponse);
    const result = await controller.register({ email: 'a@b.com', password: 'pass', displayName: 'A' });
    expect(mockAuthService.register).toHaveBeenCalled();
    expect(result).toBe(mockAuthResponse);
  });

  it('login delegates to authService.login', async () => {
    mockAuthService.login.mockResolvedValue(mockAuthResponse);
    const result = await controller.login({ user: {} as any });
    expect(mockAuthService.login).toHaveBeenCalled();
    expect(result).toBe(mockAuthResponse);
  });

  it('refresh delegates to authService.refreshTokens', async () => {
    mockAuthService.refreshTokens.mockResolvedValue({ accessToken: 'new', refreshToken: 'newrt' });
    const result = await controller.refresh({ userId: 'uid1', refreshToken: 'rt' });
    expect(mockAuthService.refreshTokens).toHaveBeenCalledWith('uid1', 'rt');
    expect(result).toHaveProperty('accessToken');
  });

  it('logout delegates to authService.logout with current user', async () => {
    mockAuthService.logout.mockResolvedValue(undefined);
    await controller.logout({ userId: 'uid1', refreshToken: 'rt' }, mockCurrentUser);
    expect(mockAuthService.logout).toHaveBeenCalledWith('uid1', 'rt');
  });

  describe('verifyEmail', () => {
    it('throws BadRequestException when token is missing', async () => {
      const res = makeRes();
      await expect(controller.verifyEmail(undefined as any, res)).rejects.toThrow(BadRequestException);
    });

    it('redirects when redirectUrl is set', async () => {
      const res = makeRes();
      mockAuthService.verifyEmail.mockResolvedValue({ redirectUrl: 'https://app.example.com/verified' });
      await controller.verifyEmail('token123', res);
      expect(res.redirect).toHaveBeenCalledWith('https://app.example.com/verified');
    });

    it('returns JSON when no redirectUrl', async () => {
      const res = makeRes();
      mockAuthService.verifyEmail.mockResolvedValue({ redirectUrl: null });
      await controller.verifyEmail('token123', res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('resendVerification', () => {
    it('throws NotFoundException when user not found', async () => {
      mockUserService.findById.mockResolvedValue(null);
      await expect(controller.resendVerification(mockCurrentUser)).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when email already verified', async () => {
      mockUserService.findById.mockResolvedValue({ isEmailVerified: true });
      await expect(controller.resendVerification(mockCurrentUser)).rejects.toThrow(BadRequestException);
    });

    it('returns success message when verification email sent', async () => {
      mockUserService.findById.mockResolvedValue({ isEmailVerified: false });
      mockAuthService.sendVerificationEmail.mockResolvedValue(undefined);
      const result = await controller.resendVerification(mockCurrentUser);
      expect(result.message).toContain('sent');
    });
  });

  describe('OAuth callback (respondOAuthSuccess)', () => {
    it('returns JSON when no frontendOauthCallbackUrl is configured', () => {
      mockConfigService.get.mockReturnValue(undefined);
      const res = makeRes();
      controller.googleCallback({ user: mockAuthResponse as any }, res);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('redirects when frontendOauthCallbackUrl is configured', () => {
      mockConfigService.get.mockReturnValue({ frontendOauthCallbackUrl: 'https://app.example.com/callback' });
      const res = makeRes();
      controller.googleCallback({ user: mockAuthResponse as any }, res);
      expect(res.redirect).toHaveBeenCalled();
    });
  });
});
