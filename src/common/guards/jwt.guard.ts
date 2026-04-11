import {
  ExecutionContext,
  HttpException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    // Check if route is marked @Public() — skip JWT check if so
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) return true;

    return super.canActivate(context);
  }

  /**
   * Maps passport-jwt outcomes to stable `message` strings for the client
   * (no extra JSON fields). `jwt expired` lets the SPA refresh; other JWT
   * failures use `invalid access token`. Explicit `HttpException` from
   * `JwtStrategy.validate()` (e.g. user deleted) is rethrown unchanged.
   */
  override handleRequest<TUser>(
    err: unknown,
    user: TUser,
    info: unknown,
    _context: ExecutionContext,
    _status?: unknown,
  ): TUser {
    if (this.isTokenExpiredError(info) || this.isTokenExpiredError(err)) {
      throw new UnauthorizedException('jwt expired');
    }

    if (err) {
      if (err instanceof HttpException) {
        throw err;
      }
      throw new UnauthorizedException('invalid access token');
    }

    if (!user) {
      throw new UnauthorizedException('invalid access token');
    }

    return user;
  }

  private isTokenExpiredError(source: unknown): boolean {
    return (
      !!source &&
      typeof source === 'object' &&
      'name' in source &&
      (source as { name: string }).name === 'TokenExpiredError'
    );
  }
}