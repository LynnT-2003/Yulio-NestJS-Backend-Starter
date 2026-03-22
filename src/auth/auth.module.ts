import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { UserModule } from '../user/user.module';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { LocalStrategy } from './strategies/local.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { JwtStrategy } from '../common/strategies/jwt.strategy';
import { LocalGuard } from './guards/local.guard';
import { GoogleGuard } from './guards/google.guard';
import { GoogleCallbackGuard } from './guards/google-callback.guard';
import { LineStrategy } from './strategies/line.strategy';
import { LineGuard } from './guards/line.guard';
import { LineCallbackGuard } from './guards/line-callback.guard';

@Module({
  imports: [
    UserModule,       // gives AuthModule access to UserService
    PassportModule,
    JwtModule,        // intentionally no global config here — secrets passed per signAsync call
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    LocalStrategy,
    GoogleStrategy,
    JwtStrategy,
    LocalGuard,
    GoogleGuard,
    GoogleCallbackGuard,
    LineStrategy,
    LineGuard,
    LineCallbackGuard,
  ],
  exports: [AuthService],
})
export class AuthModule { }