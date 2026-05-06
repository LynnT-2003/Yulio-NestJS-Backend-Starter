import { ConfigService } from '@nestjs/config';
import { ApiKeyGuard } from './api-key.guard';

const makeContext = (headers: Record<string, string>) =>
  ({
    switchToHttp: () => ({ getRequest: () => ({ headers }) }),
  }) as any;

describe('ApiKeyGuard', () => {
  let guard: ApiKeyGuard;
  const configService = { getOrThrow: jest.fn().mockReturnValue('secret-key') } as any;

  beforeEach(() => {
    guard = new ApiKeyGuard(configService);
  });

  it('returns true when x-api-key matches', () => {
    expect(guard.canActivate(makeContext({ 'x-api-key': 'secret-key' }))).toBe(true);
  });

  it('returns false when x-api-key is missing', () => {
    expect(guard.canActivate(makeContext({}))).toBe(false);
  });

  it('returns false when x-api-key is wrong', () => {
    expect(guard.canActivate(makeContext({ 'x-api-key': 'wrong' }))).toBe(false);
  });
});
