import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ALLOW_SUSPENDED_USER_KEY } from '../decorators/allow-suspended-user.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { ICurrentUser } from '../interfaces/user.interface';

/**
 * Runs after {@link JwtGuard}. By default, **suspended** users receive **403 Forbidden**
 * with `message: "Account suspended"`. Mark handlers with {@link AllowSuspendedUser} to
 * exempt (logout, read own profile, etc.).
 */
@Injectable()
export class SuspendedUserBlockGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const allowSuspended = this.reflector.getAllAndOverride<boolean>(
      ALLOW_SUSPENDED_USER_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (allowSuspended) return true;

    const request = context.switchToHttp().getRequest<{ user?: ICurrentUser }>();
    const user = request.user;
    if (!user) return true;

    if (user.isSuspended) {
      throw new ForbiddenException('Account suspended');
    }

    return true;
  }
}
