import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import { UserService } from './user.service';
import { UserRepo } from './user.repo';
import { ConfigService } from '@nestjs/config';
import { MailService } from '../mail/mail.service';
import { OAuthProviderType } from '../common/enums/oauth-provider.enum';
import { UserRole } from '../common/enums/user-role.enum';
import { PaymentPlanId } from '../common/enums/payment-plan.enum';

const mockRepo = {
  findById: jest.fn(),
  findByEmail: jest.fn(),
  findByProvider: jest.fn(),
  create: jest.fn(),
  updateById: jest.fn(),
  updateProviderAccessToken: jest.fn(),
  removeExpiredRefreshTokens: jest.fn(),
  pushRefreshToken: jest.fn(),
  removeRefreshToken: jest.fn(),
  removeAllRefreshTokens: jest.fn(),
  findWithRefreshTokens: jest.fn(),
  saveEmailVerificationToken: jest.fn(),
  findByVerificationToken: jest.fn(),
  markEmailVerified: jest.fn(),
  updateUserRoleById: jest.fn(),
  findManyForModeration: jest.fn(),
  countForModeration: jest.fn(),
  setSuspension: jest.fn(),
};

const mockConfig = { get: jest.fn().mockReturnValue('5'), getOrThrow: jest.fn() };
const mockMail = { sendCustomEmail: jest.fn(), sendVerificationEmail: jest.fn() };

