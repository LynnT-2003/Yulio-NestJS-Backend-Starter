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
import { GithubStrategy } from './strategies/github.strategy';
import { GithubGuard } from './guards/github.guard';
import { GithubCallbackGuard } from './guards/github-callback.guard';
import { DiscordStrategy } from './strategies/discord.strategy';
import { DiscordGuard } from './guards/discord.guard';
import { DiscordCallbackGuard } from './guards/discord-callback.guard';
import { MicrosoftStrategy } from './strategies/microsoft.strategy';
import { MicrosoftGuard } from './guards/microsoft.guard';
import { MicrosoftCallbackGuard } from './guards/microsoft-callback.guard';

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
    GithubStrategy,
    GithubGuard,
    GithubCallbackGuard,
    DiscordStrategy,
    DiscordGuard,
    DiscordCallbackGuard,
    MicrosoftStrategy,
    MicrosoftGuard,
    MicrosoftCallbackGuard,
  ],
  exports: [AuthService],
})
export class AuthModule { }