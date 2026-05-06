import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SuspendedUserBlockGuard } from './suspended-user-block.guard';

const makeContext = (user: any, isPublic = false, allowSuspended = false) =>
  ({
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  }) as any;

describe('SuspendedUserBlockGuard', () => {
  let guard: SuspendedUserBlockGuard;
  let reflector: jest.Mocked<Reflector>;

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() } as any;
    guard = new SuspendedUserBlockGuard(reflector);
  });

  it('returns true for public routes', () => {
    reflector.getAllAndOverride
      .mockReturnValueOnce(true)   // IS_PUBLIC_KEY
      .mockReturnValueOnce(false); // ALLOW_SUSPENDED_USER_KEY
    expect(guard.canActivate(makeContext({ isSuspended: true }))).toBe(true);
  });

  it('returns true when @AllowSuspendedUser() is set', () => {
    reflector.getAllAndOverride
      .mockReturnValueOnce(false) // IS_PUBLIC_KEY
      .mockReturnValueOnce(true); // ALLOW_SUSPENDED_USER_KEY
    expect(guard.canActivate(makeContext({ isSuspended: true }))).toBe(true);
  });

  it('returns true when no user is attached', () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    expect(guard.canActivate(makeContext(undefined))).toBe(true);
  });

  it('throws ForbiddenException for suspended users', () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    expect(() => guard.canActivate(makeContext({ isSuspended: true }))).toThrow(
      new ForbiddenException('Account suspended'),
    );
  });

  it('returns true for active users', () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    expect(guard.canActivate(makeContext({ isSuspended: false }))).toBe(true);
  });
});
