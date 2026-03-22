import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// Triggers the Google OAuth2 redirect
// Hit GET /auth/google → redirects user to Google consent screen
@Injectable()
export class GoogleGuard extends AuthGuard('google') { }