const makeUser = (overrides: Partial<any> = {}): any => ({
  _id: new Types.ObjectId(),
  email: 'test@example.com',
  displayName: 'Test User',
  avatar: null,
  role: UserRole.USER,
  isEmailVerified: false,
  providers: [{ provider: OAuthProviderType.LOCAL, providerId: 'test@example.com', connectedAt: new Date() }],
  refreshTokens: [],
  isSuspended: false,
  suspensionReason: null,
  suspendedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  stripeCustomerId: null,
  plan: PaymentPlanId.FREE,
  planExpiresAt: null,
  save: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

describe('UserService', () => {
  let service: UserService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: UserRepo, useValue: mockRepo },
        { provide: ConfigService, useValue: mockConfig },
        { provide: MailService, useValue: mockMail },
      ],
    }).compile();

    service = module.get(UserService);
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('delegates to repo', async () => {
      const user = makeUser();
      mockRepo.findById.mockResolvedValue(user);
      const result = await service.findById(user._id);
      expect(mockRepo.findById).toHaveBeenCalledWith(user._id);
      expect(result).toBe(user);
    });
  });

  describe('findByEmail', () => {
    it('calls repo with includePassword=true', async () => {
      mockRepo.findByEmail.mockResolvedValue(null);
      await service.findByEmail('a@b.com');
      expect(mockRepo.findByEmail).toHaveBeenCalledWith('a@b.com', true);
    });
  });

  describe('createLocalUser', () => {
    it('throws ConflictException when email is already taken', async () => {
      mockRepo.findByEmail.mockResolvedValue(makeUser());
      await expect(service.createLocalUser('a@b.com', 'hash', 'Name')).rejects.toThrow(ConflictException);
    });

    it('creates user when email is new', async () => {
      const user = makeUser();
      mockRepo.findByEmail.mockResolvedValue(null);
      mockRepo.create.mockResolvedValue(user);
      const result = await service.createLocalUser('a@b.com', 'hash', 'Name');
      expect(mockRepo.create).toHaveBeenCalled();
      expect(result).toBe(user);
    });
  });

  describe('findOrCreateOAuthUser', () => {
    const dto = {
      provider: OAuthProviderType.GOOGLE,
      providerId: 'gid1',
      email: 'g@example.com',
      emailVerified: true,
      displayName: 'G User',
      avatar: null,
      accessToken: 'token',
    };

    it('returns existing user found by provider', async () => {
      const user = makeUser();
      mockRepo.findByProvider.mockResolvedValue(user);
      mockRepo.updateProviderAccessToken.mockResolvedValue(undefined);
      const result = await service.findOrCreateOAuthUser(dto);
      expect(result).toBe(user);
    });

    it('links provider to email-matching account when emailVerified is true', async () => {
      const existing = makeUser({ providers: [] });
      existing.save = jest.fn().mockResolvedValue(existing);
      mockRepo.findByProvider.mockResolvedValue(null);
      mockRepo.findByEmail.mockResolvedValue(existing);
      await service.findOrCreateOAuthUser(dto);
      expect(existing.providers.length).toBe(1);
      expect(existing.save).toHaveBeenCalled();
    });

    it('throws UnauthorizedException when emailVerified is false and email matches existing account', async () => {
      const existing = makeUser();
      mockRepo.findByProvider.mockResolvedValue(null);
      mockRepo.findByEmail.mockResolvedValue(existing);
      await expect(
        service.findOrCreateOAuthUser({ ...dto, emailVerified: false }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('creates a new user when no match found', async () => {
      const newUser = makeUser();
      mockRepo.findByProvider.mockResolvedValue(null);
      mockRepo.findByEmail.mockResolvedValue(null);
      mockRepo.create.mockResolvedValue(newUser);
      const result = await service.findOrCreateOAuthUser(dto);
      expect(mockRepo.create).toHaveBeenCalled();
      expect(result).toBe(newUser);
    });
  });

  describe('updateUser', () => {
    it('returns public user on success', async () => {
      const user = makeUser();
      mockRepo.updateById.mockResolvedValue(user);
      const result = await service.updateUser(user._id, { displayName: 'New' });
      expect(result).toHaveProperty('email');
    });

    it('throws NotFoundException when user not found', async () => {
      mockRepo.updateById.mockResolvedValue(null);
      await expect(service.updateUser(new Types.ObjectId(), {})).rejects.toThrow(NotFoundException);
    });
  });

  describe('saveRefreshToken', () => {
    it('prunes expired tokens and pushes new token', async () => {
      mockRepo.removeExpiredRefreshTokens.mockResolvedValue(undefined);
      mockRepo.pushRefreshToken.mockResolvedValue(undefined);
      const id = new Types.ObjectId();
      const exp = new Date();
      await service.saveRefreshToken(id, 'hashedtoken', exp);
      expect(mockRepo.removeExpiredRefreshTokens).toHaveBeenCalledWith(id);
      expect(mockRepo.pushRefreshToken).toHaveBeenCalledWith(id, 'hashedtoken', exp, 5);
    });
  });

  describe('toPublic', () => {
    it('maps all expected fields', () => {
      const user = makeUser();
      const pub = service.toPublic(user);
      expect(pub).toHaveProperty('_id');
      expect(pub).toHaveProperty('email');
      expect(pub).toHaveProperty('providers');
      expect(pub).toHaveProperty('isSuspended');
      expect(pub).toHaveProperty('role');
    });
  });

  describe('parseObjectIdParam', () => {
    it('throws BadRequestException for invalid id', () => {
      expect(() => service.parseObjectIdParam('not-an-id')).toThrow(BadRequestException);
    });

    it('returns ObjectId for valid id', () => {
      const id = new Types.ObjectId().toHexString();
      expect(service.parseObjectIdParam(id)).toBeInstanceOf(Types.ObjectId);
    });
  });

  describe('suspendUser', () => {
    it('throws BadRequestException when actor tries to suspend themselves', async () => {
      const id = new Types.ObjectId().toHexString();
      await expect(service.suspendUser(id, id, 'reason')).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when target is admin', async () => {
      const actorId = new Types.ObjectId().toHexString();
      const targetId = new Types.ObjectId().toHexString();
      mockRepo.findById.mockResolvedValue(makeUser({ role: UserRole.ADMIN }));
      await expect(service.suspendUser(actorId, targetId, 'reason')).rejects.toThrow(BadRequestException);
    });

    it('suspends user and removes refresh tokens', async () => {
      const actorId = new Types.ObjectId().toHexString();
      const targetId = new Types.ObjectId().toHexString();
      const target = makeUser({ role: UserRole.USER });
      mockRepo.findById.mockResolvedValue(target);
      mockRepo.setSuspension.mockResolvedValue(target);
      mockRepo.removeAllRefreshTokens.mockResolvedValue(undefined);
      await service.suspendUser(actorId, targetId, 'spam');
      expect(mockRepo.setSuspension).toHaveBeenCalledWith(expect.any(Types.ObjectId), true, 'spam');
      expect(mockRepo.removeAllRefreshTokens).toHaveBeenCalled();
    });
  });

  describe('unsuspendUser', () => {
    it('calls setSuspension with false', async () => {
      const user = makeUser();
      mockRepo.setSuspension.mockResolvedValue(user);
      const id = new Types.ObjectId().toHexString();
      await service.unsuspendUser(id);
      expect(mockRepo.setSuspension).toHaveBeenCalledWith(expect.any(Types.ObjectId), false, null);
    });
  });
});
