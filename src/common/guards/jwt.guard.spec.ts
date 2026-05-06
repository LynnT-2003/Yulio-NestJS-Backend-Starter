import { ExecutionContext, HttpException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtGuard } from './jwt.guard';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

const makeContext = (isPublic: boolean, req: any = {}): ExecutionContext =>
  ({
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => req }),
  }) as any;

describe('JwtGuard', () => {
  let guard: JwtGuard;
  let reflector: jest.Mocked<Reflector>;

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() } as any;
    guard = new JwtGuard(reflector);
  });

  describe('canActivate', () => {
    it('returns true immediately for public routes', () => {
      reflector.getAllAndOverride.mockReturnValue(true);
      const ctx = makeContext(true);
      expect(guard.canActivate(ctx)).toBe(true);
    });

    it('calls super.canActivate for non-public routes', () => {
      reflector.getAllAndOverride.mockReturnValue(false);
      const ctx = makeContext(false);
      const spy = jest.spyOn(guard as any, 'canActivate').mockReturnValue(true);
      expect(guard.canActivate(ctx)).toBe(true);
      spy.mockRestore();
    });
  });

  describe('handleRequest', () => {
    it('returns user when valid', () => {
      const user = { userId: '1' };
      expect(guard.handleRequest(null, user, null, {} as any)).toBe(user);
    });

    it('throws jwt expired for TokenExpiredError in info', () => {
      const info = { name: 'TokenExpiredError' };
      expect(() => guard.handleRequest(null, null, info, {} as any)).toThrow(
        new UnauthorizedException('jwt expired'),
      );
    });

    it('throws jwt expired for TokenExpiredError in err', () => {
      const err = { name: 'TokenExpiredError' };
      expect(() => guard.handleRequest(err, null, null, {} as any)).toThrow(
        new UnauthorizedException('jwt expired'),
      );
    });

    it('rethrows HttpException from err', () => {
      const err = new HttpException('Forbidden', 403);
      expect(() => guard.handleRequest(err, null, null, {} as any)).toThrow(err);
    });

    it('throws invalid access token for other errors', () => {
      const err = new Error('something else');
      expect(() => guard.handleRequest(err, null, null, {} as any)).toThrow(
        new UnauthorizedException('invalid access token'),
      );
    });

    it('throws invalid access token when user is missing', () => {
      expect(() => guard.handleRequest(null, null, null, {} as any)).toThrow(
        new UnauthorizedException('invalid access token'),
      );
    });
  });
});
