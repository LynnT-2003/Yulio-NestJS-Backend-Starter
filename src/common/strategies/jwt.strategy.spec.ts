import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from './jwt.strategy';
import { UserService } from '../../user/user.service';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '../enums/user-role.enum';

const mockUserService = { findById: jest.fn() };
const mockConfigService = { getOrThrow: jest.fn().mockReturnValue('test-secret') };

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        { provide: UserService, useValue: mockUserService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    strategy = module.get(JwtStrategy);
    jest.clearAllMocks();
  });

  it('returns ICurrentUser when user exists', async () => {
    const user = { role: UserRole.USER, isSuspended: false };
    mockUserService.findById.mockResolvedValue(user);

    const result = await strategy.validate({
      sub: 'uid1',
      email: 'a@b.com',
      role: UserRole.USER,
    });

    expect(result).toEqual({
      userId: 'uid1',
      email: 'a@b.com',
      role: UserRole.USER,
      isSuspended: false,
    });
  });

  it('throws UnauthorizedException when user not found', async () => {
    mockUserService.findById.mockResolvedValue(null);
    await expect(
      strategy.validate({ sub: 'uid1', email: 'a@b.com', role: UserRole.USER }),
    ).rejects.toThrow(new UnauthorizedException('User no longer exists'));
  });
});
