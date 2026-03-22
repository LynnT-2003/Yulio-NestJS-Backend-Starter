import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// Handles LINE OAuth callback after user approves
// LINE redirects to /auth/line/callback with authorization code
// passport-oauth2 exchanges code for token, calls line.strategy.ts validate()
// Attaches IAuthResponse to req.user for the controller to return
@Injectable()
export class LineCallbackGuard extends AuthGuard('line') { }