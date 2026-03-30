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
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiExtraModels } from '@nestjs/swagger';

import { AuthService } from './auth.service';
import { RegisterDto } from './dto/request/register.dto';
import { LoginDto } from './dto/request/login.dto';
import { RefreshTokenDto } from './dto/request/refresh-token.dto';
import { AuthResponseDto, AuthTokensDto, EmailResponseDto, UserPublicDto } from './dto/response';
import { ApiSuccessResponse, ApiErrorResponse } from '../common/helpers/swagger.helper';
import { LocalGuard } from './guards/local/local.guard';
import { GoogleGuard } from './guards/google/google.guard';
import { GoogleCallbackGuard } from './guards/google/google-callback.guard';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ICurrentUser } from '../common/interfaces/user.interface';
import { IAuthResponse } from '../common/interfaces/auth.interface';
import { UserDocument } from '../user/entity/user.entity';
import { LineGuard } from './guards/line/line.guard';
import { LineCallbackGuard } from './guards/line/line-callback.guard';
import { GithubGuard } from './guards/github/github.guard';
import { GithubCallbackGuard } from './guards/github/github-callback.guard';
import { DiscordGuard } from './guards/discord/discord.guard';
import { DiscordCallbackGuard } from './guards/discord/discord-callback.guard';
import { MicrosoftGuard } from './guards/microsoft/microsoft.guard';
import { MicrosoftCallbackGuard } from './guards/microsoft/microsoft-callback.guard';
import { Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UserService } from '../user/user.service';

