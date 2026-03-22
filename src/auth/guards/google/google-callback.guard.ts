import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// Handles the Google OAuth2 callback after user approves consent
// Hit GET /auth/google/callback → Google redirects here with code
// Passport exchanges code for profile, calls google.strategy.ts validate()
// Attaches the IAuthResponse to req.user for the controller to return
@Injectable()
export class GoogleCallbackGuard extends AuthGuard('google') { }