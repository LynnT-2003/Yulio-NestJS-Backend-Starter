import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// Triggers LINE OAuth redirect
// Hit GET /auth/line → redirects user to LINE consent screen
@Injectable()
export class LineGuard extends AuthGuard('line') { }