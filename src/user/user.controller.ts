import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';

import { UserService } from './user.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ICurrentUser, IUserPublic } from '../common/interfaces/user.interface';
import { UserRole } from '../common/enums/user-role.enum';

const USER_EXAMPLE = {
  _id: '665a1b2c3d4e5f6a7b8c9d0e',
  email: 'john@example.com',
  displayName: 'John Doe',
  avatar: null,
  role: 'user',
  isEmailVerified: false,
  providers: [],
  createdAt: '2026-03-22T00:00:00.000Z',
  updatedAt: '2026-03-22T00:00:00.000Z',
};

@ApiTags('Users')
@ApiBearerAuth('JWT-auth')
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) { }

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User profile', schema: { example: USER_EXAMPLE } })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getMe(@CurrentUser() user: ICurrentUser): Promise<IUserPublic> {
    return this.userService.findById(user.userId).then((doc) => {
      if (!doc) throw new Error('User not found');
      return this.userService.toPublic(doc);
    });
  }

  @Patch('me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiBody({ type: UpdateUserDto })
  @ApiResponse({
    status: 200,
    description: 'Profile updated',
    schema: { example: { ...USER_EXAMPLE, displayName: 'Jane Doe' } },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  updateMe(
    @CurrentUser() user: ICurrentUser,
    @Body() dto: UpdateUserDto,
  ): Promise<IUserPublic> {
    return this.userService.updateUser(user.userId, dto);
  }

  @Delete('me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete current user account' })
  @ApiResponse({
    status: 200,
    description: 'Account deleted',
    schema: { example: { message: 'Account deleted successfully' } },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async deleteMe(@CurrentUser() user: ICurrentUser): Promise<{ message: string }> {
    await this.userService.removeAllRefreshTokens(user.userId);
    return { message: 'Account deleted successfully' };
  }

  @Get('admin')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin-only: get current admin profile' })
  @ApiResponse({
    status: 200,
    description: 'Admin profile',
    schema: { example: { ...USER_EXAMPLE, role: 'admin' } },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — admin role required' })
  adminOnly(@CurrentUser() user: ICurrentUser): Promise<IUserPublic> {
    return this.userService.findById(user.userId).then((doc) => {
      if (!doc) throw new Error('User not found');
      return this.userService.toPublic(doc);
    });
  }
}
