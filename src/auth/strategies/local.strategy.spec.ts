import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { LocalStrategy } from './local.strategy';
import { AuthService } from '../auth.service';

const mockAuthService = { validateLocalUser: jest.fn() };

describe('LocalStrategy', () => {
  let strategy: LocalStrategy;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocalStrategy,
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compile();

    strategy = module.get(LocalStrategy);
    jest.clearAllMocks();
  });

  it('returns user when credentials are valid', async () => {
    const user = { _id: '1', email: 'a@b.com' } as any;
    mockAuthService.validateLocalUser.mockResolvedValue(user);
    const result = await strategy.validate('a@b.com', 'pass');
    expect(result).toBe(user);
  });

  it('throws UnauthorizedException when credentials are invalid', async () => {
    mockAuthService.validateLocalUser.mockResolvedValue(null);
    await expect(strategy.validate('a@b.com', 'wrong')).rejects.toThrow(
      new UnauthorizedException('Invalid email or password'),
    );
  });
});
