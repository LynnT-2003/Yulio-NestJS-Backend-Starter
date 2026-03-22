import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';

import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { LocalGuard } from './guards/local.guard';
import { GoogleGuard } from './guards/google.guard';
import { GoogleCallbackGuard } from './guards/google-callback.guard';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ICurrentUser } from '../common/interfaces/user.interface';
import { IAuthResponse } from '../common/interfaces/auth.interface';
import { UserDocument } from '../user/entity/user.entity';
import { LoginDto } from './dto/login.dto';
import { LineGuard } from './guards/line.guard';
import { LineCallbackGuard } from './guards/line-callback.guard';
import { GithubGuard } from './guards/github.guard';
import { GithubCallbackGuard } from './guards/github-callback.guard';
import { DiscordGuard } from './guards/discord.guard';
import { DiscordCallbackGuard } from './guards/discord-callback.guard';
import { MicrosoftGuard } from './guards/microsoft.guard';
import { MicrosoftCallbackGuard } from './guards/microsoft-callback.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new user with email and password' })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({
    status: 201,
    description: 'User registered successfully',
    schema: {
      example: {
        user: {
          _id: '665a1b2c3d4e5f6a7b8c9d0e',
          email: 'john@example.com',
          displayName: 'John Doe',
          avatar: null,
          role: 'user',
          isEmailVerified: false,
          providers: [],
          createdAt: '2026-03-22T00:00:00.000Z',
          updatedAt: '2026-03-22T00:00:00.000Z',
        },
        tokens: {
          accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        },
      },
    },
  })
  @ApiResponse({ status: 409, description: 'Email already registered' })
  register(@Body() dto: RegisterDto): Promise<IAuthResponse> {
    return this.authService.register(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(LocalGuard)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    schema: {
      example: {
        user: {
          _id: '665a1b2c3d4e5f6a7b8c9d0e',
          email: 'john@example.com',
          displayName: 'John Doe',
          avatar: null,
          role: 'user',
          isEmailVerified: false,
          providers: [],
          createdAt: '2026-03-22T00:00:00.000Z',
          updatedAt: '2026-03-22T00:00:00.000Z',
        },
        tokens: {
          accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  login(@Req() req: { user: UserDocument }): Promise<IAuthResponse> {
    return this.authService.login(req.user);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access and refresh tokens' })
  @ApiBody({ type: RefreshTokenDto })
  @ApiResponse({
    status: 200,
    description: 'Tokens refreshed',
    schema: {
      example: {
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  refresh(@Body() dto: RefreshTokenDto): Promise<any> {
    return this.authService.refreshTokens(dto.userId, dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout and invalidate refresh token' })
  @ApiBody({ type: RefreshTokenDto })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  logout(
    @Body() dto: RefreshTokenDto,
    @CurrentUser() user: ICurrentUser,
  ): Promise<void> {
    return this.authService.logout(user.userId, dto.refreshToken);
  }

  @Public()
  @Get('google')
  @UseGuards(GoogleGuard)
  @ApiOperation({ summary: 'Initiate Google OAuth login (redirects to Google)' })
  @ApiResponse({ status: 302, description: 'Redirects to Google consent screen' })
  googleAuth() { }

  @Public()
  @Get('google/callback')
  @UseGuards(GoogleCallbackGuard)
  @ApiOperation({ summary: 'Google OAuth callback (handled by Passport)' })
  @ApiResponse({
    status: 200,
    description: 'Google login successful',
    schema: {
      example: {
        user: {
          _id: '665a1b2c3d4e5f6a7b8c9d0e',
          email: 'john@gmail.com',
          displayName: 'John Doe',
          avatar: 'https://lh3.googleusercontent.com/...',
          role: 'user',
          isEmailVerified: true,
          providers: [{ provider: 'google' }],
          createdAt: '2026-03-22T00:00:00.000Z',
          updatedAt: '2026-03-22T00:00:00.000Z',
        },
        tokens: {
          accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        },
      },
    },
  })
  googleCallback(@Req() req: { user: IAuthResponse }): IAuthResponse {
    return req.user;
  }

  @Public()
  @Get('line')
  @UseGuards(LineGuard)
  @HttpCode(HttpStatus.FOUND)
  lineAuth(): void {
    // LineGuard handles the redirect to LINE consent screen
    // this handler body never executes
  }

  @Public()
  @Get('line/callback')
  @UseGuards(LineCallbackGuard)
  @HttpCode(HttpStatus.OK)
  lineCallback(@Req() req: { user: IAuthResponse }): IAuthResponse {
    // LineCallbackGuard runs LineStrategy.validate()
    // which calls findOrCreateOAuthUser + oauthLogin
    // and attaches the full IAuthResponse to req.user
    return req.user;
  }

  @Public()
  @Get('github')
  @UseGuards(GithubGuard)
  @HttpCode(HttpStatus.FOUND)
  githubAuth(): void { }

  @Public()
  @Get('github/callback')
  @UseGuards(GithubCallbackGuard)
  @HttpCode(HttpStatus.OK)
  githubCallback(@Req() req: { user: IAuthResponse }): IAuthResponse {
    return req.user;
  }

  @Public()
  @Get('discord')
  @UseGuards(DiscordGuard)
  @HttpCode(HttpStatus.FOUND)
  discordAuth(): void { }

  @Public()
  @Get('discord/callback')
  @UseGuards(DiscordCallbackGuard)
  @HttpCode(HttpStatus.OK)
  discordCallback(@Req() req: { user: IAuthResponse }): IAuthResponse {
    return req.user;
  }

  @Public()
  @Get('microsoft')
  @UseGuards(MicrosoftGuard)
  @HttpCode(HttpStatus.FOUND)
  microsoftAuth(): void { }

  @Public()
  @Get('microsoft/callback')
  @UseGuards(MicrosoftCallbackGuard)
  @HttpCode(HttpStatus.OK)
  microsoftCallback(@Req() req: { user: IAuthResponse }): IAuthResponse {
    return req.user;
  }
}
