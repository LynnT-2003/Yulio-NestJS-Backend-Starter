import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// Triggers local.strategy.ts validate(email, password)
// Reads email+password from req.body and calls AuthService.validateLocalUser()
// Attaches the returned user to req.user on success
@Injectable()
export class LocalGuard extends AuthGuard('local') { }