@ApiExtraModels(AuthResponseDto, AuthTokensDto, EmailResponseDto, UserPublicDto)
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService, private readonly userService: UserService) { }

  @Public()
  @ApiTags('Auth - Local')
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new user with email and password' })
  @ApiBody({ type: RegisterDto })
  @ApiResponse(ApiSuccessResponse(AuthResponseDto, 201))
  @ApiResponse(ApiErrorResponse(409, 'Email already registered'))
  register(@Body() dto: RegisterDto): Promise<IAuthResponse> {
    return this.authService.register(dto);
  }

  @Public()
  @ApiTags('Auth - Local')
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(LocalGuard)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiBody({ type: LoginDto })
  @ApiResponse(ApiSuccessResponse(AuthResponseDto))
  @ApiResponse(ApiErrorResponse(401, 'Invalid email or password'))
  login(@Req() req: { user: UserDocument }): Promise<IAuthResponse> {
    return this.authService.login(req.user);
  }

  @Public()
  @ApiTags('Auth - Local')
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access and refresh tokens' })
  @ApiBody({ type: RefreshTokenDto })
  @ApiResponse(ApiSuccessResponse(AuthTokensDto))
  @ApiResponse(ApiErrorResponse(401, 'Invalid or expired refresh token'))
  refresh(@Body() dto: RefreshTokenDto): Promise<any> {
    return this.authService.refreshTokens(dto.userId, dto.refreshToken);
  }

  @ApiTags('Auth - Local')
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout and invalidate refresh token' })
  @ApiBody({ type: RefreshTokenDto })
  @ApiResponse({ status: 200, description: 'Logged out successfully (empty response body)' })
  @ApiResponse(ApiErrorResponse(401, 'Unauthorized'))
  logout(
    @Body() dto: RefreshTokenDto,
    @CurrentUser() user: ICurrentUser,
  ): Promise<void> {
    return this.authService.logout(user.userId, dto.refreshToken);
  }

  @Public()
  @ApiTags('Auth - Local')
  @Get('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify email address via token from email link' })
  @ApiResponse({ status: 302, description: 'Redirects to VERIFY_REDIRECT_URL (when configured)' })
  @ApiResponse(ApiSuccessResponse(EmailResponseDto))
  @ApiResponse(ApiErrorResponse(400, 'Token is required'))
  @ApiResponse(ApiErrorResponse(400, 'Invalid or expired verification token'))
  async verifyEmail(
    @Query('token') token: string,
    @Res() res: Response,
  ): Promise<void> {
    if (!token) {
      throw new BadRequestException('Token is required');
    }

    const { redirectUrl } = await this.authService.verifyEmail(token);

    if (redirectUrl) {
      res.redirect(redirectUrl);
    } else {
      res.status(HttpStatus.OK).json({
        success: true,
        statusCode: 200,
        data: { message: 'Email verified successfully' },
        timestamp: new Date().toISOString(),
      });
    }
  }

  @ApiTags('Auth - Local')
  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend verification email' })
  @ApiResponse({ status: 200, description: 'Verification email sent' })
  async resendVerification(
    @CurrentUser() user: ICurrentUser,
  ): Promise<{ message: string }> {
    const userDoc = await this.userService.findById(user.userId);

    if (!userDoc) throw new NotFoundException('User not found');
    if (userDoc.isEmailVerified) throw new BadRequestException('Email already verified');

    await this.authService.sendVerificationEmail(userDoc);

    return { message: 'Verification email sent' };
  }

  @Public()
  @ApiTags('Auth - Google')
  @Get('google')
  @UseGuards(GoogleGuard)
  @ApiOperation({ summary: 'Initiate Google OAuth login (redirects to Google)' })
  @ApiResponse({ status: 302, description: 'Redirects to Google consent screen' })
  googleAuth() { }

  @Public()
  @ApiTags('Auth - Google')
  @Get('google/callback')
  @UseGuards(GoogleCallbackGuard)
  @ApiOperation({ summary: 'Google OAuth callback (handled by Passport)' })
  @ApiResponse(ApiSuccessResponse(AuthResponseDto))
  @ApiResponse(ApiErrorResponse(401, 'OAuth error or invalid authorization code'))
  googleCallback(@Req() req: { user: IAuthResponse }): IAuthResponse {
    return req.user;
  }

  @Public()
  @ApiTags('Auth - Line')
  @Get('line')
  @UseGuards(LineGuard)
  @HttpCode(HttpStatus.FOUND)
  @ApiOperation({ summary: 'Initiate LINE Login (redirects to LINE consent screen)' })
  @ApiResponse({ status: 302, description: 'Redirects to LINE OAuth authorization' })
  lineAuth(): void {
    // LineGuard handles the redirect to LINE consent screen
    // this handler body never executes
  }

  @Public()
  @ApiTags('Auth - Line')
  @Get('line/callback')
  @UseGuards(LineCallbackGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'LINE OAuth callback (Passport exchanges code, issues JWTs)' })
  @ApiResponse(ApiSuccessResponse(AuthResponseDto))
  @ApiResponse(ApiErrorResponse(401, 'Invalid code, or email required but not available (strict mode)'))
  lineCallback(@Req() req: { user: IAuthResponse }): IAuthResponse {
    // LineCallbackGuard runs LineStrategy.validate()
    // which calls findOrCreateOAuthUser + oauthLogin
    // and attaches the full IAuthResponse to req.user
    return req.user;
  }

  @Public()
  @ApiTags('Auth - Github')
  @Get('github')
  @UseGuards(GithubGuard)
  @HttpCode(HttpStatus.FOUND)
  @ApiOperation({ summary: 'Initiate GitHub OAuth (redirects to GitHub)' })
  @ApiResponse({ status: 302, description: 'Redirects to GitHub authorization' })
  githubAuth(): void { }

  @Public()
  @ApiTags('Auth - Github')
  @Get('github/callback')
  @UseGuards(GithubCallbackGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'GitHub OAuth callback (Passport exchanges code, issues JWTs)' })
  @ApiResponse(ApiSuccessResponse(AuthResponseDto))
  @ApiResponse(ApiErrorResponse(401, 'OAuth error or invalid authorization code'))
  githubCallback(@Req() req: { user: IAuthResponse }): IAuthResponse {
    return req.user;
  }

  @Public()
  @ApiTags('Auth - Discord')
  @Get('discord')
  @UseGuards(DiscordGuard)
  @HttpCode(HttpStatus.FOUND)
  @ApiOperation({ summary: 'Initiate Discord OAuth (redirects to Discord)' })
  @ApiResponse({ status: 302, description: 'Redirects to Discord authorization' })
  discordAuth(): void { }

  @Public()
  @ApiTags('Auth - Discord')
  @Get('discord/callback')
  @UseGuards(DiscordCallbackGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Discord OAuth callback (Passport exchanges code, issues JWTs)' })
  @ApiResponse(ApiSuccessResponse(AuthResponseDto))
  @ApiResponse(ApiErrorResponse(401, 'OAuth error or invalid authorization code'))
  discordCallback(@Req() req: { user: IAuthResponse }): IAuthResponse {
    return req.user;
  }

  @Public()
  @ApiTags('Auth - Microsoft')
  @Get('microsoft')
  @UseGuards(MicrosoftGuard)
  @HttpCode(HttpStatus.FOUND)
  @ApiOperation({ summary: 'Initiate Microsoft (Entra ID) OAuth (redirects to Microsoft login)' })
  @ApiResponse({ status: 302, description: 'Redirects to Microsoft authorization' })
  microsoftAuth(): void { }

  @Public()
  @ApiTags('Auth - Microsoft')
  @Get('microsoft/callback')
  @UseGuards(MicrosoftCallbackGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Microsoft OAuth callback (Passport exchanges code, issues JWTs)' })
  @ApiResponse(ApiSuccessResponse(AuthResponseDto))
  @ApiResponse(ApiErrorResponse(401, 'OAuth error or invalid authorization code'))
  microsoftCallback(@Req() req: { user: IAuthResponse }): IAuthResponse {
    return req.user;
  }
}
